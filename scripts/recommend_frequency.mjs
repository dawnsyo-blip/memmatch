// 随机生成答卷，统计各项目被推荐（前 8、补充部件、组合）的次数，用来决定先核实哪些项目。
// 用法：node scripts/recommend_frequency.mjs [份数，默认 3000]
import { loadAll } from "../engine/load-node.js";

const N = Number(process.argv[2] || 3000);
const { questionnaire, projects, engine } = loadAll();
let seed = 20261025;
function rand() { // mulberry32
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

function randomAnswers() {
  const a = {};
  for (const q of questionnaire.questions) {
    const opts = q.options;
    if (q.type === "single") { a[q.id] = pick(opts).id; continue; }
    const excl = opts.filter((o) => o.exclusive);
    if (excl.length && rand() < 0.15) { a[q.id] = [pick(excl).id]; continue; }
    const pool = opts.filter((o) => !o.exclusive).sort(() => rand() - 0.5);
    a[q.id] = pool.slice(0, 1 + Math.floor(rand() * Math.min(3, pool.length))).map((o) => o.id);
  }
  return a;
}

const top = {}, extra = {};
let empty = 0;
for (let i = 0; i < N; i++) {
  const r = engine.recommend(randomAnswers(), projects);
  if (!r.results.length) empty++;
  for (const x of r.results) top[x.id] = (top[x.id] || 0) + 1;
  const ids = new Set([...Object.values(r.addons).flatMap((g) => g.items.map((x) => x.id)), ...r.combos.flatMap((c) => c.parts.map((x) => x.id))]);
  for (const id of ids) extra[id] = (extra[id] || 0) + 1;
}
const rows = Object.keys({ ...top, ...extra }).map((id) => [id, top[id] || 0, extra[id] || 0]).sort((x, y) => y[1] + y[2] - x[1] - x[2]);
console.log(`共 ${N} 份答卷，结果为空 ${empty} 份；出现过的项目 ${rows.length} 个`);
console.log("id\t前8\t部件或组合");
for (const r of rows) console.log(r.join("\t"));
