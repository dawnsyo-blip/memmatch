// 推荐引擎的统一接口。
//
// 任何引擎都是一个对象：{ name, recommend(answers, projects, options) }
//   answers  答卷：{ 题目 id: 选项 id（单选）| [选项 id…]（多选；排序题按用户排的顺序）}
//   projects 项目列表：data/projects/*.json 的内容
//   options  可选：{ free: { "题号.选项": 填空内容 } }，第 7 题填的项目名用来认出用户现在用的记忆
// recommend 返回：
//   results     排好序的推荐 [{ id, name, score, reasons[], cautions[], unknowns[], … }]
//               做法条目（role 为 method，笔记软件当记忆）一起排名，另带 parts[]：可选的笔记软件连接器
//   more        前 top_n 名以外、也通过筛选的项目（结构同 results）
//   addons      补充部件（上下文延续工具、情绪引擎等）{ id: { title, why, items[] } }
//   guides      相关教程
//   combos      搭配方案，两个或没有 [{ type, title, via, label, base, parts: [{ id, name, stages[], desc, current }] }]
//               type：current 在用户现在用的基础上补一个（base 为 project／notes／native）、complete 完整系统＋补强、group 两三个互相配合的项目
//               via：第二个项目怎么选的，pairs 设计上搭配、stages 补上缺的环节、concern 针对第 8 题的问题（label 是问题名）、markdown、addon、top
//   excluded    被排除的项目及原因 [{ id, name, reason }]
//   notices     要提醒用户的话（如“官方 App 接不了外部记忆”）
//   relax       结果太少时的放宽建议 [{ question, label, count }]
//   narrowed_by 哪几道题让可选项目变少 [{ question, number, short, selected[], only, total }]，按 only 从多到少
//               only＝只因为这一道题被排除的个数（改了这道题就能回来），total＝这道题排除的总数；只算记忆库，不算补充部件和教程
//   conflicts   前后矛盾 [{ question, option, by_question, by_option, partial, emptied, message }]，见 findConflicts
//
// 现在只有规则引擎；以后接入外部模型时，新写一个返回同样结构的实现即可，前端和测试不用改。

export { createRuleEngine, checkCondition, findConflicts, projectMatches } from "./rule-engine.js";
