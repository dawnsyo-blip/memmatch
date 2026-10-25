// 推荐引擎的统一接口。
//
// 任何引擎都是一个对象：{ name, recommend(answers, projects) }
//   answers  答卷：{ 题目 id: 选项 id（单选）| [选项 id…]（多选；排序题按用户排的顺序）}
//   projects 项目列表：data/projects/*.json 的内容
// recommend 返回：
//   results     排好序的推荐 [{ id, name, score, reasons[], cautions[], unknowns[], … }]
//   addons      补充部件（上下文延续工具、情绪引擎等）{ id: { title, why, items[] } }
//   guides      相关教程
//   combos      组合方案 [{ title, parts: [{ role, id, name }] }]
//   excluded    被排除的项目及原因 [{ id, name, reason }]
//   notices     要提醒用户的话（如“官方 App 接不了外部记忆”）
//   relax       结果太少时的放宽建议 [{ question, label, count }]
//
// 现在只有规则引擎；以后接入外部模型时，新写一个返回同样结构的实现即可，前端和测试不用改。

export { createRuleEngine } from "./rule-engine.js";
