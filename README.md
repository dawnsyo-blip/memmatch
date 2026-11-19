# 个人记忆库推荐

帮已经在用个人 AI 助手、主要通过文字交流的普通用户，从开源记忆项目里找到能接到自己助手上的那几个。

开发计划见 [ROADMAP.md](ROADMAP.md)，给 Claude Code 的工作约定和踩过的坑见 [CLAUDE.md](CLAUDE.md)。当前正式问卷是 [记忆库推荐问卷 v6.md](记忆库推荐问卷%20v6.md)。

| 目录 | 内容 |
|---|---|
| `data/projects/` | 每个项目一个 JSON 文件 |
| `data/schema/` | 数据结构定义 |
| `data/questionnaire/` | 网站读取的问卷配置 |
| `data/candidates/` | 候选项目筛选表 |
| `data/hourglass-sentences.json` | 首页沙漏的句子 |
| `engine/` | 推荐引擎（浏览器和 Node 都能跑） |
| `tests/` | 引擎和虚构用户的自动测试 |
| `scripts/` | 导入、规范化、检查、推荐等脚本（`prototype/` 是早期原型，只作参考） |
| `sources/snapshots/` | 来源清单的 README 快照（是别人仓库的原文，只留在本机，不进公开仓库；来源见 `scripts/build_candidates.py`） |
| `sources/负责人材料/` | 负责人整理的原始材料（只读） |
| `docs/` | 问卷配置格式说明 |
| `docs/报告/` | 脚本生成的各类报告、安全审查 |
| `docs/前端/` | 页面清单、结果页文档、首页与答题页需求；`旧版/` 是已作废的旧版前端资料 |
| `docs/历史问卷/` | 问卷 v1–v5（旧版，不再修改） |
| `site/` | 正式网站（还是旧版前端）；预览用 `npm run site` |
| `demos/` | 新前端样张：首页、问卷页等；`experiments/` 是不再使用的试验品 |
| `server/` | 推荐入口的接收服务（待建） |
| `deploy/` | 部署配置（待建） |
| `cache/` | 下载的 README 和仓库缓存（不进 git，可重新生成） |

## 许可

- 本仓库的代码、文档和整理的数据按 [MIT 许可证](LICENSE) 发布。
- 网站用的字体是更纱黑体（Sarasa Gothic）的子集，按 SIL Open Font License 1.1 发布，许可原文见 [prototype/fonts/OFL.txt](prototype/fonts/OFL.txt)。
- 收录的各个记忆项目归各自作者所有。`data/projects/` 里引用的 README 原文片段只用来说明判断依据，以原仓库为准。
