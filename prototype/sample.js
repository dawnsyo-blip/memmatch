// 小票原型和完整结果页共用：读答卷、跑推荐引擎。
// 答卷读小票答题页存的 memsite-quiz-v6；还没答过题时返回 empty，结果页转回首页去答题
// （负责人 2026-11-04 定不保留示例答卷）。?demo 时用下面的演示答卷，开发时看排除原因用。
// 要用 npm run site 打开（http://localhost:5173/prototype/），直接双击 html 时浏览器不让读数据。
import { createRuleEngine } from "../engine/index.js";

// 演示答卷：result.html?demo 用它。会触发前后矛盾、主要过滤选项和可放宽条件，用来看“排除原因”的完整样子
export const DEMO = {
  answers: {"q1": ["linux", "iphone"], "q3": ["client", "web", "bot"], "q3web": ["glm"], "q3app": ["deepseek"], "q3desk": ["gemini"], "q3remote": ["kimi_cli", "claude_code", "hermes"], "q3client": ["lobechat", "nextchat", "open_webui"], "q3where": ["computer"], "q3mcp": ["yes"], "q3cli": ["kimi_cli", "deepseek_harness"], "q3bot": ["unknown", "runtime", "platform"], "q3runtime": ["openclaw", "cow", "hermes"], "q3platform": ["dify", "coze"], "q3api": ["relay", "google"], "q4": ["single"], "q5": ["computer", "server", "vps_new", "hosted"], "q7": ["other", "hobby"], "q6": ["open_source"], "q8": ["stereotype", "no_priority"], "q8n": ["you_me", "overwrite", "fabrication"], "q9": ["video", "audio", "image"], "q10": ["auto"], "q11": ["any"], "q12m": ["active"], "q13": ["yes"], "q14": ["fast"], "q15p": ["no"], "q15": ["unknown"], "q16": ["low"], "q18c": ["free"], "q18t": ["thrifty"], "q19": ["zh"], "q20": ["must"]},
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
  const demo = new URLSearchParams(location.search).has("demo");
  try { st = demo ? null : JSON.parse(localStorage.getItem("memsite-quiz-v6")); } catch (e) {}
  const empty = !st || !Object.keys(st.answers || {}).length;
  if (empty && !demo) return { cfg, data, usage, empty: true };
  st = demo ? DEMO : { answers: {}, free: {}, ...st };
  const sample = demo;

  const byQ = Object.fromEntries(cfg.questions.map((q) => [q.id, q]));
  const answers = Object.fromEntries(Object.entries(st.answers).map(([id, v]) => [id, byQ[id]?.type === "single" ? v[0] : v]));
  const r = createRuleEngine({ questionnaire: cfg, settings: data.settings }).recommend(answers, data.projects, { free: st.free });
  return { cfg, data, usage, st, answers, byQ, r, sample, demo };
}
