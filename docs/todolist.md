# 待办

## 补充进项目库的 Obsidian 相关项目（2026-11-05 负责人同意收，暂缓）

Star 数是 2026-11-05 从 GitHub 页面读的，都在维护、没有归档。

| 项目 | Star | 是什么 | 归哪组 |
|---|---|---|---|
| [bonerush/dsh-obsidian-mem](https://github.com/bonerush/dsh-obsidian-mem) | 13 | DeepSeek Harness 插件，也能接 Codex。把编程项目的记忆存进 Obsidian，侧边栏画出知识图谱和活动日历，完成的回合自动整理成笔记 | Agent 插件 |
| [breferrari/obsidian-mind](https://github.com/breferrari/obsidian-mind) | 5492 | 现成的 Obsidian 笔记库模板，让 Claude Code、Codex、Gemini CLI 记住目标、项目和做过的决定 | Agent 插件 |
| [devwhodevs/engraph](https://github.com/devwhodevs/engraph) | 174 | 把笔记库建成能检索的知识图谱，关键词、语义、双向链接一起查，能接 MCP 的 Agent 都能用 | 笔记软件连接器或记忆部件 |
| [jaredrhod/ai-memory-vault](https://github.com/jaredrhod/ai-memory-vault) | 730 | 模板加搭建脚本，让 Claude Code 把 Obsidian 搭成 AI 的长期记忆 | 教程或文档 |

不收的：AgriciDaniel/claude-obsidian（16182 Star，存的是资料整理成的知识库，不是对话记忆，算边缘项）；oomkapwn/enquire-mcp（34 Star，和 engraph 重复较多，可收可不收）；dhawal-ss/memorychat（1 Star）。

收录流程（照 CLAUDE.md“补充新候选”）：

1. `python -X utf8 scripts/fetch_repo_meta.py 仓库 ...` 读最新提交、Star、许可证，README 存到 `cache/candidate_readmes/`
2. 结论写进 `scripts/candidate_review.py` 的 `NEW`，来源写进 `EXTRA_SOURCES`
3. build_candidates → import_projects → fetch_readmes → normalize（跑两遍）→ 核对新项目的特性命中 → check_health --resume → decide_inclusion
4. 逐项对照 README 核实字段，写进 `data/readme_verification.json`；安全审查写进 `docs/报告/security-audit.md`，要提醒的写进 `data/safety_notes.json`
5. 补 `data/usage_form.json`、`data/mount.json`（推不准时）、`data/host_memory.json`（接 OpenClaw、Hermes、AstrBot 的）、`data/token_usage.json`、`data/display_summaries.json`、`data/spend_review.json`（有收费线索时）
6. `npm test`、`node scripts/build_site_data.mjs`、`python -X utf8 scripts/subset_receipt_font.py`、`npm run build`，再上传网站
