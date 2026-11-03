// 小票原型和完整结果页共用：读答卷、跑推荐引擎。
// 答卷读旧版答题页存的 memsite-quiz-v3；没有时用示例答卷
// （tests/personas.mjs 的 kelivo_vps，偏好题按 DEFAULTS 填，第 8 题多排了两项，好让改进建议有内容）。
// 要用 npm run site 打开（http://localhost:5173/prototype/），直接双击 html 时浏览器不让读数据。
import { createRuleEngine } from "../engine/index.js";

export const SAMPLE = {
  answers: {
    q2: ["deepseek"], q1: ["android", "server"], q3: ["mcp_client"], q4: ["single"], q5: ["server"],
    q16: ["medium"], q17: ["api_key"],
    q6: ["native"], q7: ["companion"], q8: ["no_priority", "window_loss", "entry_hallucination"],
    q10: ["auto_review"], q11: ["any"], q13: ["emotional"], q14: ["few"], q15: ["unknown"],
  },
  free: {},
};

const json = (path) => fetch(new URL(path, import.meta.url)).then((r) => {
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
});

export async function run() {
  const [cfg, data, usage] = await Promise.all([
    json("../data/questionnaire/questions.json"),
    json("../site/data/projects.json"),
    json("../data/usage_form.json").catch(() => ({})),
  ]);
  let st = null;
  try { st = JSON.parse(localStorage.getItem("memsite-quiz-v3")); } catch (e) {}
  const sample = !st || !Object.keys(st.answers || {}).length;
  st = sample ? SAMPLE : { answers: {}, free: {}, ...st };

  const byQ = Object.fromEntries(cfg.questions.map((q) => [q.id, q]));
  const answers = Object.fromEntries(Object.entries(st.answers).map(([id, v]) => [id, byQ[id]?.type === "single" ? v[0] : v]));
  const r = createRuleEngine({ questionnaire: cfg, settings: data.settings }).recommend(answers, data.projects, { free: st.free });
  return { cfg, data, usage, st, answers, byQ, r, sample };
}
