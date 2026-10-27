// 答题页：读问卷配置（data/questionnaire/questions.json），一题一题地问。
// 跳题（show_if）和默认勾选（default_if）用推荐引擎同一个条件判断函数；答卷只存在浏览器里。
// 交互和视觉见 docs/前端/样张/答题页.html（样张阶段的定稿）。
import { checkCondition } from "../../engine/index.js";

const CONFIG_URL = "../data/questionnaire/questions.json";
const KEY = "memsite-quiz-v1";
const NS = "http://www.w3.org/2000/svg";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const TYPE_NOTE = { single: "单选", multi: "可多选", rank: "可多选，按重要程度排序" };

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
  num: `第 ${q.id.slice(1)} 题`,
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
try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.answers && byId[s.cur]) state = { ...state, ...s }; } catch (e) {}
const restored = Object.keys(state.answers).length > 0;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };
const sel = (qid) => state.answers[qid] || [];
const visible = () => QS.filter((q) => !q.show_if || checkCondition(q.show_if, state.answers));
const curQ = () => byId[state.cur];

/* ---------- 进度条：四个部分各一段，段长按这一部分当前要答的题数 ---------- */
const GAP = 6;
const bands = [...document.querySelectorAll(".band")];
let PARTS = cfg.parts.map(() => 1), STARTS = [], TOTAL = 1;
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
  fillTo(v);
  drawPendant();
  if (p < 1 || Math.abs(th) > .002 || Math.abs(om) > .002) raf = requestAnimationFrame(step);
  else { th = 0; om = 0; raf = 0; drawPendant(); }
}
function moveTo(target, animate) {
  if (!animate || reduce) { cancelAnimationFrame(raf); raf = 0; v = vFrom = vTo = target; th = om = 0; fillTo(v); drawPendant(); return; }
  if (target === vTo && raf) return;
  vFrom = v; vTo = target; t0 = performance.now();
  if (!raf) { tLast = t0; xPrev = null; velPrev = 0; raf = requestAnimationFrame(step); }
}
let firstDraw = true;
function drawProgress() {
  measureParts();
  const list = visible(), q = curQ(), idx = list.indexOf(q);
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

  el("g", { id: "parked" }, top2);
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
  updateNav();
  if (o.free && s.includes(o.id) && via !== "input") $("options").children[idx].querySelector("input")?.focus();
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
      const colon = document.createElement("span");
      colon.className = "colon"; colon.textContent = "：";
      b.querySelector(".label").appendChild(colon);
      b.querySelector(".line").appendChild(inp);
    }
    if (o.help) {
      const h = document.createElement("span");
      h.className = "ohelp"; h.textContent = o.help;
      b.querySelector(".text").appendChild(h);
    }
    b.addEventListener("click", () => choose(k, "click"));
    b.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); choose(k, "click"); } });
    li.appendChild(b);
    ul.appendChild(li);
  });
  renderMarks();
  drawProgress();
  updateNav();
  requestAnimationFrame(layoutOrbit);
}

function updateNav() {
  const list = visible(), idx = list.indexOf(curQ()), answered = sel(state.cur).length > 0;
  const last = idx === list.length - 1;
  $("prevTop").disabled = idx <= 0;
  $("nextTop").disabled = !answered;
  $("next").disabled = !answered;
  $("next").setAttribute("aria-label", last ? "完成，查看推荐" : "下一题");
}

function go(d) {
  const list = visible(), idx = list.indexOf(curQ()), n = idx + d;
  if (n < 0) return;
  if (n >= list.length) { state.done = true; save(); location.href = "result.html"; return; }
  const card = $("card");
  const swap = () => { state.cur = list[n].id; save(); render(); scrollTo({ top: 0 }); };
  if (reduce) return swap();
  card.classList.add("out");
  setTimeout(() => {
    swap();
    card.classList.remove("out"); card.classList.add("in");
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove("in")));
  }, 260);
}
$("prevTop").addEventListener("click", () => go(-1));
$("nextTop").addEventListener("click", () => go(1));
$("next").addEventListener("click", () => go(1));

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
addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { layoutOrbit(); drawPendant(); }, 120); });
document.fonts?.ready.then(() => { layoutOrbit(); drawPendant(); });

render();
if (state.hinted) { $("hint").hidden = true; requestAnimationFrame(layoutOrbit); }
if (restored) toast("已接着您上次的进度");
