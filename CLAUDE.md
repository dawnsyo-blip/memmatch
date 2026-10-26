# CLAUDE.md

个人记忆库推荐网站。路线图见 [ROADMAP.md](ROADMAP.md)，按阶段执行，标【停下来等确认】处必须等负责人审核。

## 目录

- `data/candidates/` 候选项目筛选（阶段 0 之前加的一步）：`个人记忆库候选表.xlsx` 由脚本生成，不要手改
- `scripts/candidate_review.py` 人工筛选结论（改结论改这里）；负责人对各分组的决定写在其中的 `GROUP_POLICY`；`scripts/build_candidates.py` 生成候选表
- `sources/snapshots/` 来源清单的 README 快照（2026-10-10；2026-10-24 补充 awesome-ai-companion、上下文工程、RAG、酒馆插件合集），生成脚本从这里解析
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
- 同一天又按问卷 v2 补了 7 个字段（中文支持、记忆分层、检索后处理、召回是否调用大模型、敏感记忆抑制、写入回执、谁来记），规则也在 `dimension_rules.py`。“分层”“去重”“门槛”“回执”“unresolved”这类词极易误伤，模式已收紧到记忆语境；写入回执和敏感记忆抑制几乎没有项目写，只能作加分项
- 2026-10-25 为问卷 v4 又补了 3 个字段（手机能否连上 `phone_access`、能否用本地模型 `local_model`、是否绑定某家模型 `model_lock`），并新增客户端 `deepseek_harness`（README 写明 DSH 插件或指南的才算）。至此 `normalized` 共 14 个基础字段＋19 个特性＋19 个维度字段，schema 里逐个列出，加字段时要同步改 `data/schema/project.schema.json`
- 负责人 2026-10-24 同意：新项目的待审核项照旧采用建议值（`--accept-suggestions` 记录的日期是执行当天）
- **逐项核实（2026-10-25，负责人要求）**：全部参与推荐的项目逐个对照 README 核过字段（最常推荐的十几个还看了代码），结果在 `data/readme_verification.json`（每个项目：核实日期、依据、可选的改写简介、改过的字段及理由；没列的字段＝核过无误）。normalize 以 `verified` 状态套用，优先级：核实值 > 负责人确认值 > 规则判定；排序因素、项目定位改了以后，多维与否、覆盖环节等推导字段按核实值重算；有改写简介的会写进 `info.summary`。以后新增项目也要这样核一遍再上线
- 同日新增字段 `setup_device`（只用手机能否装好：`phone_ok`／`needs_computer`）和客户端值 `chatgpt_gpt`（ChatGPT 自定义 GPT 的 Actions，手机 App 可用，不同于只限网页端的自定义 MCP）

问卷与推荐（阶段 4）：
- 正式问卷是负责人维护的 `记忆库推荐问卷 v4.md`（18 题＋第 3a、4a 题追问＋第 8a 题，负责人 2026-10-25 确认；4a、8a 是 2026-10-26 按负责人要求加的，题目由 Claude 拟定）；网站读的配置是 `data/questionnaire/questions.json`，两者要保持一致，改题目先问负责人
- 配置格式（条件、作用、合并方式、选项失效、放宽建议、加分、补充部件）见 `docs/questionnaire-format.md`
- 推荐引擎在 `engine/`（JavaScript ES 模块，无依赖，浏览器和 Node 都能跑）：`rule-engine.js` 是规则实现，`index.js` 写明统一接口（换外部模型时另写一个实现即可），`load-node.js` 给测试和命令行加载数据
- 命令：`npm test`（10 个虚构用户＋引擎测试，用户和期望在 `tests/personas.mjs`）；`npm run report` 生成 `docs/阶段4-推荐测试报告.md`；`node scripts/recommend.mjs 答卷.json` 跑单份答卷
- 改了问卷配置、字段或规则后都要跑 `npm test`；测试失败时先判断是期望写错还是推荐变差，别为了通过而改期望
- `scripts/prototype/` 是正式引擎之前的 Python 原型，只作参考；`docs/推荐结果示例.md` 是原型阶段的模拟记录
- 组合推荐用的“设计上搭配使用”关系在 `dimension_rules.py` 的 `RELATED`，normalize 写进 `normalized.pairs_with`（双向）
- 2026-10-25 配置里新增的规则（未改题目文字，负责人同意，已同步到问卷 v4.md）：第 2 题没有电脑也没有服务器时排除 `setup_device` = `needs_computer`；第 3a 题选了某个 Agent 时，它的原生插件加分（AstrBot 插件加 5 分）；第 17 题放宽建议加“注册 GitHub 账号”；引擎在单独放宽哪条都不够时，试两条一起放宽
- `node scripts/recommend_frequency.mjs [份数]` 用随机答卷统计各项目被推荐的次数，用来决定先核哪些项目、发现某个项目异常地常被推荐
- 推荐原则：硬条件只排除确定用不了的，文档没写的保留并标“需自行确认”；结果为空时给“放宽哪一条就有几个”的建议；用户答案优先于推荐偏好
- 各家官方 App 能否接记忆库（2026-10 核实）：
  - Claude App 能用远程 MCP 连接器（要先在网页端添加，付费套餐）
  - ChatGPT 的自定义 MCP 只限网页端，应用目录里上架的应用手机才能用
  - Gemini App 能加自定义 MCP（限美国个人账号）
  - DeepSeek、智谱官方 App 不能
  - 手机遥控电脑上的 Agent 是另一条路：Claude App 的 Remote Control 连 Claude Code，ChatGPT App 的 Remote 连 Codex，DeepSeek Harness 只有社区远程插件。这时记忆库装在电脑上即可
  - Codex 的非交互用法是 `codex exec`，`-p` 是 Claude Code 和 Gemini CLI 的
  - ChatGPT 自定义 GPT（Actions）：手机 App 能用已有的 GPT，但个人账号（Free、Go、Plus、Pro）已不能新建，OpenAI 计划 2026-12-11 前后让自定义 GPT 退役、改为 Plugins（据 OpenAI 帮助页搜索摘要和多家二手报道，官方页面无法直接抓取）。所以不作为问卷入口；数据里的 `chatgpt_gpt` 只作记录

阶段 2、3：
- `python -X utf8 scripts/check_health.py [--resume|--only a,b]` 写入各项目 `health`，生成 `docs/health-report.md`；网络故障记 `status=error`，用 `--resume` 续跑；检查逻辑改动时把 `CHECKER_VERSION` 加 1
- `python -X utf8 scripts/decide_inclusion.py` 写入 `inclusion`，生成 `docs/inclusion-report.md`（之后停下等负责人审核）
- 可调设置在 `data/settings.json`（停更天数等）

阶段 5（前端）：
- 中文排版与文案参数以项目 skill `.claude/skills/zh-web-typography/SKILL.md` 为准（据 clreq、赫蹏、中文文案排版指北），英文设计 skill（impeccable、frontend-design）给的字号行高与之冲突时按它
- 每页完成后用 web-design-guidelines 审一遍
- 负责人 2026-10-25 定：网站称呼用户统一用“您”；全站不使用 emoji（要图形提示用 SVG 线条图标）

安全审查（2026-10-26）：结论见 `docs/security-audit.md`，未发现恶意项目；需提醒用户的情况写在 `data/safety_notes.json`，normalize 写入各项目的 `safety_note`（推荐结果页要显示）。新增项目也要查一遍；akephalos 因仓库 404 已移除。

多智能体记忆（2026-10-26，负责人要求补收评测好或 Star 多的）：旧规则 F5“多智能体不面向个人用户”不再一刀切排除。已改为纳入：Cognee、MIRIX、Memanto、PowerMem、deja、agentmemory、Caura，新增 Memorix、A-MEM（见 `candidate_review.py` 第 6 批 `NEW`）。Cipher 因仓库已归档、许可证 Elastic 2.0 排除。负责人 2026-10-26 同意调整 F5：评测突出或 Star 多的例外，其余多智能体项目（Star 均不足 20，无评测）仍排除。这 9 项已于同日逐项对照 README 核实（记在 `data/readme_verification.json`；MIRIX 现在的上手方式是 Docker＋Python 客户端，归开发者向；A-MEM 的 1003 Star 仓库只是论文复现代码，可用的库是 WujiangXu/A-mem-sys）；安全审查见 `docs/security-audit.md` 末节。

多模态召回字段 `media_recall`（2026-10-26，负责人要求）：值 `image`／`audio`／`video`（可多选）或 `not_mentioned`。标准：系统自己保管原图／原音频／原视频（或直接给原件做向量），召回时能把原件交回；只把图片、语音、视频转成文字（描述、转写、OCR）再存文字的不算，哪怕留了文件路径或链接。与旧特性 `multimodal` 不同，后者命中范围宽（生图、读图都算），不要混用。规则不自动判定，全靠 `readme_verification.json` 里逐项核实：先用 scratchpad 脚本扫 README 里“媒体词＋记忆词”的行，再对命中项克隆仓库看代码和文档。没命中的项目按未提及处理，所以是“已知有”的下限，漏网项目要在以后复核时补。已核实有的 12 个，核实后判为只转文字的 14 个（备注里写了原因）。问卷第 8a 题用它加分（2026-10-26）。

多智能体共用字段 `multi_agent`（2026-10-26，为问卷第 4a 题新增）：值 `shared`（写明几个不同的 Agent 或工具读写同一份记忆）、`per_agent`（能给每个 Agent 分开记忆空间或权限，只共享一部分），可两者都有，或 `not_mentioned`。同一个 Agent 换设备不算（那是 `cross_client`），项目内部由几个子智能体分管记忆（如 MIRIX、agent-zero 的子 agent）也不算；`namespace` 只按项目或用户分的不算 `per_agent`。和 `media_recall` 一样只靠逐项核实：扫 README 里多 agent、共享、agent_id、namespace 等词，逐条看原文判断。写明几个 Agent 共用、原来 `cross_client` 是“未提及”的 10 个顺手改成了 yes。结果：共用 64 个、能分开 29 个。

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
- **“托管”会命中“自托管”**：和英文 `hosted` 命中 `self-hosted` 是同一个坑。2026-10-25 发现 Mem0、Supermemory、mem9、Acontext、Central Intelligence 因此被判成“只能托管”，规则已改为 `(?<!自)托管`，并把“自托管”“self-host”算作自己的电脑或服务器。
- **中文短词同样会误伤**：“也可嵌入自建中转”的“嵌入”被当成嵌入向量；英文 `sidecar` 多指附属进程或文件，不是“和别的记忆库搭配”；`salience`、`trust level`、`recency baseline` 常出现在注入位置、权限、评测对照里。
- **评测成绩写进备注会被特性规则扫到**：目前没有误伤，但改 `BENCH` 文案时注意别写进“时间线”“原话”这类特性关键词。
- **检索工程（RAG）合集对本项目几乎没用**：全是文档问答框架、向量库和论文；上下文工程合集也以编程 agent 工具为主。面向聊天用户的上下文/记忆工具集中在酒馆（SillyTavern）、Open WebUI、AstrBot、Kelivo 这类前端的插件生态里。
- **MemBench、REALTALK、DuLeMon、MemoryArena、MemoryAgentBench 没有系统排行**，只是论文或数据集；LongMemEval、BEAM、LoCoMo 的成绩多为厂商自报，口径不一（MemPalace 的 96.6% 只测检索）。
- **`base_url` 会命中 `SUPABASE_URL`、`DATABASE_URL`**，SDK 示例里的 `base_url` 也多指记忆服务自己的地址，不能据此判断“能用本地模型”；“HTTP transport”也不等于手机能连上（有的写着默认不开）。
- **“文档没写”不能当成“不能”**：模拟填写时把“多端共用”做成要求文档写明，结果误排除了一批 MCP 记忆服务（它们天生能同时服务几个客户端）。硬条件只排除明确用不了的。
- **问卷选项不能太笼统**：“程序化接入”涵盖十几种 Agent、“API 客户端”混着 Kelivo 和酒馆，引擎就会给 Codex 用户推荐 OpenClaw 插件、给 Kelivo 用户推荐酒馆扩展。改问卷后用原型引擎跑一遍典型用户再交付。
- **网上的入口能力说法常互相矛盾**（如 `-p` 计费改动有报道说已暂停、ChatGPT 手机端能否用 MCP），以官方帮助文档为准，并区分“应用目录里的应用”和“自己添加的自定义 MCP”。
- **Node 24 的 `node --test tests/` 会把目录当成文件名**报 MODULE_NOT_FOUND，要写成 `node --test "tests/*.test.js"`；`engine/` 下的 `.js` 用 ES 模块语法，靠根目录 `package.json` 的 `"type": "module"`。
- **“在云上”不等于手机连得上**：项目默认托管时 `phone_access` 有 `cloud`，但用户没选托管、自己部署时手机未必能连。引擎里只有用户选了托管、或项目能部署在用户自己的云账号上时才把它算数（见问卷配置第 3 题的规则）。
- **项目简介有的是早期内部备注**（如 Drivesoid“站点仅在关键词中标‘记忆’”），阶段 5 上页面前要统一润色 `info.summary`。
- **自动解析留下的典型误判**（2026-10-25 逐项核实时发现，规则判定的结果不能直接上线）：“同一 WiFi 下手机可连”被当成能装在手机上；“可导入 ChatGPT 导出记录”被当成能接 ChatGPT；“Add to LM Studio”（LM Studio 是 MCP 客户端）被当成能用本地模型；“推送到手机”被当成支持安卓、iOS；Cloudflare、Supabase、Zeabur 只当存储或隧道时被当成“跑在自己的云账号上”；云端运行的项目其实要在电脑上敲命令部署；只处理 Claude Code 记录的工具没标“只能配合 Claude”；界面提示“几秒后淡出”被采用成了“自动衰减”
- **Python 在 Windows 上写的文本文件是 CRLF**，bash 的 `while read u` 读到的每行末尾带 `\r`，`git clone "$u.git"` 全部失败却看不出原因；要先 `tr -d '\r'`
- **后台运行的 Bash 命令没有代理环境变量**，git clone 立即失败；需要联网的命令放前台跑
- **参与推荐的不只是 `inclusion.status` = `included`**：`flagged`（带风险标记）也照样推荐，有 144 个，比 included 还多。扫描、统计时要用“不是 `excluded`”来筛，2026-10-26 补 `multi_agent` 时第一次只扫了 included，漏了一大半
- **`data/readme_verification.json` 是 2 空格缩进、按加入顺序排列的**：脚本改它时别 `sort` 键、别用 `indent=1`，否则 git diff 变成上万行，看不出实际改了什么；往已有条目补字段时只改 `fields` 里那一项，不要整条覆盖（旧的 scratchpad merge.py 会整条覆盖）
- **用 heredoc 写含反斜杠的正则会被吃掉转义**，2026-10-24 又把 dimension_rules.py 写坏一次。含 `\n`、`\d` 的改动一律用 Edit 工具。
