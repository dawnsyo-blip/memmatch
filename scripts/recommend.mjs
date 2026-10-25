// 用一份答卷跑推荐，打印给人看的结果。
// 用法：node scripts/recommend.mjs <答卷.json>
//      答卷格式：{ "q1": ["anthropic"], "q3": ["remote_control"], "q3a": ["claude_code"], "q16": "medium", ... }
import { readFileSync } from "node:fs";
import { loadAll } from "../engine/load-node.js";

export function formatResult(r, { showExcluded = 0 } = {}) {
  const lines = [];
  for (const n of r.notices) lines.push(`> 提醒：${n}`, "");
  lines.push(`符合条件的记忆库共 ${r.total_kept} 个，排名靠前的：`, "");
  r.results.forEach((x, i) => {
    lines.push(`${i + 1}. **${x.name}**（${x.category}，得分 ${x.score}）${x.summary ? "：" + x.summary : ""}`);
    if (x.reasons.length) lines.push(`   - 适合您：${x.reasons.join("；")}`);
    if (x.cautions.length) lines.push(`   - 注意：${x.cautions.join("；")}`);
    if (x.unknowns.length) lines.push(`   - 文档没写、需自行确认：${x.unknowns.join("、")}`);
    if (x.customization.length) lines.push(`   - 方便二改：${x.customization.join("、")}`);
  });
  for (const a of Object.values(r.addons)) {
    lines.push("", `**${a.title}**：${a.why}`);
    for (const x of a.items) lines.push(`- ${x.name}${x.summary ? "：" + x.summary : ""}`);
  }
  if (r.guides.length) lines.push("", "**相关教程**：" + r.guides.map((g) => g.name).join("、"));
  if (r.combos.length) {
    lines.push("", "**组合方案**：");
    for (const c of r.combos) lines.push(`- ${c.title}：` + c.parts.map((p) => `${p.name}（${p.role}）`).join(" ＋ "));
  }
  if (r.relax.length) {
    lines.push("", "**放宽条件可以多些选择**：");
    for (const x of r.relax.slice(0, 5)) lines.push(`- ${x.label}：共 ${x.count} 个`);
  }
  if (showExcluded) {
    const byReason = {};
    for (const e of r.excluded) (byReason[e.reason] ||= []).push(e.name);
    lines.push("", `被排除 ${r.excluded.length} 个：`);
    for (const [why, names] of Object.entries(byReason).sort((a, b) => b[1].length - a[1].length))
      lines.push(`- ${why}（${names.length}）：${names.slice(0, showExcluded).join("、")}${names.length > showExcluded ? "……" : ""}`);
  }
  return lines.join("\n");
}

if (process.argv[1] && process.argv[1].endsWith("recommend.mjs")) {
  const { projects, engine } = loadAll();
  const answers = JSON.parse(readFileSync(process.argv[2], "utf8"));
  console.log(formatResult(engine.recommend(answers, projects), { showExcluded: 5 }));
}
