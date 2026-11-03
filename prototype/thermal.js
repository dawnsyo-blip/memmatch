// 小票原型共用：字符网格（每行 32 格，汉字两格）、条形码、大标题、题目简称。
// 用格数拼行的函数要等 FONTS 之后再调：字宽按更纱黑体实测（它的“”是半角），字体没加载上时按东亚宽字符估。

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
  q1: "设备", q2: "LLM 厂商", q3: "手机入口", q3a: "Agent", q3b: "客户端", q3c: "酒馆扩展",
  q4: "共用记忆", q5: "运行位置", q7: "常做的事", q6: "在用的记忆", q8: "遇到的问题", q8n: "担心的问题",
  q9: "保留原件", q10: "录入把关", q11: "谁来记录", q12m: "维护时间", q13: "慢慢淡忘", q14: "等待时间",
  q15: "上下文工程", q16: "安装门槛", q17: "账号服务", q18t: "token 用量", q19: "英文界面", q20: "导出记忆",
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
