# CLAUDE.md

个人记忆库推荐网站。路线图见 [ROADMAP.md](ROADMAP.md)，按阶段执行，标【停下来等确认】处必须等负责人审核。

## 目录

- `data/candidates/` 候选项目筛选（阶段 0 之前加的一步）：`个人记忆库候选表.xlsx` 由脚本生成，不要手改
- `scripts/candidate_review.py` 人工筛选结论（改结论改这里）；负责人对各分组的决定写在其中的 `GROUP_POLICY`；`scripts/build_candidates.py` 生成候选表
- `sources/snapshots/` 来源清单的 README 快照（2026-10-10；2026-10-24 补充 awesome-ai-companion、上下文工程、RAG、酒馆插件合集），生成脚本从这里解析
- `sources/负责人材料/` 负责人给的原始材料，只读：`记忆框架开源情况.xlsx`（原始整理表）、`独立事实记忆层_使用流程.md`（50 个项目的使用流程整理）

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
- 正式问卷是负责人维护的 `记忆库推荐问卷 v6.md`（20 题＋第 3a、3b、3c 追问，第 8 题按第 7 题分两个版本；负责人改题在根目录的 `记忆库推荐问卷 v6 文字稿.md` 上进行，由配置导出、改完后同步回配置和 v6。题号只是显示用：配置里调换或插入题目时不改原有 id，用 `number` 字段设显示题号（如第 6、7 题对调后 `q7` 显示为 6；2026-10-28 删去原第 12 题“记忆要马上能用吗”（id `q12`），维护意愿题 `q12m` 显示为 12，`q13`–`q20` 显示题号和 id 相同）；负责人 2026-10-28 在文字稿上逐题改定，正文由配置导出）。旧版问卷（v1–v5，以及 v6 的底稿“v5 文字稿”）放在 `docs/历史问卷/`，不再改；网站读的配置是 `data/questionnaire/questions.json`，两者要保持一致，改题目先问负责人
- v6 配置的题号：第 1 题是设备（id `q1`）、第 2 题是 LLM 厂商（`q2`），和 v5 对调；第 8 题两个版本是 `q8`（用过的）和 `q8n`（没用过的），配置里用 `"number": "8"` 让页面显示同一个题号；原 q8a→q9，q9＋q12→q10，q10→q11，q11→q12。预算题 `q18` 按强制花销 `spend` 筛选（`combine: allow`）
- 配置格式（条件、作用、合并方式、选项失效、放宽建议、加分、补充部件）见 `docs/questionnaire-format.md`
- 推荐引擎在 `engine/`（JavaScript ES 模块，无依赖，浏览器和 Node 都能跑）：`rule-engine.js` 是规则实现，`index.js` 写明统一接口（换外部模型时另写一个实现即可），`load-node.js` 给测试和命令行加载数据
- 命令：`npm test`（10 个虚构用户＋引擎测试，用户和期望在 `tests/personas.mjs`）；`npm run report` 生成 `docs/阶段4-推荐测试报告.md`；`node scripts/recommend.mjs 答卷.json` 跑单份答卷
- 改了问卷配置、字段或规则后都要跑 `npm test`；测试失败时先判断是期望写错还是推荐变差，别为了通过而改期望
- `scripts/prototype/` 是正式引擎之前的 Python 原型，只作参考；`docs/推荐结果示例.md` 是原型阶段的模拟记录
- 组合推荐用的“设计上搭配使用”关系在 `dimension_rules.py` 的 `RELATED`，normalize 写进 `normalized.pairs_with`（双向）
- 2026-10-25 配置里新增的规则（未改题目文字，负责人同意，已同步到问卷 v4.md）：第 2 题没有电脑也没有服务器时排除 `setup_device` = `needs_computer`；第 3a 题选了某个 Agent 时，它的原生插件加分（AstrBot 插件加 5 分）；第 17 题放宽建议加“注册 GitHub 账号”；引擎在单独放宽哪条都不够时，试两条一起放宽
- 2026-10-27 负责人同意：第 3 题选酒馆时也保留 MCP 记忆库（酒馆装社区扩展 SillyTavern-MCP-Client 后能连 MCP），这些项目带“先装扩展”的注意事项（规则用新键 `note_unless` 排除原生酒馆扩展）；原生酒馆扩展加 10 分
- `node scripts/recommend_frequency.mjs [份数]` 用随机答卷统计各项目被推荐的次数，用来决定先核哪些项目、发现某个项目异常地常被推荐
- 推荐原则：硬条件只排除确定用不了的，文档没写的保留并标“需自行确认”；结果为空时给“放宽哪一条就有几个”的建议；用户答案优先于推荐偏好
- 各家官方 App 能否接记忆库（2026-10 核实）：
  - Claude App 能用远程 MCP 连接器（要先在网页端添加；免费版限 1 个，付费版多个，2026-10-28 据第三方资料复核，官方帮助页抓不到全文）
  - ChatGPT 的自定义 MCP 只限网页端，而且官方帮助页写明完整读写只开放给企业版、团队版、教育版（个人 Pro 只读，Plus 不明）；应用目录 2026-07-09 改名插件目录，里面的应用网页和手机 App 都能用，Notion 在其中（负责人 2026-10-28 用 Plus 账号实测：网页上装好后手机 App 也能用，能新建页面；从插件弹窗点“连接”曾报“此应用目前不提供浏览器设置 URL”）。所以第 3 题选官方 App＋OpenAI 时只放行 `method-notion`，并注明需自行确认
  - Gemini App 能加自定义 MCP（限美国个人账号）
  - DeepSeek、智谱官方 App 不能
  - 手机遥控电脑上的 Agent 是另一条路：Claude App 的 Remote Control 连 Claude Code，ChatGPT App 的 Remote 连 Codex，DeepSeek Harness 只有社区远程插件。这时记忆库装在电脑上即可
  - Codex 的非交互用法是 `codex exec`，`-p` 是 Claude Code 和 Gemini CLI 的
  - ChatGPT 自定义 GPT（Actions）：手机 App 能用已有的 GPT，但个人账号（Free、Go、Plus、Pro）已不能新建，OpenAI 计划 2026-12-11 前后让自定义 GPT 退役、改为 Plugins（据 OpenAI 帮助页搜索摘要和多家二手报道，官方页面无法直接抓取）。所以不作为问卷入口；数据里的 `chatgpt_gpt` 只作记录

阶段 2、3：
- `python -X utf8 scripts/check_health.py [--resume|--only a,b]` 写入各项目 `health`，生成 `docs/health-report.md`；网络故障记 `status=error`，用 `--resume` 续跑；检查逻辑改动时把 `CHECKER_VERSION` 加 1
- `python -X utf8 scripts/decide_inclusion.py` 写入 `inclusion`，生成 `docs/inclusion-report.md`（之后停下等负责人审核）
- 可调设置在 `data/settings.json`（停更天数等）
- 负责人 2026-10-28 定：教程（`project_role` = `guide`）和上下文工具（`context_tool`）写完就用，不提示“超过 N 天没有提交”（`decide_inclusion.py` 的 `FINISHED_ROLES`）。`project_role` 是单值字段，值是字符串，别用 `set()` 去套

阶段 5（前端）：
- 前端的页面清单、风格简报模板、之后的设计规范放在 `docs/前端/`
- **正式网站在 `site/`**（2026-10-27 起）：`index.html` 首页、`quiz.html` 答题页、`result.html` 结果页（目前是占位，只列出答卷）；共用 `site/assets/tokens.css`、`theme.js`，答题逻辑在 `site/assets/quiz.js`。样张（`docs/前端/样张/`）是定稿前的试验场，改正式页面改 `site/`
- 预览：`npm run site` 后打开 http://localhost:5173/site/ （网站要 fetch `data/` 下的问卷配置、import `engine/`，直接双击 html 打不开）
- 结果页在浏览器里跑推荐引擎，项目数据由 `node scripts/build_site_data.mjs` 打包成 `site/data/projects.json`（不进仓库，`npm run site` 会先打包；只留 value、status，结果和完整数据一致）。改了项目数据要重新打包
- 前后矛盾提示（2026-10-28）：引擎导出 `findConflicts`，来自配置里选项的 `disables`（带 `note` 说明原因）；答题页按负责人要求只写“与历史选项互斥”／“部分互斥”＋“去第 N 题修改”，被排斥的选项标“互斥”，进度条上用小方块标出那道题（可点）；跳过去改时记下出发的题（`state.detour`），下一题按钮直接回去；往回翻时进度条填充不退（填到答到的最远处），离最远处两题以上时底部出现“回到第 N 题”。结果页概况里显示完整原因。已选选项全部失效时这道题照样筛选（占位值 `__disabled__`），以前会被当成没回答而不限运行位置。另有只提示、不改变筛选的前后矛盾，写在配置顶层的 `warnings`（本地 LLM 却没电脑、遥控 Agent 却要“点几下”或只选手机、接受托管却没勾项目方账号）
- 结果页结构（2026-10-28 负责人定，草稿 `docs/前端/结果页内容草稿.md`、两位用户的模拟 `docs/前端/结果页模拟.md`）：概况一行 → 为您挑出的 N 个（前 3 张展开、其余折叠；每张：简介、最多 3 条理由、“相比其它几个”一句、门槛、花销 `spend_note`、注意事项含 `safety_note`、仓库链接）→ 搭配方案 → 其余也符合条件的 → 为什么只有这些（收窄范围、前后矛盾、提醒、放宽建议、被排除的）→ 改进建议（2026-10-28 改为所有人都有：用过的读 `q8`、没用过的读 `q8n`，按排序逐条写，附前 8 里做到的项目）＋可以加装的部件和教程 → 页脚。不按问题硬分三组；Machine Studio 等用英文名
- **结果页文字以后由 LLM 生成（待办，等有服务器再做）**：提示词草稿在 `docs/前端/结果页LLM提示词.md`（语言风格以 `docs/前端/结果页模拟.md` 为准，只写数据里有的）。引擎仍决定推荐哪些、怎么排，LLM 只写三处——每个项目的“相比其它几个”、改进建议和搭配方案的说明。流程：浏览器跑引擎 → 把答案（附题目原文）、前 8 个项目及其关键字段发给自己的服务器（API Key 不能放浏览器）→ 服务器带 prompt 调 LLM（只许用给出的数据、简洁直白、称“您”，按固定 JSON 返回 `{项目id: 一句话}` 和 `{问题id: 建议}`）→ 页面先显示引擎结果，文字到了再填进去，出错或超时用规则生成的兜底。现在这两处由 `site/assets/result-text.js` 用规则生成（同批项目字段对比、固定建议文案），以后 LLM 接进来时只替换这个模块的输出，页面不动
- 结果页正式版（深色，2026-10-28）：`site/result.html`，共用导航在 `site/assets/nav.js`；引擎返回值新增 `more`（前 top_n 名以外也通过筛选的），并导出 `projectMatches`（改进建议里“推荐里做到的”直接用第 8 题的加分规则判断，只看 1 分以上的规则）。打包时带上项目顶层的 `safety_note`（只留文字），并按 `data/display_names.json` 换显示名（原始数据的名字不改）
- 搭配方案（2026-10-28 负责人定，引擎 `buildCombos`）最多两个，每个 2～3 个项目。**只搭真能配合的**：两个独立的记忆库各存各的，一个的整理、遗忘碰不到另一个存的记忆，所以不按环节拼凑，也不拿“针对第 8 题”的另一个记忆库来补。能配合的只有两类：作者设计的一组（`pairs_with`，按数据里写好的顺序，在全部符合条件的项目里找），和记忆库加用户需要的补充部件（情绪引擎、上下文延续工具，来自问卷的 `addons`，每类一个）。第 7 题看出用户正在用某套记忆的，方案一在他现在用的上面补（填了名字的补搭配或部件；笔记软件优先补存成 Markdown 的记忆库；客户端自带记忆补一个记忆库，这两种分工不同，不需要共用记忆），方案二给新方案；没在用的，方案一是完整系统加搭配或部件，方案二是作者设计的一组或记忆库加部件。认法：选“开源的记忆项目”或“其它类型”并填了名字的（2026-10-28 负责人同意给“开源的记忆项目”也加填空），按名字对收录的项目，填的内容按顿号逗号拆开逐个对，短名字要完全一样；其次是笔记软件，再次是客户端自带记忆；名字对不上的按没在用处理。第 7 题的填空由页面以 `recommend(answers, projects, { free })` 传给引擎。页面写法：每个方案三段——分工（句首点出胜过另一个方案的地方，`comboEdge`；比另一个少了环节时句末说明）、为什么合起来比单独用好（`comboWhy`）、配合程度（`comboFit`：作者设计的一组为高，分工不同的为较好，部件说明里没写能否和别的项目一起用的为需自行确认，客户端自带记忆为一般）。对比是双向的，两边都说得出胜过对方的地方才给方案二，否则只留方案一，不编号、不写对比；按排名得出的理由太弱，不算。用户在用的项目标“您在用”
- 结果页页脚三个按钮：下载答卷、下载推荐结果（含卡片上的门槛、花销、注意和搭配方案）、返回修改问卷（主按钮，实心），手机上三等分排一行。长段正文两端对齐，标题和列表项左对齐（负责人 2026-10-28 定，`zh-web-typography` 已同步）。
- 结果页文字不用括号（负责人 2026-10-28）：项目名里的括号部分（作者、旧名）在页面上拆成名字后面的浅色小字（`result-text.js` 的 `splitName`），类别用 `result.html` 的 `catText` 换说法；数据里的简介、花销说明模板（`normalize.py` 的 `SPEND_PHRASE`）、安全提醒、问卷的 `note`／`reason`／门槛标签都已改写成正常语序。以后新写的给用户看的文字也不要用括号，措辞简洁、书面。概况固定写“为您挑出 N 个记忆库／筛选的硬条件：可用设备、所用 LLM／Agent。／筛选的软条件：对记忆生成、演化、检索的偏好。／项目描述基于 README 生成，核实于 2026 年 10 月”；“为什么是这些”写“该选项排除了 N 个项目”；“相比其它几个”的比较里安装门槛和花销排在最后（变化大，不宜作主要区别）
- **结果页文字的语言风格以 `docs/前端/结果页模拟.md` 为准（负责人 2026-10-28 定），不参考 humanizer-zh**。同日试过参考 humanizer-zh 把推荐理由、注意事项、花销说明、安全提醒、简介里的术语全部换成白话（向量检索→按意思搜索、自托管→装在自己的电脑或服务器上、召回→想起），负责人看过后要求整体回退：能说明项目特点的专业名词要保留（向量检索和 BM25 是两种检索方式，都写成“搜索”就分不出来）；白话说法反而有歧义（“外网”分不清是公网还是国外的网络，“核心设定”说不清是什么）。另外：同一句话里主语不变，可能有歧义时不省略主语；一句话说完就用句号。项目简介按这个风格重写，存在 `data/display_summaries.json`，只在 `build_site_data.mjs` 打包网站数据时替换 `info.summary`，规则判定和测试仍读原始简介，改它不影响推荐。写法规则见 `docs/前端/结果页LLM提示词.md` 的“项目简介的写法”；新增项目要在这里补一条
- **使用方式字段 `usage_form`（负责人 2026-10-28 同意新增）**：回答“用户怎么用上这个项目”，可多选、第一个是主要方式，值有聊天软件插件、Agent 插件、独立服务、转发服务、自带聊天界面的应用、独立应用、聊天机器人、命令行工具、开发者代码包、教程或文档、做法、模型（定义见 schema）。核对值在 `data/usage_form.json`，normalize 写进 `normalized.usage_form`；没列入的新项目按 `access` 推出初值、状态 auto，核对后补进文件，补时遇到新形态可以加新值。结果页名字下面那行显示它（最多两种，聊天软件插件只接一种软件时写“酒馆插件”这类），简介开头不再重复写“……的程序”。推荐规则不读它，旧的 `access` 字段仍给规则用、没改；搭配方案可以读它
- 答题页完全按 `data/questionnaire/questions.json` 渲染：题目分属哪个部分写在配置的 `parts`；跳题 `show_if`、默认勾选 `default_if` 用引擎导出的 `checkCondition`（和推荐引擎同一套判断）；进度条四段的长度按当前要答的题数（追问没触发就不算）；答卷存在 `localStorage` 的 `memsite-quiz-v2`（v6 改了题号，所以从 v1 升级；以后改题号也要升级）（`answers` 是选项 id 数组，填空在 `free["题号.选项"]`）
- 答题页 2026-10-28 和负责人定下的细节：选项文字不垫底色（行星环保持完整，从文字后面穿过）；多选题已选的小卫星画在文字下面一层；带说明小字的填空选项，选中后输入框出现在说明的位置；说明里的 `
` 显示为换行；进度条各部分间隙 3px（CSS 和 quiz.js 的 `GAP` 要一致）；下一题按钮只剩一颗土星，没答时变淡、离留白线 8px，答完后变亮右滑贴线，自转轴进动（环倾角 ±6°、环面张开 0.7～1.3 倍、扁球星球跟着倾斜，quiz.js 的 `drawSaturn` 逐帧画），点下去和题目卡片一起淡出淡入；试过又去掉的：轨迹线、向右轻跳、整颗旋转、外环虚线流动、星球呼吸、经线
- 已装的设计和动效 skill：impeccable、web-design-guidelines、frontend-design、GSAP 官方 8 个（gsap-core、gsap-timeline、gsap-scrolltrigger、gsap-react 等，MIT，装在用户目录）、color-expert（meodai，CC BY 4.0，配色原理：按性格配色、60-30-10、明度差决定可读性；配色时用它，颜色在 OKLCH 里推导并算 WCAG 对比度）。Lenis、Vanta、React Bits 没有靠谱的 skill，用时看官方文档
- 中文排版与文案参数以项目 skill `.claude/skills/zh-web-typography/SKILL.md` 为准（据 clreq、赫蹏、中文文案排版指北），英文设计 skill（impeccable、frontend-design）给的字号行高与之冲突时按它
- 每页完成后用 web-design-guidelines 审一遍
- 负责人 2026-10-25 定：网站称呼用户统一用“您”；全站不使用 emoji（要图形提示用 SVG 线条图标）。例外：2026-10-26 负责人要求首页改用“你”（副标题“找到适合你与 AI 共用的记忆库”）
- 样张在 `docs/前端/样张/`（首页、答题页、色板，共用 `tokens.css` 和 `theme.js`）；负责人的风格简报和参考图在 `docs/前端/`。菜单图标照负责人给的造型重画成方线头（原图是圆头，和全站直角风格不搭），答题页左右箭头是直角折线；所有图标线条用方线头、直角
- 负责人 2026-10-26 定：只保留两种模式——深色＝星空（默认）、浅色＝纸面，在导航栏里切换（存在浏览器里）。粉色、梅红试过后不用了。深色模式由 `<html class="theme-dark">` 打开，组件只引用语义变量（`--paper`、`--ink`、`--ink-soft`、`--ink-faint`、`--rule`、`--bulb`、`--moon` 等），两种模式在 `tokens.css` 里各定义一套；文字对底色的对比度两种模式都要过 4.5（浅色模式的 `--ink-faint` 原来只有 3.0，已改）
- 首页（2026-10-26 和负责人逐条定下，深色、浅色两种模式已同步）：
  - 英文主标题＋中文副标题（中文大标题版试过，负责人选英文）；星图中心放在屏幕横向 30%、纵向 61.8%（黄金分割，按屏幕尺寸算；`?map=top` 看旧排法）
  - 右下角开始提示 “LIGHT UP AND START / 点亮●，开始答题”：英文 8px、中文 10px（负责人要求，低于规范的 12px），两行两端对齐，四角裁切标记；“光点”两个字画成一颗比星图中心暗的小光点
  - 星图动效：只有垂直刻度（二进制 1 和线尾）会发光，是刻度线本身发光，0.6 秒一拍、遇到断点那拍不亮；水平长线常亮，上面一小束柔光 6 秒滑一程；中心的光 5.2 秒一呼一吸，和右下角小光点用脚本对齐到同一起点
  - 点击中心的转场（约 2 秒）：画面以光点为中心推近 6 倍（快-慢节奏、倍数按对数插值），射线沿各自方向退开并变淡、内端渐隐，光晕扩散、边界变模糊，最后淡出进答题页。不要满屏铺色（负责人试过觉得像被闪）
  - 浅色模式像旧书插图：星图线条用较浅的褪色墨色 `--map-line`，星图和文字都加 SVG 滤镜做印刷痕迹（`#inked` 星图、`#inkText` 标题、`#inkTextSm` 小字更轻），深色模式不加
  - 英文字体 2026-10-27 改为 Source Serif 4（替换 Libre Baskerville；`tokens.css` 的 `--font-en`、`--font-body`）；首页大标题用 Bold＋固定展示设计尺寸 `opsz 60`，粗细对比最强。各字体对比见 `docs/前端/样张/字体对比.html`
  - 发光元素的颜色两种模式分开定（`--core-1/2/3`、`--halo-c`、`--bulb`、`--gc`、`--streak-c` 等）：浅色纸上用更深的琥珀色、中心光放大 1.6 倍，否则看不出“亮”

安全审查（2026-10-26）：结论见 `docs/security-audit.md`，未发现恶意项目；需提醒用户的情况写在 `data/safety_notes.json`，normalize 写入各项目的 `safety_note`（推荐结果页要显示）。新增项目也要查一遍；akephalos 因仓库 404 已移除。

多智能体记忆（2026-10-26，负责人要求补收评测好或 Star 多的）：旧规则 F5“多智能体不面向个人用户”不再一刀切排除。已改为纳入：Cognee、MIRIX、Memanto、PowerMem、deja、agentmemory、Caura，新增 Memorix、A-MEM（见 `candidate_review.py` 第 6 批 `NEW`）。Cipher 因仓库已归档、许可证 Elastic 2.0 排除。负责人 2026-10-26 同意调整 F5：评测突出或 Star 多的例外，其余多智能体项目（Star 均不足 20，无评测）仍排除。这 9 项已于同日逐项对照 README 核实（记在 `data/readme_verification.json`；MIRIX 现在的上手方式是 Docker＋Python 客户端，归开发者向；A-MEM 的 1003 Star 仓库只是论文复现代码，可用的库是 WujiangXu/A-mem-sys）；安全审查见 `docs/security-audit.md` 末节。

AI Companion Atlas 站点复核（2026-10-27，负责人要求）：站点上“记忆”标签的条目与原表 50 项一致，没有新增；对约 24 个站点更新日期较新的项目重跑了 `check_health --only`，并按 README／CHANGELOG 复核字段（改动记在 `readme_verification.json`，备注以“2026-10-27 复核”开头）。另从未打记忆标签的条目里新增 LumiMuse（有完整记忆系统）和 Shared Diary MCP（负责人指定，是共写日记而非自动记忆库；2026-10-28 负责人确认它没有按相关度召回，定位改为 `memory_component`，并给所有记忆部件加了 -2 分的推荐偏好，因为它条件宽、在随机答卷里约 15% 进前 8）；排除 WakeTrace（明说不建记忆库）、Wake Bridge（自称无记忆系统）、Villa Bridge（只做会话桥接）、MIRROW（需宿主的组件，记忆库未公开）。站点首页写“180 个项目”，页面实际约 224 张卡片，数字对不上。

多模态召回字段 `media_recall`（2026-10-26，负责人要求）：值 `image`／`audio`／`video`（可多选）或 `not_mentioned`。标准：系统自己保管原图／原音频／原视频（或直接给原件做向量），召回时能把原件交回；只把图片、语音、视频转成文字（描述、转写、OCR）再存文字的不算，哪怕留了文件路径或链接。与旧特性 `multimodal` 不同，后者命中范围宽（生图、读图都算），不要混用。规则不自动判定，全靠 `readme_verification.json` 里逐项核实：先用 scratchpad 脚本扫 README 里“媒体词＋记忆词”的行，再对命中项克隆仓库看代码和文档。没命中的项目按未提及处理，所以是“已知有”的下限，漏网项目要在以后复核时补。已核实有的 12 个，核实后判为只转文字的 14 个（备注里写了原因）。问卷第 8a 题用它加分（2026-10-26）。

多智能体共用字段 `multi_agent`（2026-10-26，为问卷第 4a 题新增）：值 `shared`（写明几个不同的 Agent 或工具读写同一份记忆）、`per_agent`（能给每个 Agent 分开记忆空间或权限，只共享一部分），可两者都有，或 `not_mentioned`。同一个 Agent 换设备不算（那是 `cross_client`），项目内部由几个子智能体分管记忆（如 MIRIX、agent-zero 的子 agent）也不算；`namespace` 只按项目或用户分的不算 `per_agent`。和 `media_recall` 一样只靠逐项核实：扫 README 里多 agent、共享、agent_id、namespace 等词，逐条看原文判断。写明几个 Agent 共用、原来 `cross_client` 是“未提及”的 10 个顺手改成了 yes。结果：共用 64 个、能分开 29 个。

额外花费字段 `spend`＋`spend_note`（2026-10-28，负责人要求）：与粗分三档的 `cost`（问卷预算题在用，没动）不同，`spend` 可多选，说明具体花在哪：`none`、`model_api`（自备模型／向量接口，按量付费）、`subscription`（已有的付费订阅，如 Claude Pro）、`hosting`（服务器、云平台、租 GPU）、`product_fee`（项目本身收费，目前没有项目属于此类）。**只统计强制花销**（不付就用不了的，负责人 2026-10-28 要求）：付费托管版、云部署的收费档位（如 Render Starter）、赞助等可选花销不进 `spend`，写在 `spend_note` 的“可选花销，不付也能用：”后面，数据里是 `data/spend_review.json` 的 `optional`。`spend_note` 是给用户看的一句话，项目只要需要另付接口或订阅等就以“需要一些额外花销来搭配这个项目”开头，含 README 写明的金额。逐项核实写在 `data/spend_review.json`（41 个：全部有托管版或收费线索的项目、订阅类、租 GPU、几个费用原文未识别的）；没列入的按“需要的账号”和 `cost` 自动推出，状态为 auto，其中收费情况没有逐项看过。金额只写 README 写明的，没写的注“README 没写，以官网为准”；Mem0 的价格是 Mengram README 对比表里的二手信息。`python -X utf8 scripts/spend_report.py` 生成 `docs/spend-report.md`。新增项目要查一遍定价线索再决定；myco、cosmos-mcp 两个仍是 unknown。预算题还没接 `spend`（改题目要先问负责人）。

笔记软件当记忆（2026-10-28，负责人同意；负责人定：和记忆库一起排名，不单独列、不给优先级——它自动化程度低，而且用户可能正是嫌它不好用才来换）：
- 两条“做法”条目，没有代码仓库：`method-note-vault`（本地 Markdown 笔记库，Obsidian、Logseq 等，Agent 直接读写或 Claude 桌面版用官方 Filesystem MCP）、`method-notion`（Notion 官方托管远程 MCP）。定义在 `candidate_review.py` 的 `METHODS`（id 在 `METHOD_IDS`，链接在 `METHOD_URLS`），分组代码 `M`，类别“做法（笔记软件当记忆）”；`method-note-vault` 的链接是给用户看的说明 `docs/做法/笔记软件当记忆.md`（含读写规则模板，称“您”）
- 6 个笔记软件连接器作为它的部件（`NEW` 第 8 批，类别“笔记软件连接器”）：Obsidian 4 个（MCPVault、cyanheads、MarkusPfundstein、smith-and-web 可远程）、Logseq、Anytype（官方）。思源（PurpleLiu）、Joplin 收入后负责人决定去掉：笔记软件本身由个人运营的不考虑（Joplin 由作者一人主导）。结果页列出全部通过筛选的连接器，按 `RELATED` 里的顺序（Obsidian 在前），不按分数、不限个数。原来按 F3 排除；只收能写入、在维护的。不收的和原因写在第 8 批的注释里（flomo 只能写、飞书一年多没更新、Apple Notes 停更、TriliumNext 原型、思源两个都去掉、Notion 本地版已不维护）
- `project_role` 新增 `method`、`note_connector`；做法和记忆库一起在 results 里排名（实测排在第 46–59 名），带 `parts`：通过筛选的连接器（来自 `RELATED`）；连接器不单独进 results、addons、combos。测试见 `tests/engine.test.js` 末尾
- `check_health` 对分组 `M` 记 `status=method`、不联网检查；`decide_inclusion` 因此不会按“无法获取代码”排除它们
- 自动规则对连接器误伤严重（笔记软件的 API token 被当成模型密钥→判成要付模型费；整理笔记→离线整理；OCR 文字→多模态），全部靠 `readme_verification.json` 改正；每个都有安全备注（AI 能删改笔记，先备份）
- 第 3 题“遥控电脑上的 Agent”原来要求 `runs_on` 含 `own_computer`，Notion 这类托管服务因此被排除；负责人 2026-10-28 放宽：用这类 Agent 的人一定有电脑，运行位置只看第 5 题
- 第 5 题没勾托管的用户也保留“Notion 当记忆”（负责人 2026-10-28：Notion 不是记忆库项目方、内容由用户自己写、是大公司），附提醒；实现是题目 `unless_project` 改成数组、排除规则加 `unless_project`、“按自己部署的方式用”的提示加 `note_unless`。放宽建议同时改为：单条放宽后仍少于 `min_results` 个也试两条组合（否则“只想点几下”的 Claude App 用户只会看到“注册账号就有 Notion”）
- 第 7 题（配置 id 是 `q6`）新增选项 `notes`“连接 Obsidian、Notion 等笔记类软件”（负责人在文字稿里加的）：记忆存成 Markdown 文件（`human_review` 含 `files` 且 `export` 含 `markdown`）的记忆库加 2 分，做法本身不加（`unless`）。负责人 2026-10-28 定：做法不提前、不单独列，Markdown 记忆库可以优先

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
- **SVG 放大不要用 CSS `transform: scale()`**：浏览器会把画面当图片拉大，线条变糊。要清晰就逐帧改 SVG 的 `viewBox`（矢量重画）
- **径向渐变默认按方块对角线算百分比**（`farthest-corner`），比圆的半径大约 1.4 倍；按圆半径算要写 `closest-side`，否则尺寸算错、光晕还会被圆边切出一道硬边
- **无界面 Edge 截不准动画**：窗口最小宽度约 500px（要看手机宽度就套一个 390px 的 iframe）；CSS 过渡和 requestAnimationFrame 的时间推进不可靠，几张截图常是同一帧；共用浏览器配置目录会让页面没渲染出来（3173 字节的纯色图）。看动画的中间状态要在测试副本里把进度写死（或暂停 CSS 动画、手动设 `currentTime`），每张图用独立的 `--user-data-dir`；测试副本放进样张目录才能读到相对路径的资源，截完删掉
- **芥末黄和深色底直接混色会发灰发绿**（sRGB 混色），要的暖色单独指定色值
- **import_projects 之后要跑两遍 normalize**：规则会读 `info.summary`，而 normalize 会把核实时改写的简介写进去。导入把简介重置成原文，第一遍按原文判、第二遍按改写简介判，2026-10-28 实测有 7 个项目的自动判定值因此来回变（supermemory、eventide、drivesoid 等）。仓库里的数据对应“跑两遍”的结果；以后想根治，要让规则只读原始说明
- **箭头图标掉到文字基线上**：`<span class="chev">` 里放 SVG，外框和文字居中了，图标却按行内元素落在基线上，比文字中线低 6px（2026-10-28 结果页“为什么是这些”）。图标容器要 `display: flex`、SVG 要 `display: block`。核对对齐别只看截图，用一个同源测量页把结果页放进 iframe，`getBoundingClientRect` 量出文字和图标的中线再比
- **JS 字符串里混进中文弯引号 `“”` 整页就白了**：2026-10-28 结果页一直停在“正在挑选”，原因是 `result-text.js` 和 `result.html` 里把 `"q8"`、`join("、")` 写成了弯引号，模块解析失败。`npm test` 只跑引擎，查不出页面脚本的语法错误；改完页面要用 `node --check` 检查 `site/assets/*.js`，并把 `result.html` 里的 `<script type="module">` 抽出来同样检查
- **用 heredoc 写含反斜杠的正则会被吃掉转义**，2026-10-24 又把 dimension_rules.py 写坏一次。含 `\n`、`\d` 的改动一律用 Edit 工具。
