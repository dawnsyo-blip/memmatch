# CLAUDE.md

个人记忆库推荐网站。路线图见 [ROADMAP.md](ROADMAP.md)，按阶段执行，标【停下来等确认】处必须等负责人审核。

## 目录

- `data/candidates/` 候选项目筛选（阶段 0 之前加的一步）：`个人记忆库候选表.xlsx` 由脚本生成，不要手改
- `scripts/candidate_review.py` 人工筛选结论（改结论改这里）；负责人对各分组的决定写在其中的 `GROUP_POLICY`；`scripts/build_candidates.py` 生成候选表
- `sources/snapshots/` 三个来源清单的 README 快照（2026-10-10），生成脚本从这里解析
- `记忆框架开源情况.xlsx` 负责人原始整理表，只读

- `data/projects/<id>.json` 每个项目一个文件，结构见 `data/schema/project.schema.json`；`raw` 保存各来源原文，不要改

重新生成候选表：`python -X utf8 scripts/build_candidates.py`
重新导入项目 JSON（阶段 0）：`python -X utf8 scripts/import_projects.py`（只覆盖/删除 source 为 initial 的文件）

两个脚本共用 `build_candidates.collect_rows()`，改筛选结论后两条命令都要跑。

补充新候选（2026-10-24 起的做法）：
- `python -X utf8 scripts/fetch_repo_meta.py owner/repo ...`（或 `--missing`）补读仓库的最新提交、Star、许可证，写进 `repo_meta.json`，README 存到 `cache/candidate_readmes/`，读 README 写筛选结论用
- 结论写进 `candidate_review.py` 的 `NEW`；不在快照清单里的条目，来源写进 `EXTRA_SOURCES`；评测成绩写进 `BENCH`
- awesome-ai-companion 由快照解析：四个记忆相关栏目整栏收入，不收的写进 `COMPANION_SKIP`；其它栏目只取 `COMPANION_PICK`
- 然后 build_candidates → import_projects → fetch_readmes（会直接复用 candidate_readmes）→ normalize → 核对新项目的特性命中 → check_health --resume → decide_inclusion

阶段 1（字段规范化）：
- `python -X utf8 scripts/fetch_readmes.py` 把 README 缓存到 `cache/readmes/`（不进仓库）
- `python -X utf8 scripts/normalize.py` 写入各项目的 `normalized`，生成 `docs/review-normalization.md/.xlsx`
- 负责人在 xlsx「负责人确认值」填「同意」或英文代码后：`python -X utf8 scripts/normalize.py --apply-review`，确认值存进 `data/normalization_overrides.json`
- 完整顺序：import_projects → normalize（导入会保留已有的 normalized）
- 负责人 2026-10-11 决定：有建议值的采用建议值（`--accept-suggestions`，已执行，存进 overrides 并注明原依据）；无建议值的记为 `unknown`，原因写进项目的 `uncertainties` 备注。以后新增的待审核项按同样规则处理前先问负责人
- 审核表在 Excel 里打开时 xlsx 写不进去，脚本会提示但不中断；重新生成会覆盖 xlsx，负责人在里面填的内容要先 `--apply-review` 读回
- 用户在意的 19 个特性（12 个据社区讨论，7 个据 Emotion Machine 文章）定义和匹配规则在 `scripts/feature_rules.py`；README 命中逐条核对过，误判写进 `README_REJECT`／`STRUCTURED_REJECT`。改了规则后要重新导出命中摘录再核对一遍；新增特性先不要放进 `CHECKED`，核对完再加
- 2026-10-24 追加的 9 个字段（排序因素、打分环节、多维还是单一、情绪怎么处理、项目定位、覆盖的记忆环节、流程是否完整、能否搭配、便于自己改）规则在 `scripts/dimension_rules.py`：README 误判记在 `REJECT`（键是 (id, 字段, 值)），项目定位、依赖、搭配、情绪的人工判断分别在 `ROLE_OVERRIDE`、`DEPENDS`、`PAIRS`、`EMOTION_MANUAL`。其中覆盖环节、流程完整、多维与否由其它字段推出，所以在套用负责人确认值之后才计算
- 负责人 2026-10-24 同意：新项目的待审核项照旧采用建议值（`--accept-suggestions` 记录的日期是执行当天）

阶段 2、3：
- `python -X utf8 scripts/check_health.py [--resume|--only a,b]` 写入各项目 `health`，生成 `docs/health-report.md`；网络故障记 `status=error`，用 `--resume` 续跑；检查逻辑改动时把 `CHECKER_VERSION` 加 1
- `python -X utf8 scripts/decide_inclusion.py` 写入 `inclusion`，生成 `docs/inclusion-report.md`（之后停下等负责人审核）
- 可调设置在 `data/settings.json`（停更天数等）

## 踩过的坑

- **Windows 控制台是 GBK**：打印中文或 emoji 会 `UnicodeEncodeError`。用 `python -X utf8`。注意 `python -I`（隔离模式）会忽略 `PYTHONIOENCODING` 环境变量，只能靠 `-X utf8`。
- **代理只设了 `HTTP_PROXY`**：curl 和 Python 的 urllib 对 https 地址只认 `HTTPS_PROXY`，于是直连 raw.githubusercontent.com 一直超时。curl 加 `-x http://127.0.0.1:1080`，跑脚本前加 `HTTPS_PROXY=$HTTP_PROXY`（`fetch_repo_meta.py` 已自动补上）。
- **GitHub 网络不稳**：这台机器经本地代理（127.0.0.1:1080）上网，github.com 和 raw.githubusercontent.com 时常整段时间连不上，脚本要带重试，并发别超过 2～3。
- **GitHub API 未登录每小时只有 60 次**，没装 `gh`。批量读仓库改用 `git clone --depth 1 --filter=blob:none --no-checkout`，再 `git show HEAD:README.md`；Star 和归档状态从仓库网页 HTML 里的 `"stargazerCount"`、`"isArchived"` 取。
- **contents/readme 接口会截断大文件**：awesome-mcp-servers 的 README 有 1.4MB，接口只给了 512000 字节。改用 `git/blobs/{sha}` 接口或 raw 地址。
- **关键词归类的坑**：用 `hosted` 判断“托管服务”会误伤所有 `self-hosted`，要写成 `(?<!self-)hosted`。只凭一句简介做的自动归类必须人工过一遍。
- **zziying/consolidation-draft 不是项目清单**，是一份记忆“事件整合”维护的设计规格，不能从中提取项目。
- **候选表在 Excel 里打开时写不进去**（PermissionError）。可先 `python -X utf8 scripts/build_candidates.py <临时路径>` 生成到别处检查，等负责人关掉 Excel 再覆盖正式文件。
- **从 README 抓关键词判断特性误伤极多**，必须看命中的原文摘录再定规则：`automatically` 常指自动下载/部署，`staging` 常指测试环境，`approve` 常指授权连接器；`decay` 常是检索排序的时间权重而非遗忘；`export` 会命中 shell 的 `export VAR=`、JS 的模块导出、以及“导入 ChatGPT 导出的记录”；还要跳过前面带 no/not/不 的否定句。拿不准就标 needs_review。
- **中文关键词也会误伤**：“识图”会命中“知识**图**谱”，“整理”“合并”“隔离”“迁移”“来源”都有与特性无关的用法；英文要加词边界（`valence` 会命中 equivalence，`emotion` 会命中 demotion，`pin` 多指锁定版本号，`dated` 会命中 updated）。
- **heredoc 里写 Python 替换正则容易被转义坑**（`\.`、`\s` 被吃掉导致 assert 失败、文件没改）。改脚本用 Write 写独立的 .py 文件、用原始字符串。
- **Windows 上 `shutil.rmtree` 删不掉 git 克隆目录**（打包文件是只读的），`ignore_errors=True` 会把错误吞掉，下次克隆报“目录已存在”。要用 onexc 先 chmod 再删（见 `check_health.rmtree`）。
- **部分克隆（`--filter=blob:none`）按需下载文件内容**，网络中断时 `git show` 会读到空内容，不能当成“没有许可证”，要记为检查失败重试。
- **许可证识别要“限制多的优先”、只看标题**：BUSL 正文提到到期后转 Apache，自定义源码可见许可里也有 MIT 式的授权句。
- **GPL/AGPL 标准条款正文里就有 noncommercially 字样**，不能据此判“禁止商用”；只对自定义许可检查。
- **机器人账号只按作者邮箱精确匹配**，`bot@` 会误伤名字带 bot 的作者（g1itchbot），导致“近一年没有人提交”的误报。
- 下载的第三方仓库一律放在 scratchpad 里，只读 README/LICENSE，不运行其中任何代码。
- **新项目的特性命中要单独核对**：`CHECKED` 里的特性对新项目也直接判“有”，但新 README 带来新的误伤（截图标题算多模态、`wake` 算换窗、示例提示词里的“情绪”“人设”、`pinned versions`、`follow your dreams`）。补充项目后用 scratchpad 脚本导出新项目的 README 命中逐条看，误判写进 `README_REJECT`；我们自己写的说明文字也会误伤（“按项目隔离”算记错防护、“合并”算离线整理），写进 `STRUCTURED_REJECT`。
- **中文短词同样会误伤**：“也可嵌入自建中转”的“嵌入”被当成嵌入向量；英文 `sidecar` 多指附属进程或文件，不是“和别的记忆库搭配”；`salience`、`trust level`、`recency baseline` 常出现在注入位置、权限、评测对照里。
- **评测成绩写进备注会被特性规则扫到**：目前没有误伤，但改 `BENCH` 文案时注意别写进“时间线”“原话”这类特性关键词。
- **检索工程（RAG）合集对本项目几乎没用**：全是文档问答框架、向量库和论文；上下文工程合集也以编程 agent 工具为主。面向聊天用户的上下文/记忆工具集中在酒馆（SillyTavern）、Open WebUI、AstrBot、Kelivo 这类前端的插件生态里。
- **MemBench、REALTALK、DuLeMon 没有系统排行**，只是数据集论文；LongMemEval、BEAM、LoCoMo 的成绩多为厂商自报，口径不一（MemPalace 的 96.6% 只测检索）。
