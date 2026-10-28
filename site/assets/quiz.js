// 答题页：读问卷配置（data/questionnaire/questions.json），一题一题地问。
// 跳题（show_if）和默认勾选（default_if）用推荐引擎同一个条件判断函数；答卷只存在浏览器里。
// 交互和视觉见 docs/前端/样张/答题页.html（样张阶段的定稿）。
import { checkCondition, findConflicts } from "../../engine/index.js";

const CONFIG_URL = "../data/questionnaire/questions.json";
const KEY = "memsite-quiz-v2";
const NS = "http://www.w3.org/2000/svg";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const TYPE_NOTE = { single: "单选", multi: "多选", rank: "多选 · 排序" };

const $ = (id) => document.getElementById(id);
const el = (tag, attrs, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
};

/* ---------- 读配置 ---------- */
const cfg = await fetch(CONFIG_URL).then((r) => r.json());
const partOf = {};
cfg.parts.forEach((p, k) => p.questions.forEach((id) => { partOf[id] = k; }));
const QS = cfg.questions.map((q) => ({
  id: q.id,
  num: `第 ${q.number || q.id.slice(1)} 题`,
  part: partOf[q.id],
  type: q.type,
  text: q.text,
  help: q.help,
  show_if: q.show_if,
  options: q.options.map((o) => ({ id: o.id, label: o.label, help: o.help, free: !!o.free_text, exclusive: !!o.exclusive, def: o.default_if })),
}));
const byId = Object.fromEntries(QS.map((q) => [q.id, q]));

/* ---------- 答卷：存在浏览器里，可以续答 ---------- */
let state = { cur: QS[0].id, answers: {}, free: {}, seen: {}, hinted: false };
// 停在已删掉的题上（如原第 12 题）时，答案照留，接着从第一道没答的题开始
try {
  const s = JSON.parse(localStorage.getItem(KEY));
  if (s && s.answers) state = { ...state, ...s, cur: byId[s.cur] ? s.cur : (QS.find((q) => !s.answers[q.id]) || QS[0]).id };
} catch (e) {}
const restored = Object.keys(state.answers).length > 0;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };
const sel = (qid) => state.answers[qid] || [];
const visible = () => QS.filter((q) => !q.show_if || checkCondition(q.show_if, state.answers));
const curQ = () => byId[state.cur];
// 答到的最远一题：显示中的题里最后一道来过的
const latest = () => visible().filter((q) => state.seen[q.id]).pop();

/* ---------- 进度条：四个部分各一段，段长按这一部分当前要答的题数 ---------- */
const GAP = 3;  // 和 .band 的 gap 一致
const bands = [...document.querySelectorAll(".band")];
let PARTS = cfg.parts.map(() => 1), STARTS = [], TOTAL = 1, floor = 0;  // floor：进度条至少填到答到的最远处，往回翻时星星回去、填充不退
function measureParts() {
  const list = visible();
  PARTS = cfg.parts.map((_, k) => list.filter((q) => q.part === k).length || 1);
  STARTS = PARTS.map((_, k) => PARTS.slice(0, k).reduce((a, b) => a + b, 0));
  TOTAL = PARTS.reduce((a, b) => a + b, 0);
  bands.forEach((b) => {
    if (b.children.length !== PARTS.length) { b.replaceChildren(); PARTS.forEach(() => b.appendChild(document.createElement("i"))); }
    [...b.children].forEach((i, k) => i.style.setProperty("--n", PARTS[k]));
  });
}
const barX = (v) => {
  const W = $("ringsBar").clientWidth, unit = (W - GAP * (PARTS.length - 1)) / TOTAL;
  let x = 0;
  for (let k = 0; k < PARTS.length; k++) {
    if (v <= STARTS[k] + PARTS[k] || k === PARTS.length - 1) return x + Math.max(0, v - STARTS[k]) * unit;
    x += PARTS[k] * unit + GAP;
  }
  return x;
};
const fillTo = (v) => bands.forEach((b) => [...b.children].forEach((seg, k) => {
  seg.style.setProperty("--f", (Math.min(1, Math.max(0, (v - STARTS[k]) / PARTS[k])) * 100).toFixed(2) + "%");
}));

/* ---------- 坠着星星的绳子：单摆 ----------
   支点在进度条最上面那条线上（随游标移动），从支点往下长 L，末端挂星星。
   游标移动时按它的加速度推动摆角：θ'' = −(g/L)·sinθ − (a/L)·cosθ − c·θ'，摆动后慢慢停住。 */
const L = 33, G = 1350, DAMP = 3.2, TWEEN = 900;
let v = 0, vFrom = 0, vTo = 0, t0 = 0, th = 0, om = 0, xPrev = null, velPrev = 0, raf = 0, tLast = 0;
const easeIO = (p) => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
function drawPendant() {
  const r = $("ringsBar").getBoundingClientRect();
  const px = r.left + scrollX + barX(v), py = r.top + scrollY;
  const bx = px + L * Math.sin(th), by = py + L * Math.cos(th);
  const pend = $("pendant");
  pend.setAttribute("height", by + 12);
  pend.setAttribute("viewBox", `0 0 ${document.documentElement.clientWidth} ${by + 12}`);
  const cx = px + L * .5 * Math.sin(th * .6), cy = py + L * .5 * Math.cos(th * .6);
  $("rope").setAttribute("d", `M${px.toFixed(1)} 0 L${px.toFixed(1)} ${py.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`);
  $("starG").setAttribute("transform", `translate(${bx.toFixed(1)} ${(by + 3.4).toFixed(1)}) rotate(${(th * 180 / Math.PI).toFixed(1)})`);
}
function step(now) {
  const dt = Math.min(.04, (now - tLast) / 1000 || .016);
  tLast = now;
  const p = Math.min(1, (now - t0) / TWEEN);
  v = vFrom + (vTo - vFrom) * easeIO(p);
  const x = barX(v);
  const vel = xPrev === null ? 0 : (x - xPrev) / dt;
  const acc = (vel - velPrev) / dt;
  xPrev = x; velPrev = vel;
  om += (-(G / L) * Math.sin(th) - (acc / L) * Math.cos(th) - DAMP * om) * dt;
  th = Math.max(-.9, Math.min(.9, th + om * dt));
  fillTo(Math.max(v, floor));
  drawPendant();
  if (p < 1 || Math.abs(th) > .002 || Math.abs(om) > .002) raf = requestAnimationFrame(step);
  else { th = 0; om = 0; raf = 0; drawPendant(); }
}
function moveTo(target, animate) {
  if (!animate || reduce) { cancelAnimationFrame(raf); raf = 0; v = vFrom = vTo = target; th = om = 0; fillTo(Math.max(v, floor)); drawPendant(); return; }
  if (target === vTo && raf) return;
  vFrom = v; vTo = target; t0 = performance.now();
  if (!raf) { tLast = t0; xPrev = null; velPrev = 0; raf = requestAnimationFrame(step); }
}
let firstDraw = true;
function drawProgress() {
  measureParts();
  const list = visible(), q = curQ(), idx = list.indexOf(q), far = latest();
  floor = far ? list.indexOf(far) + (sel(far.id).length ? 1 : 0) : 0;
  moveTo(idx + (sel(q.id).length ? 1 : 0), !firstDraw);
  firstDraw = false;
  const part = cfg.parts[q.part];
  $("where").textContent = `${part.label}　${part.title}　${idx + 1} / ${list.length}`;
}

/* ---------- 行星环：半椭圆，卫星沿外圈移动、刻度沿内圈移动 ---------- */
let geo = null, rot = 0, tween = null;
const pt = (a, rx = geo.rx, ry = geo.ry) => [geo.cx - rx * Math.cos(a), geo.cy - ry * Math.sin(a)];

function layoutOrbit() {
  const wrap = $("wrap"), svg = $("orbit");
  const W = wrap.clientWidth;
  const rows = [...$("options").children].map((li) => ({ y: li.offsetTop + li.offsetHeight / 2 }));
  if (!rows.length) return;
  const top = rows[0].y, bottom = rows[rows.length - 1].y, H = bottom - top;
  const cy = (top + bottom) / 2;
  const ry = Math.max(H / 2 + 26, 50);
  const rx = Math.min(W * 0.34, Math.max(ry * 0.9, 56));
  geo = { W, cx: W, cy, rx, ry };
  geo.angles = rows.map((r) => {
    let lo = -Math.PI / 2, hi = Math.PI / 2;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (pt(m)[1] > r.y) lo = m; else hi = m; }
    return (lo + hi) / 2;
  });
  geo.min = geo.angles[geo.angles.length - 1] - 0.05;
  geo.max = geo.angles[0] + 0.05;

  const top2 = $("orbitTop");
  svg.replaceChildren(); top2.replaceChildren();
  svg.setAttribute("viewBox", `0 0 ${W} ${wrap.clientHeight}`);
  top2.setAttribute("viewBox", `0 0 ${W} ${wrap.clientHeight}`);
  const defs = el("defs", {}, svg);
  const lg = el("linearGradient", { id: "ringDepth", gradientUnits: "userSpaceOnUse", x1: 0, y1: cy - ry, x2: 0, y2: cy + ry }, defs);
  el("stop", { offset: 0, "stop-color": "var(--rule)" }, lg);
  el("stop", { offset: 1, "stop-color": "var(--rule)" }, lg);
  const g = el("g", { id: "ringG" }, svg);
  // 三条环线：外圈发丝细线离得远、主环最粗、内圈中等（刻度从它长出）
  el("ellipse", { class: "ring", cx: W, cy, rx: rx + 16, ry: ry + 16, "stroke-width": .6 }, g);
  el("ellipse", { class: "ring", cx: W, cy, rx, ry, "stroke-width": 3 }, g);
  el("ellipse", { class: "ring", cx: W, cy, rx: rx - 11, ry: ry - 11, "stroke-width": 1.1 }, g);
  geo.ticks = [];
  const tg = el("g", {}, svg);
  for (let k = 0; k < 64; k++) geo.ticks.push({ ln: el("line", { class: "tick" }, tg), off: k * 2 * Math.PI / 64, len: k % 4 === 0 ? 8 : 4 });

  el("g", { id: "parked" }, svg);  // 已选选项的小卫星画在文字下面一层，不挡字
  const moon = el("g", { class: "moon", id: "moon", tabindex: 0, role: "slider", "aria-label": "卫星：拖动来选择选项" }, top2);
  geo.moonHit = el("circle", { class: "hit", r: 24 }, moon);
  geo.moonBody = el("circle", { class: "body", r: 9 }, moon);
  bindMoon(moon);
  setRotation(currentTargetAngle(), false);
  drawParked();
}

function currentTargetAngle() {
  const q = curQ(), s = sel(q.id);
  if (!s.length) return 0;
  const idx = q.options.findIndex((o) => o.id === s[s.length - 1]);
  return idx >= 0 ? geo.angles[idx] : 0;
}

function drawRing(a) {
  rot = a;
  const ax = geo.rx - 11, by = geo.ry - 11;
  geo.ticks.forEach(({ ln, off, len }) => {
    const t = off + a, [x, y] = pt(t, ax, by);
    let nx = -by * Math.cos(t), ny = -ax * Math.sin(t);
    const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
    ln.setAttribute("x1", x.toFixed(1)); ln.setAttribute("y1", y.toFixed(1));
    ln.setAttribute("x2", (x + nx * len).toFixed(1)); ln.setAttribute("y2", (y + ny * len).toFixed(1));
  });
  const [mx, my] = pt(a);
  geo.moonBody.setAttribute("cx", mx); geo.moonBody.setAttribute("cy", my);
  geo.moonHit.setAttribute("cx", mx); geo.moonHit.setAttribute("cy", my);
}

function setRotation(a, animate = true) {
  if (!geo) return;
  cancelAnimationFrame(tween);
  if (!animate || reduce) return drawRing(a);
  const from = rot, start = performance.now(), dur = 520;
  const f = (now) => {
    const p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
    drawRing(from + (a - from) * e);
    if (p < 1) tween = requestAnimationFrame(f);
  };
  tween = requestAnimationFrame(f);
}

// 多选、排序：已选的选项在环上停一颗小卫星；排序题按先后从大到小
function drawParked() {
  const q = curQ(), g = $("parked");
  if (!g || !geo) return;
  g.replaceChildren();
  if (q.type === "single") return;
  sel(q.id).forEach((id, order) => {
    const idx = q.options.findIndex((o) => o.id === id);
    if (idx < 0) return;
    const [x, y] = pt(geo.angles[idx]);
    const r = q.type === "rank" ? Math.max(2.6, 6 - order * .9) : 4.8;
    el("circle", { class: "parked", cx: x, cy: y, r: r.toFixed(2) }, g);
  });
}

/* ---------- 拖动卫星 ---------- */
function bindMoon(moon) {
  let dragging = false, startA = 0, startRot = 0;
  const angleAt = (e) => {
    const r = $("orbitTop").getBoundingClientRect();
    const dx = e.clientX - r.left - geo.cx, dy = e.clientY - r.top - geo.cy;
    return Math.atan2(-dy / geo.ry, -dx / geo.rx);
  };
  const nearest = () => {
    let best = 0;
    geo.angles.forEach((a, k) => { if (Math.abs(a - rot) < Math.abs(geo.angles[best] - rot)) best = k; });
    return best;
  };
  moon.addEventListener("pointerdown", (e) => {
    dragging = true; moon.setPointerCapture(e.pointerId);
    startA = angleAt(e); startRot = rot; cancelAnimationFrame(tween);
    hideHint();
  });
  moon.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    setRotation(Math.min(geo.max, Math.max(geo.min, startRot + (angleAt(e) - startA))), false);
  });
  const end = () => { if (!dragging) return; dragging = false; choose(nearest(), "drag"); };
  moon.addEventListener("pointerup", end);
  moon.addEventListener("pointercancel", end);
  moon.addEventListener("keydown", (e) => {
    const n = curQ().options.length, cur = nearest();
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); setRotation(geo.angles[Math.min(n - 1, cur + 1)]); }
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); setRotation(geo.angles[Math.max(0, cur - 1)]); }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(cur, "key"); }
  });
}

function hideHint() {
  if (state.hinted) return;
  state.hinted = true; save();
  const h = $("hint");
  h.classList.add("gone");
  setTimeout(() => { h.hidden = true; layoutOrbit(); }, reduce ? 0 : 420);
}

/* ---------- 选择 ---------- */
function choose(idx, via) {
  const q = curQ(), o = q.options[idx];
  let s = [...sel(q.id)];
  if (q.type === "single") s = [o.id];
  else if (s.includes(o.id)) s = s.filter((x) => x !== o.id);
  else if (o.exclusive) s = [o.id];
  else s = s.filter((x) => !q.options.find((p) => p.id === x)?.exclusive).concat(o.id);
  state.answers[q.id] = s;
  $("defnote").hidden = true;
  save();
  hideHint();
  setRotation(geo.angles[idx]);
  renderMarks();
  drawParked();
  drawProgress();
  renderConflicts();
  updateNav();
  if (o.free && s.includes(o.id) && via !== "input") $("options").children[idx].querySelector("input")?.focus();
}

// 前后矛盾：只看和当前这道题有关的（这道题让别的题的选项不算数，或别的题让这道题的选项不算数）。
// 提示只写“与历史选项互斥”，附一个去那道题修改的按钮；进度条上也标出那道题，点它同样跳过去。
// 被排斥的选项后面标“互斥”。完整说明（哪条不算数、为什么）留到结果页。
function renderConflicts() {
  const box = $("conflict"), id = state.cur, list = visible();
  const cs = findConflicts(cfg, state.answers).filter((c) => c.by_question === id || c.question === id);
  const others = new Map();  // 另一道题 → 是否只是部分互斥
  for (const c of cs) {
    const o = c.question === id ? c.by_question : c.question;
    others.set(o, (others.has(o) ? others.get(o) : true) && c.partial);
  }
  box.replaceChildren(...[...others].map(([o, partial]) => {
    const p = document.createElement("p");
    p.append(partial ? "与历史选项部分互斥" : "与历史选项互斥");
    if (o !== state.detour) {
      const b = Object.assign(document.createElement("button"), { type: "button", className: "textlink", textContent: byId[o].num });  // 只写题号，如“第 3 题”
      b.addEventListener("click", () => jump(o));
      p.append(b);
    }
    return p;
  }));
  box.hidden = !others.size;

  document.querySelectorAll(".clash-mark").forEach((n) => n.remove());
  for (const o of others.keys()) {
    const k = list.findIndex((q) => q.id === o);
    if (k < 0) continue;
    const m = Object.assign(document.createElement("span"), { className: "clash-mark", title: `去${byId[o].num}修改` });
    m.style.left = barX(k + .5).toFixed(1) + "px";
    m.addEventListener("click", () => jump(o));
    $("ringsBar").appendChild(m);
  }

  const clashed = new Set(cs.filter((c) => c.question === id).map((c) => c.option));
  [...$("options").children].forEach((li, k) => {
    li.querySelector(".clash")?.remove();
    if (clashed.has(curQ().options[k].id)) li.querySelector(".label").after(Object.assign(document.createElement("span"), { className: "clash", textContent: "互斥" }));
  });
}

function renderMarks() {
  const q = curQ(), s = sel(q.id);
  [...$("options").children].forEach((li, k) => {
    const b = li.firstElementChild, on = s.includes(q.options[k].id);
    b.setAttribute("aria-checked", on);
    b.querySelector(".mark").textContent = q.type === "rank" && on ? s.indexOf(q.options[k].id) + 1 : "–";
  });
}

/* ---------- 渲染一道题 ---------- */
function applyDefaults(q) {
  // 第一次来到这道题、还没答时，按前面的回答预先勾上（用户可以改）
  if (state.seen[q.id] || sel(q.id).length) return false;
  state.seen[q.id] = true;
  const picks = q.options.filter((o) => o.def && checkCondition(o.def, state.answers)).map((o) => o.id);
  if (!picks.length) return false;
  state.answers[q.id] = q.type === "single" ? picks.slice(0, 1) : picks;
  save();
  return true;
}

function render() {
  const q = curQ();
  const defaulted = applyDefaults(q);
  state.seen[q.id] = true; save();
  $("kicker").textContent = `${q.num} · ${TYPE_NOTE[q.type]}`;
  $("qtitle").textContent = q.text;
  $("qhelp").textContent = q.help || "";
  $("qhelp").hidden = !q.help;
  $("defnote").hidden = !defaulted;
  const ul = $("options");
  ul.replaceChildren();
  ul.setAttribute("role", q.type === "single" ? "radiogroup" : "group");
  ul.setAttribute("aria-labelledby", "qtitle");
  q.options.forEach((o, k) => {
    const li = document.createElement("li");
    const b = document.createElement("div");
    b.className = "opt";
    b.tabIndex = 0;
    b.setAttribute("role", q.type === "single" ? "radio" : "checkbox");
    b.innerHTML = `<span class="mark" aria-hidden="true">–</span><span class="text"><span class="line"><span class="label"></span></span></span>`;
    b.querySelector(".label").textContent = o.label;
    let under = null;
    if (o.free) {
      const key = `${q.id}.${o.id}`;
      const inp = document.createElement("input");
      inp.className = "free"; inp.placeholder = "请填写"; inp.value = state.free[key] || "";
      b.classList.add("has-free");
      inp.setAttribute("aria-label", o.label + "，请填写");
      inp.addEventListener("click", (e) => e.stopPropagation());
      inp.addEventListener("keydown", (e) => e.stopPropagation());
      inp.addEventListener("input", () => {
        state.free[key] = inp.value; save();
        if (inp.value && !sel(q.id).includes(o.id)) choose(k, "input");
      });
      if (o.help) {
        // 有说明小字的（如“请填写您所用过的记忆项目”）：选中后填空出现在说明的位置，说明变成填空的提示文字
        inp.classList.add("under"); inp.placeholder = o.help;
        b.classList.add("free-under");
        under = inp;
      } else {
        const colon = document.createElement("span");
        colon.className = "colon"; colon.textContent = "：";
        b.querySelector(".label").appendChild(colon);
        b.querySelector(".line").appendChild(inp);
      }
    }
    if (o.help) {
      const h = document.createElement("span");
      h.className = "ohelp"; h.textContent = o.help;
      b.querySelector(".text").appendChild(h);
    }
    if (under) b.querySelector(".text").appendChild(under);
    b.addEventListener("click", () => choose(k, "click"));
    b.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); choose(k, "click"); } });
    li.appendChild(b);
    ul.appendChild(li);
  });
  renderMarks();
  drawProgress();
  renderConflicts();
  updateNav();
  requestAnimationFrame(layoutOrbit);
}

// 往回翻时“回到第 N 题”的目标：去改互斥的题时是出发的那道题，否则是答到的最远一题
function returnTarget() {
  const list = visible();
  if (state.detour && list.some((q) => q.id === state.detour)) return state.detour;
  return latest()?.id;
}

function updateNav() {
  const list = visible(), idx = list.indexOf(curQ()), answered = sel(state.cur).length > 0;
  const last = idx === list.length - 1;
  const back = returnTarget(), backIdx = list.findIndex((q) => q.id === back);
  const detour = state.detour === back && backIdx > idx;
  $("prevTop").disabled = idx <= 0;
  $("nextTop").disabled = !answered;
  $("next").disabled = !answered;
  $("next").setAttribute("aria-label", detour ? `回到${byId[back].num}` : last ? "完成，查看推荐" : "下一题");
  $("nextTop").setAttribute("aria-label", detour ? `回到${byId[back].num}` : "下一题");
  // 离最远处只差一题时，下一题按钮就够了
  const link = $("backLatest");
  link.hidden = !(backIdx > idx + 1);
  link.disabled = !answered;
  if (!link.hidden) link.textContent = `回到${byId[back].num}`;
}

function show(id) {
  const card = $("card");
  const swap = () => { state.cur = id; if (state.detour === id) delete state.detour; save(); render(); scrollTo({ top: 0 }); };
  if (reduce) return swap();
  card.classList.add("out");
  setTimeout(() => {
    swap();
    card.classList.remove("out"); card.classList.add("in");
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove("in")));
  }, 260);
}

// 去改互斥的那道题：记下从哪道题出发，改完点下一题直接回来
function jump(id) {
  if (!state.detour) state.detour = state.cur;
  save();
  show(id);
}

function go(d) {
  const list = visible(), idx = list.indexOf(curQ());
  if (d > 0 && state.detour) {
    const k = list.findIndex((q) => q.id === state.detour);
    if (k > idx) return show(state.detour);
    delete state.detour;
  }
  const n = idx + d;
  if (n < 0) return;
  if (n >= list.length) { state.done = true; save(); location.href = "result.html"; return; }
  show(list[n].id);
}
$("prevTop").addEventListener("click", () => go(-1));
$("nextTop").addEventListener("click", () => go(1));
// 点小土星：和题目卡片一起淡出（卡片 260ms 后换题），换题后再淡入
$("next").addEventListener("click", () => {
  const b = $("next");
  if (!reduce) { b.classList.add("fade"); setTimeout(() => b.classList.remove("fade"), 300); }
  go(1);
});

/* 小土星斜着自转：自转轴绕着一个小圆圈慢慢晃（像陀螺进动），每 6 秒一圈。
   画面上就是两件事错开四分之一圈同时发生：环的倾角在 -13.2° 左右各摆 6°，环面的张开程度在 0.7～1.3 倍之间变。
   星球是扁球，横半径 7.1、竖半径 6.4，和环在同一个组里一起倾斜；环面张开（视线更靠近极地）时竖半径跟着变大一点。
   没答本题时停住不动；系统设了减少动态效果时只画一帧 */
const TILT = -13.2, TILT_SWING = 6, OPEN_SWING = .3, WOBBLE_PERIOD = 6000;
let wobble = 0, wobbleLast = 0;
const ringPath = (k, sweep) => `M-13 0 A13 ${(3.5 * k).toFixed(2)} 0 0 ${sweep} 13 0 M-16 0 A16 ${(4.3 * k).toFixed(2)} 0 0 ${sweep} 16 0`;
function drawSaturn(now) {
  const dt = wobbleLast ? Math.min(100, now - wobbleLast) : 0;
  wobbleLast = now;
  if (!$("next").disabled) wobble += dt / WOBBLE_PERIOD * 2 * Math.PI;
  const k = 1 + OPEN_SWING * Math.cos(wobble);
  $("probe").setAttribute("transform", `translate(32 22) rotate(${(TILT + TILT_SWING * Math.sin(wobble)).toFixed(2)})`);
  $("ringBack").setAttribute("d", ringPath(k, 1));
  $("ringFront").setAttribute("d", ringPath(k, 0));
  $("planet").setAttribute("ry", (6.4 + (k - 1) * 1.2).toFixed(2));
  if (!reduce) requestAnimationFrame(drawSaturn);
}
requestAnimationFrame(drawSaturn);
$("backLatest").addEventListener("click", () => { const t = returnTarget(); if (t) show(t); });

function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2600);
}

/* ---------- 导航 ---------- */
const btn = $("menuBtn"), drawer = $("drawer"), scrim = $("scrim");
function setMenu(open) {
  drawer.classList.toggle("open", open); scrim.classList.toggle("open", open);
  btn.setAttribute("aria-expanded", open); drawer.inert = !open;
  if (open) drawer.querySelector("a").focus(); else btn.focus();
}
btn.addEventListener("click", () => setMenu(true));
$("drawerClose").addEventListener("click", () => setMenu(false));
scrim.addEventListener("click", () => setMenu(false));
addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer.classList.contains("open")) setMenu(false); });
$("resetBtn").addEventListener("click", () => {
  if (!confirm("清空已经填的答案，从第 1 题重新开始？")) return;
  try { localStorage.removeItem(KEY); } catch (e) {}
  location.reload();
});

let rt;
addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { layoutOrbit(); drawPendant(); renderConflicts(); }, 120); });
document.fonts?.ready.then(() => { layoutOrbit(); drawPendant(); });

render();
if (state.hinted) { $("hint").hidden = true; requestAnimationFrame(layoutOrbit); }
if (restored) toast("已接着您上次的进度");
