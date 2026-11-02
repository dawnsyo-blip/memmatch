// 生成阶段 4 测试报告：每个虚构用户的答卷摘要、期望和实际推荐结果。
// 用法：npm run report（输出 docs/报告/阶段4-推荐测试报告.md）
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadAll, ROOT } from "../engine/load-node.js";
import { PERSONAS, answersOf } from "../tests/personas.mjs";
import { formatResult } from "./recommend.mjs";

const { questionnaire, projects, engine } = loadAll();
const qById = Object.fromEntries(questionnaire.questions.map((q) => [q.id, q]));

function answerSummary(answers) {
  const rows = [];
  for (const q of questionnaire.questions) {
    const a = answers[q.id];
    if (a === undefined) continue;
    const sel = [].concat(a);
    const labels = sel.map((id) => (q.options.find((o) => o.id === id)?.label || id).split("：")[0]);
    rows.push(`| ${q.id.replace("q", "")} ${q.short || ""} | ${labels.join("、")} |`);
  }
  return ["| 题目 | 回答 |", "|---|---|", ...rows].join("\n");
}

const out = [
  "# 阶段 4 推荐测试报告",
  "",
  `> 由 \`npm run report\` 生成（${new Date().toISOString().slice(0, 10)}），不要手改。问卷配置版本：${questionnaire.version}。`,
  "> 每个虚构用户的期望都写成了自动测试（\`npm test\`），这里列出实际推荐结果，供负责人审核推荐是否合理。",
  "> 所有判断都来自说明文档，没有实际安装验证。",
  "",
];
for (const p of PERSONAS) {
  const answers = answersOf(p);
  const r = engine.recommend(answers, projects);
  out.push(`## ${p.title}`, "", `**期望**：${p.expect}`, "", "<details><summary>答卷</summary>", "", answerSummary(answers), "", "</details>", "",
    formatResult(r, { showExcluded: 4 }), "", "---", "");
}
writeFileSync(join(ROOT, "docs/报告/阶段4-推荐测试报告.md"), out.join("\n"), "utf8");
console.log("已生成 docs/报告/阶段4-推荐测试报告.md");
