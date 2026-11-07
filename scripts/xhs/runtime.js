// 小红书小工具版的运行时（scripts/build_xhs.mjs 打包进 app.js 的最前面）。
// 小工具是离线的单页：只能有一个 index.html，不能联网（包括 fetch 包里自己的文件），不能下载文件、不能开外链，
// localStorage 不保证能用，内核最低是 Chrome 61。原型的页面脚本不改，打包时把它们用到的几个全局名字换成这里的替身：
//   location → __MM.loc（跳转改成在页面里换内容）
//   fetch → __MM.getData（数据随包放在 data.js 里）
//   localStorage、sessionStorage → __MM.ls、__MM.ss（存进小工具的 Storage，低版本退回 localStorage）
// 这个文件自己只用 window.xxx 访问浏览器的原物，不受上面的替换影响。只写 ES2017。
import { saveReceipt, saveList } from "./snapshot.js";

/* ---------- Chrome 61 缺的几个 API（原型里实际用到的） ---------- */
function def(obj, name, fn) {
  if (!obj[name]) Object.defineProperty(obj, name, { value: fn, configurable: true, writable: true });
}
def(Array.prototype, "flat", function flat(depth) {
  const d = depth === undefined ? 1 : Number(depth);
  return this.reduce((out, x) => out.concat(Array.isArray(x) && d > 0 ? x.flat(d - 1) : [x]), []);
});
def(Array.prototype, "flatMap", function flatMap(fn, self) {
  return this.map(fn, self).reduce((out, x) => out.concat(Array.isArray(x) ? x : [x]), []);
});
def(Array.prototype, "at", function at(i) {
  const n = Math.trunc(i) || 0;
  return this[n < 0 ? this.length + n : n];
});
def(String.prototype, "at", function at(i) {
  const n = Math.trunc(i) || 0;
  return this[n < 0 ? this.length + n : n];
});
def(String.prototype, "trimStart", String.prototype.trimLeft);
def(String.prototype, "trimEnd", String.prototype.trimRight);
def(String.prototype, "replaceAll", function replaceAll(a, b) {
  if (a instanceof RegExp) return this.replace(a, b);
  return this.split(String(a)).join(typeof b === "function" ? b(String(a)) : String(b));
});
def(Object, "fromEntries", function fromEntries(it) {
  const o = {};
  for (const [k, v] of it) o[k] = v;
  return o;
});
if (window.Element) {
  def(Element.prototype, "replaceChildren", function replaceChildren() {
    while (this.firstChild) this.removeChild(this.firstChild);
    for (let i = 0; i < arguments.length; i++) {
      const n = arguments[i];
      this.appendChild(typeof n === "string" ? document.createTextNode(n) : n);
    }
  });
}
// Animation.finished 是 Chrome 84 才有的；原型只用它等动画结束
if (window.Animation && !("finished" in Animation.prototype)) {
  Object.defineProperty(Animation.prototype, "finished", {
    configurable: true,
    get() {
      if (!this.__done) {
        this.__done = new Promise((resolve) => {
          if (this.playState === "finished") return resolve(this);
          this.addEventListener("finish", () => resolve(this));
          this.addEventListener("cancel", () => resolve(this));
        });
      }
      return this.__done;
    },
  });
}

/* ---------- 小工具接口 ---------- */
const tool = () => window.xhs && window.xhs.miniTool;
// buildVersion 的末三位是编译序号：9462004 → 9462，代表 9.46.2
async function clientVersion() {
  const read = (o) => Math.floor((Number(o && o.miniToolEnv && o.miniToolEnv.buildVersion) || 0) / 1000);
  const v = read(window.xhs && window.xhs.launchOptions);
  if (v) return v;
  const t = tool();
  if (!t || typeof t.getLaunchOptions !== "function") return 0;
  try { return read(await t.getLaunchOptions()); } catch (e) { return 0; }
}

/* ---------- 存储 ---------- */
// 页面同步读写，所以启动时一次读进内存；写的时候合并成一次，异步存进小工具的 Storage（9.46 起，整份 JSON 存在一个键里）。
// 低版本或读不到时退回 localStorage；都不行就只在这次打开期间有效。
const STORE_KEY = "memmatch";
let mem = {};
let useTool = false;
let flushing = null;
async function loadStore() {
  const t = tool();
  if ((await clientVersion()) >= 9460 && t && typeof t.getStorage === "function" && typeof t.setStorage === "function") {
    try {
      const r = await t.getStorage({ key: STORE_KEY });
      mem = (r && r.data && JSON.parse(r.data)) || {};
      useTool = true;
      return;
    } catch (e) { /* 退回浏览器存储 */ }
  }
  try { mem = JSON.parse(window.localStorage.getItem(STORE_KEY)) || {}; } catch (e) { mem = {}; }
}
function flush() {
  if (flushing) return;
  flushing = Promise.resolve().then(async () => {
    flushing = null;
    const data = JSON.stringify(mem);
    if (useTool) {
      try { await tool().setStorage({ key: STORE_KEY, data }); return; } catch (e) { /* 再试浏览器存储 */ }
    }
    try { window.localStorage.setItem(STORE_KEY, data); } catch (e) { /* 存不下就算了，页面照常用 */ }
  });
}
function storage(map, persist) {
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(map(), k) ? map()[k] : null),
    setItem: (k, v) => { map()[k] = String(v); if (persist) flush(); },
    removeItem: (k) => { delete map()[k]; if (persist) flush(); },
  };
}
const session = {};

/* ---------- 数据 ---------- */
// 原型 fetch 的是 ../data/questionnaire/questions.json 这类地址，按文件名对上 data.js 里的数据
function getData(url) {
  const name = String(url).split(/[?#]/)[0].split("/").pop();
  const text = window.__MM_DATA && window.__MM_DATA[name];
  if (text === undefined) return Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new Error(name)) });
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(text)) });
}

/* ---------- 页面切换 ---------- */
// 原型是三个页面（receipt.html 首页加答题、result.html 结果、catalog.html 项目清单），这里在同一个页面里换内容。
// 页面往 window、document 上挂的监听，换页时撤掉，免得旧页面的处理函数还在响应
const BASE = "http://memmatch.local/prototype/";
let pages = {};
let cur = new URL("receipt.html", BASE);
let gen = 0;
const listeners = [];
for (const target of [window, document]) {
  const add = target.addEventListener, remove = target.removeEventListener;
  target.addEventListener = function (type, fn, opt) {
    if (gen) listeners.push({ target, type, fn, opt, gen });
    return add.call(this, type, fn, opt);
  };
  target.__remove = remove;
}
function pageOf(u) {
  const f = u.pathname.split("/").pop();
  return f === "result.html" ? "result" : f === "catalog.html" ? "catalog" : "receipt";
}
function go(href) {
  cur = new URL(String(href), cur);
  for (let i = listeners.length - 1; i >= 0; i--) {
    const l = listeners[i];
    if (l.gen === gen) { l.target.__remove.call(l.target, l.type, l.fn, l.opt); listeners.splice(i, 1); }
  }
  gen += 1;
  const p = pages[pageOf(cur)];
  document.getElementById("page-style").textContent = p.css;
  document.title = p.title;
  document.body.innerHTML = p.html;
  window.scrollTo(0, 0);
  Promise.resolve().then(() => p.run()).catch((e) => console.error(e));
}
const loc = {
  get href() { return cur.href; },
  set href(v) { setTimeout(() => go(v)); },
  get search() { return cur.search; },
  get hash() { return cur.hash; },
  get pathname() { return cur.pathname; },
  assign(v) { setTimeout(() => go(v)); },
  replace(v) { setTimeout(() => go(v)); },
  reload() { setTimeout(() => go(cur.href)); },
};

/* ---------- 链接 ---------- */
// 页内链接换页；外链小工具打不开：收银员的小红书主页改成“关注作者”（9.51 起），其余告诉访客地址。
// 挂在 window 上、冒泡阶段：页面自己处理过的点击（比如“完整结果”要先收纸）已经 preventDefault，这里不再管
const CASHIER = "xhslink.cn";
async function follow() {
  const t = tool();
  if ((await clientVersion()) >= 9510 && t && typeof t.followAuthor === "function") {
    try { await t.followAuthor(); return; } catch (e) { /* 用户关掉了弹窗，或者今天弹得太多 */ return; }
  }
  window.alert("在小红书搜索“凉拌笨蕉皮”就能找到收银员。");
}
let saving = false;
window.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button) return;
  // 结果页“保存小票图片”（打包时加进页脚，见 build_xhs.mjs 的 PATCHES）
  if (e.target.closest && e.target.closest("#saveImage")) {
    const paper = document.querySelector(".paper");
    if (!paper || saving) return;
    saving = true;
    saveReceipt(paper).catch((err) => { console.error(err); window.alert("没能生成小票图片。"); }).then(() => { saving = false; });
    return;
  }
  const a = e.target.closest && e.target.closest("a[href]");
  if (!a) return;
  const href = a.getAttribute("href");
  if (/^#/.test(href)) return;
  e.preventDefault();
  if (!/^https?:/i.test(href)) return go(href);
  if (href.indexOf(CASHIER) >= 0) return follow();
  window.alert("小工具里打不开外部网页，可以在浏览器里访问：\n" + href);
});

/* ---------- 让开小工具外壳的按钮 ---------- */
// 全屏打开时，左上角的返回键和右上角的“···”盖在页面上，会挡住出票口（负责人 2026-11-06 要求往下挪）。
// 出票口、槽口阴影、纸的位置都跟着 --dock-pad（原来 12px）算，把它加到按钮底边再往下 6px。
// getWindowInfo 是 9.49 起才有的；低版本在小红书里时按安全区再加 36px 估一个
const DOCK_PAD = 12;
async function avoidHostButtons() {
  const t = tool();
  if (!t) return;
  const root = document.documentElement.style;
  if (typeof t.getWindowInfo !== "function") {
    root.setProperty("--dock-pad", `calc(${DOCK_PAD}px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 36px)`);
    return;
  }
  try {
    const info = await Promise.race([t.getWindowInfo(), new Promise((r) => setTimeout(() => r(null), 1000))]);
    const btns = (info && info.menuButtons) || {};
    let bottom = 0;
    for (const k of Object.keys(btns)) {
      const b = btns[k];
      if (!b) continue;
      const y = b.bottom != null ? Number(b.bottom) : Number(b.top) + Number(b.height);
      if (y > bottom) bottom = y;
    }
    if (bottom > 0) root.setProperty("--dock-pad", `${Math.max(DOCK_PAD, Math.ceil(bottom) + 6)}px`);
  } catch (e) { /* 读不到就保持原样 */ }
}
window.addEventListener("resize", () => { avoidHostButtons(); });

window.__MM = {
  loc,
  ls: storage(() => mem, true),
  ss: storage(() => session, false),
  getData,
  saveList,
  async start(defs) {
    pages = defs;
    await Promise.all([loadStore(), avoidHostButtons()]);
    go("receipt.html");
  },
};
