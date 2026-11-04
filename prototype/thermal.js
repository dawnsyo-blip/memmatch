// 小票原型共用：字符网格（每行 32 格，汉字两格）、条形码、大标题、题目简称。
// 用格数拼行的函数要等 FONTS 之后再调：字宽按更纱黑体实测（它的“”是半角），字体没加载上时按东亚宽字符估。

// 网址加 ?static：给导出到 Figma 用的静态模式，去掉出票口、锯齿裁切、出纸位移和逐行打印（见 thermal.css 的 .static）
if (new URLSearchParams(location.search).has("static")) document.documentElement.classList.add("static");

// 每行的格数，按字号分三级（thermal.css 的 --fs-h、--fs、--fs-s）
export const W_H = 32;  // 标题
export const W = 36;    // 正文
export const W_S = 44;  // 小字：已答摘要、说明、页眉
export const FONT = '"Sarasa Mono SC"';

let fontOK = false;
export const FONTS = Promise.all([400, 700].map((w) => document.fonts.load(`${w} 16px ${FONT}`)))
  .then(() => { fontOK = document.fonts.check(`16px ${FONT}`); })
  .catch(() => {});

const meas = document.createElement("canvas").getContext("2d");
const widths = new Map();
const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/u;
export function cw(c) {
  let w = widths.get(c);
  if (w === undefined) {
    if (fontOK) { meas.font = `400 100px ${FONT}`; w = Math.max(1, Math.round(meas.measureText(c).width / 50)); }
    else w = WIDE.test(c) ? 2 : 1;
    widths.set(c, w);
  }
  return w;
}
export function cols(s) { let n = 0; for (const c of String(s)) n += cw(c); return n; }

export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const sp = (n) => " ".repeat(Math.max(0, n));
// 粗分隔线用 =，细的用“- ”，都正好一行
export const rule = (c, w = W) => (c === "-" ? "- " : c).repeat(w).slice(0, w);
export function center(s, w = W) {
  const left = Math.floor((w - cols(s)) / 2);
  return sp(left) + s + sp(w - left - cols(s));
}
// 左右两头，中间补空格
export const spread = (l, r, w = W) => l + sp(w - cols(l) - cols(r)) + r;

// 按格数折行：英文单词不拆开，太长的才硬拆
export function wrapCols(s, w = W) {
  const out = [];
  let cur = "";
  for (const tok of String(s).match(/[!-~]+|\s+|[^\s!-~]/gu) || []) {
    if (cols(cur + tok) <= w) { cur += tok; continue; }
    if (cur.trim()) out.push(cur.trimEnd());
    cur = tok.trimStart();
    while (cols(cur) > w) {
      const ch = [...cur];
      let i = 0, n = 0;
      while (n + cw(ch[i]) <= w) n += cw(ch[i++]);
      out.push(ch.slice(0, i).join(""));
      cur = ch.slice(i).join("");
    }
  }
  if (cur.trim()) out.push(cur.trimEnd());
  return out;
}
// 多项的值在顿号、“>”处折行，一项太长才拆开
export function wrapItems(v, w = W) {
  const out = [];
  let cur = "";
  for (const it of String(v).split(/(?<=、)|(?= > )/)) {
    const t = cur ? cur + it : it.trimStart();
    if (cols(t) <= w) { cur = t; continue; }
    if (cur) out.push(cur.trimEnd());
    cur = it.trimStart();
    if (cols(cur) > w) { const parts = wrapCols(cur, w); cur = parts.pop(); out.push(...parts); }
  }
  if (cur) out.push(cur.trimEnd());
  return out;
}
// 标签 ........ 值：每行是 [左边, 值]；一行放不下时值另起，靠右
export function pair(k, v, W = 36) {
  const ks = wrapCols(k, W - 4);
  const last = ks.pop() || "";
  const lines = ks.map((t) => [t, ""]);
  const room = W - cols(last) - cols(v) - 2;
  if (room >= 2) lines.push([`${last} ${".".repeat(room)} `, v]);
  else {
    lines.push([`${last} ${".".repeat(W - cols(last) - 1)}`, ""]);
    for (const p of wrapItems(v, W - 4)) lines.push([sp(W - cols(p)), p]);
  }
  return lines;
}
export const L = (s, cls = "") => `<span class="l${cls ? " " + cls : ""}">${esc(s)}</span>`;
export const pairHTML = (k, v, w) => pair(k, v, w).map(([a, b]) => `<span class="l">${esc(a)}<b>${esc(b)}</b></span>`).join("");
export const pairText = (k, v, w) => pair(k, v, w).map(([a, b]) => a + b);
// “名字 …… 值”：点线用缩小的 .dots、值不加粗；名字太长时先给值留出位置再折行，值总在最后一行的右端；
// bullet（如“- ”）只写在第一行，折行缩进对齐
export function dotsPairHTML(k, v, w = W, bullet = "") {
  const b = cols(bullet), ks = wrapCols(k, w - b - cols(v) - 4), last = ks.pop() || "";
  const lines = ks.map((t) => esc(t));
  lines.push(`${esc(last)} <span class="dots">${".".repeat(Math.max(2, w - b - cols(last) - cols(v) - 2))}</span> ${esc(v)}`);
  return `<div>${lines.map((t, i) => `<span class="l">${i ? sp(b) : esc(bullet)}${t}</span>`).join("")}</div>`;
}

// 随机挑几行，墨色淡 10%
export const FAINT = 0.1;
export function faint(root, sel = ".l, .ln, .opt, .p, .hang") {
  root.querySelectorAll(sel).forEach((el) => { if (Math.random() < FAINT) el.classList.add("faint"); });
}

// ---------- 哈希、随机数、条形码 ----------
export function fnv(str, salt = 0) {
  let h = 0x811c9dc5 ^ salt;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function barcode(seed, n, cls = "") {
  const r = mulberry(seed);
  const seq = [1, 1, 1, 1];
  for (let i = 0; i < n; i++) seq.push(1 + Math.floor(r() * 3), 1 + Math.floor(r() * 3));
  seq.push(1, 1, 1);
  let x = 0, rects = "";
  seq.forEach((w, i) => { if (i % 2 === 0) rects += `<rect x="${x}" width="${w}" height="1"/>`; x += w; });
  return `<svg class="${cls}" viewBox="0 0 ${x} 1" preserveAspectRatio="none" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">${rects}</svg>`;
}
// 同一份答卷得到同一串编号
export const codeOf = (key) => [fnv(key, 1), fnv(key, 2)].map((n) => n.toString(16).toUpperCase().padStart(8, "0")).join("").match(/.{4}/g).join(" ");

// ---------- 日期、配对单编号 ----------
const two = (n) => String(n).padStart(2, "0");
export const pad2 = two;
export function stamp(d = new Date()) {
  const date = `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
  return { date, full: `${date} ${two(d.getHours())}:${two(d.getMinutes())}` };
}
// 每按一次“开始”加 1，存在这台设备上；结果页只读不加
export function serialNo(next = false) {
  let n = 1;
  try {
    n = +localStorage.getItem("receipt-no") || 0;
    if (next || !n) { n += 1; localStorage.setItem("receipt-no", n); }
  } catch (e) {}
  return String(n % 10000).padStart(4, "0");
}

// ---------- 大标题 ----------
// 倍高倍宽的粗体字（负责人 2026-11-03 定：去掉点阵效果）；cls 加在每一行上（如 ink：出纸经过时逐行打印）
export const titleHTML = (lines, cls = "") =>
  `<h1 class="title">${lines.map((t) => `<span class="ln${cls ? " " + cls : ""}">${esc(t)}</span>`).join("")}</h1>`;

// ---------- 问卷 ----------
// 已答条目用的题目简称（问卷配置里没有简称）
export const SHORT = {
  q1: "设备", q3: "使用方式", q3web: "官方网页", q3app: "官方 App", q3desk: "官方桌面版", q3remote: "远程 Agent",
  q3client: "聊天客户端", q3where: "客户端设备", q3mcp: "客户端 MCP", q3cli: "命令行工具", q3bot: "bot 连接方式",
  q3runtime: "Agent 运行时", q3platform: "搭建平台", q3api: "模型接口",
  q4: "共用记忆", q5: "运行位置", q7: "常做的事", q6: "在用的记忆", q8: "遇到的问题", q8n: "担心的问题",
  q9: "保留原件", q10: "录入把关", q11: "谁来记录", q12m: "维护时间", q13: "慢慢淡忘", q14: "等待时间",
  q15p: "系统提示词", q15: "上下文工程", q16: "安装门槛", q18c: "额外费用", q18t: "token 用量", q19: "英文界面", q20: "导出记忆",
};
export const numOf = (q) => String(q.number || q.id.slice(1));
// 条目左边：题号占 3 格，再写简称
export const rowLabel = (q) => numOf(q).padEnd(3) + (SHORT[q.id] || q.text);
export function answerText(q, sel, free = {}) {
  return (sel || []).map((oid) => {
    const o = q.options.find((x) => x.id === oid);
    const f = free[`${q.id}.${oid}`];
    return (o ? o.label : oid) + (f ? `：${f}` : "");
  }).join(q.type === "rank" ? " > " : "、");
}

// ---------- 结果页、项目库共用的小部件 ----------
// 外链箭头，跟在仓库地址后面
export const OUT = `<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 1.5h6.5V8M10.5 1.5 2 10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="square" stroke-linejoin="miter"/></svg>`;
export const P = (t, cls = "p") => `<p class="${cls}">${t}</p>`;
export const hang = (h, t, cls = "") => `<p class="hang${cls ? " " + cls : ""}" style="--h:${h}">${t}</p>`;
// 辅助字号的段落
export const S = (t) => P(t, "p small");
// 嵌在分隔线里的居中标题：“==== 请选择 ====”，两侧的 = 按格数补满一行（奇数格时右边多一个）
export function titledRule(t, c = "=", w = W) {
  const n = w - cols(t) - 2, l = Math.floor(n / 2);
  return c.repeat(l) + ` ${t} ` + c.repeat(n - l);
}
// “名字 ...... 值”一行：中间是缩小的点线（thermal.css 的 .dots），右边的值可以是现成的 HTML（如反白按钮），valCols 是它占的格数
export function dotsRow(left, val, w = W, valCols = cols(val)) {
  return `${left} <span class="dots">${".".repeat(Math.max(2, w - cols(left) - valCols - 2))}</span> ${val}`;
}
// 展开／收起用 [+]／[-]，各占 3 格，跟着 details 的开合换（负责人 2026-11-03 定，不写文字）
export const TOG = `<span class="tog"><span class="when-closed" aria-label="展开">[+]</span><span class="when-open" aria-label="收起">[-]</span></span>`;
// 折叠的一行：左边文字，行尾展开／收起；放不下时折行，按钮跟在最后一行
// 点 [-] 收起时，内容往上压缩；点 [+] 展开时反过来，从标题行往下展开（负责人 2026-11-04 要）。
// 做法：给整个 details 的高度做动画，下面的内容跟着走。只管标题行里带 [+]/[-] 的折叠；系统设了减少动态效果时照常直接开合
if (typeof document !== "undefined") {
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";
  const dur = (px) => Math.min(420, 160 + px * 0.12);
  document.addEventListener("click", (e) => {
    const sum = e.target.closest("summary");
    const d = sum?.parentElement;
    if (!d || d.tagName !== "DETAILS" || !sum.querySelector(".tog") || still.matches) return;
    e.preventDefault();
    if (d.dataset.moving) return;
    d.dataset.moving = "1";
    const closing = d.open, head = sum.offsetHeight;
    if (!closing) d.open = true;
    const full = d.offsetHeight;
    d.style.overflow = "hidden";
    const anim = d.animate(closing ? [{ height: `${full}px` }, { height: `${head}px` }] : [{ height: `${head}px` }, { height: `${full}px` }],
      { duration: dur(full - head), easing: EASE, fill: "forwards" });
    // 停在最后一帧，收起后再撤掉动画，免得收起前闪回原来的高度
    anim.onfinish = () => {
      if (closing) d.open = false;
      d.style.overflow = "";
      delete d.dataset.moving;
      anim.cancel();
    };
  });
}

export function foldLine(text, w = W, cls = "") {
  const lines = wrapCols(text, w - 4);
  const last = lines.pop() || "";
  return lines.map((t) => L(t, cls)).join("") + `<span class="l${cls ? " " + cls : ""}">${esc(last)}${sp(w - cols(last) - 3)}${TOG}</span>`;
}
// 一个部分：粗分隔线，反白的名字，右边展开／收起
export function section(title, body, open = true) {
  return `<section class="sec" aria-label="${esc(title)}">${L(rule("=", W_S), "small")}` +
    `<details${open ? " open" : ""}><summary class="sec-h"><span class="t1"><span class="inv"> ${esc(title)} </span></span>${TOG}</summary>` +
    `<div class="sec-body">${body}</div></details></section>`;
}
export const sep = () => `<div class="sep">${L(rule("-", W_S), "small")}</div>`;

// 使用方式标签：最多两种，聊天软件插件只接一种软件时写出软件名；没有这个字段时退回类别。labels 是 data/usage_form.json 的 _labels
const PLUGIN_HOST = { sillytavern: "酒馆插件", astrbot: "AstrBot 插件", open_webui: "Open WebUI 插件" };
const CAT = { "需写代码（开发者向）": "开发者向，需要写代码", "边缘项（存的不是对话记忆）": "边缘项，存的不是对话记忆", "做法（笔记软件当记忆）": "自主管理：用笔记软件当记忆" };
export const catText = (c) => CAT[c] || String(c ?? "").replace(/（(.+)）$/, "，$1");
export function formTagsOf(p, labels = {}) {
  const v = (f) => [].concat(p?.normalized?.[f]?.value || []);
  const forms = v("usage_form");
  if (!forms.length) return [catText(p?.candidate?.category)];
  const hosts = v("compatible_clients").filter((c) => PLUGIN_HOST[c]);
  return forms.slice(0, 2).map((f) => (f === "plugin_chat" && hosts.length === 1 ? PLUGIN_HOST[hosts[0]] : labels[f] || f));
}
// 每个标签一对方括号，空一格隔开
export const tagsText = (tags) => tags.map((t) => `[${esc(t)}]`).join(" ");
