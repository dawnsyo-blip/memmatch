# CLAUDE.md

个人记忆库推荐网站。路线图见 [ROADMAP.md](ROADMAP.md)，按阶段执行，标【停下来等确认】处必须等负责人审核。

## 目录

- `data/candidates/` 候选项目筛选（阶段 0 之前加的一步）：`个人记忆库候选表.xlsx` 由脚本生成，不要手改
- `scripts/candidate_review.py` 人工筛选结论（改结论改这里）；`scripts/build_candidates.py` 生成候选表
- `sources/snapshots/` 三个来源清单的 README 快照（2026-10-10），生成脚本从这里解析
- `记忆框架开源情况.xlsx` 负责人原始整理表，只读

重新生成候选表：`python -X utf8 scripts/build_candidates.py`

## 踩过的坑

- **Windows 控制台是 GBK**：打印中文或 emoji 会 `UnicodeEncodeError`。用 `python -X utf8`。注意 `python -I`（隔离模式）会忽略 `PYTHONIOENCODING` 环境变量，只能靠 `-X utf8`。
- **GitHub 网络不稳**：这台机器经本地代理（127.0.0.1:1080）上网，github.com 和 raw.githubusercontent.com 时常整段时间连不上，脚本要带重试，并发别超过 2～3。
- **GitHub API 未登录每小时只有 60 次**，没装 `gh`。批量读仓库改用 `git clone --depth 1 --filter=blob:none --no-checkout`，再 `git show HEAD:README.md`；Star 和归档状态从仓库网页 HTML 里的 `"stargazerCount"`、`"isArchived"` 取。
- **contents/readme 接口会截断大文件**：awesome-mcp-servers 的 README 有 1.4MB，接口只给了 512000 字节。改用 `git/blobs/{sha}` 接口或 raw 地址。
- **关键词归类的坑**：用 `hosted` 判断“托管服务”会误伤所有 `self-hosted`，要写成 `(?<!self-)hosted`。只凭一句简介做的自动归类必须人工过一遍。
- **zziying/consolidation-draft 不是项目清单**，是一份记忆“事件整合”维护的设计规格，不能从中提取项目。
- 下载的第三方仓库一律放在 scratchpad 里，只读 README/LICENSE，不运行其中任何代码。
