# CLAUDE.md

个人记忆库推荐网站。路线图见 [ROADMAP.md](ROADMAP.md)，按阶段执行，标【停下来等确认】处必须等负责人审核。暂缓的待办记在 ROADMAP.md 第七节（2026-10-30 起先改前端）。

## 目录

2026-11-02 整理过一次（负责人要求）：新前端样张集中在 `demos/`，试验品进 `demos/experiments/`；脚本生成的报告归到 `docs/报告/`；旧版前端资料归到 `docs/前端/旧版/`；句子数据移到 `data/`。新加文件按下面的分法放，不要散在根目录。

```
（根目录）           README.md、ROADMAP.md、CLAUDE.md、package.json
                     记忆库推荐问卷 v6.md、记忆库推荐问卷 v6 文字稿.md（负责人在这里改题，留在根目录）
data/
  projects/<id>.json 每个项目一个文件，结构见 schema/project.schema.json；raw 保存各来源原文，不要改
  schema/            数据结构定义
  questionnaire/     网站读的问卷配置 questions.json
  candidates/        候选表 个人记忆库候选表.xlsx（脚本生成，不要手改）、repo_meta.json
  hourglass-sentences.json  首页沙漏的句子（负责人维护，keywords 是能通过瓶颈的词）
  *.json             人工核对的数据：readme_verification、normalization_overrides、safety_notes、spend_review、
                     token_usage、usage_form、display_names、display_summaries；可调设置 settings.json
engine/              推荐引擎（浏览器和 Node 都能跑）
tests/               引擎和虚构用户的自动测试
scripts/             导入、规范化、检查、推荐、打包网站数据、本地预览、首页字体子集等脚本；prototype/ 是早期原型，只作参考
site/                正式网站（还是旧版前端，等新样张定稿后替换）；site/data/ 由脚本生成，不进 git
demos/               新前端样张
  home.html          首页，黑白版（字母沙漏，圆底玻璃泡）
  home-blue.html、quiz-blue.html     蓝色主题的首页和问卷页；首页和 home.html 的沙漏代码完全一样，只差颜色、字体和入口链接
  home-blue-glass.html  蓝色版首页的试验：沙漏形状按玻璃沙漏参考图，上下泡一样大（只改了几何，不和 home.html 同步）
  fonts-compare.html 字体对比：Cormorant Garamond、Inter、IBM Plex Mono、Source Serif 4 四种方案排同样的内容
  quiz.html          问卷页
  catalog.html、about.html   项目目录页、关于页（占位）
  site.css、drawer.js、fonts/   共用的样式、抽屉脚本、首页中文子集字体
  experiments/       不再使用、留作备查：hourglass.html（最早的单词沙漏演示）、home-words.html（单词版首页）
docs/
  questionnaire-format.md   问卷配置格式说明
  报告/              脚本生成的报告：health-report、inclusion-report、review-normalization（.md/.xlsx）、spend-report、
                     阶段4-推荐测试报告；人工写的 security-audit、推荐结果示例
  前端/              页面清单、风格简报模板、结果页文档（内容草稿、模拟、LLM 提示词）、首页与答题页需求（负责人写）
    旧版/            已作废的旧版前端：旧版前端记录、网站风格简报v1、样张/、参考图/，只作历史参考
  历史问卷/          问卷 v1–v5（不再修改）
  做法/              给用户看的说明（笔记软件当记忆）
sources/
  snapshots/         来源清单的 README 快照（2026-10-10；2026-10-24 补充 awesome-ai-companion、上下文工程、RAG、酒馆插件合集），生成脚本从这里解析
  负责人材料/        负责人给的原始材料，只读：记忆框架开源情况.xlsx、独立事实记忆层_使用流程.md
server/、deploy/     推荐入口的接收服务、部署配置（待建）
cache/               下载的 README 和仓库缓存（不进 git，可重新生成）
.claude/skills/      项目 skill：zh-web-typography（中文排版）
```

- `scripts/candidate_review.py` 人工筛选结论（改结论改这里）；负责人对各分组的决定写在其中的 `GROUP_POLICY`；`scripts/build_candidates.py` 生成候选表

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
- `python -X utf8 scripts/normalize.py` 写入各项目的 `normalized`，生成 `docs/报告/review-normalization.md/.xlsx`
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
- 正式问卷是负责人维护的 `记忆库推荐问卷 v6.md`（20 题＋第 3a、3b、3c 追问，第 8 题按第 7 题分两个版本；负责人改题在根目录的 `记忆库推荐问卷 v6 文字稿.md` 上进行，由配置导出、改完后同步回配置和 v6。题号只是显示用：配置里调换或插入题目时不改原有 id，用 `number` 字段设显示题号（如第 6、7 题对调后 `q7` 显示为 6；2026-10-28 删去原第 12 题“记忆要马上能用吗”（id `q12`），维护意愿题 `q12m` 显示为 12，`q13`–`q17` 显示题号和 id 相同；2026-10-30 新增 token 用量题 `q18t`，随后负责人删去预算题 `q18`，`q18t` 显示为 18，`q19`、`q20` 显示题号和 id 相同）；负责人 2026-10-28 在文字稿上逐题改定，正文由配置导出）。旧版问卷（v1–v5，以及 v6 的底稿“v5 文字稿”）放在 `docs/历史问卷/`，不再改；网站读的配置是 `data/questionnaire/questions.json`，两者要保持一致，改题目先问负责人
- v6 配置的题号：第 1 题是设备（id `q1`）、第 2 题是 LLM 厂商（`q2`），和 v5 对调；第 8 题两个版本是 `q8`（用过的）和 `q8n`（没用过的），配置里用 `"number": "8"` 让页面显示同一个题号；原 q8a→q9，q9＋q12→q10，q10→q11，q11→q12。预算题 `q18` 已于 2026-10-30 按负责人要求删去，花销不再作为硬条件，只在结果卡片上写 `spend_note`；放宽建议改为单条放宽排在两条组合前面（原来按能多出几个排序，删去预算后组合挤掉了“注册 GitHub 账号”这类只需一步的建议）
- 配置格式（条件、作用、合并方式、选项失效、放宽建议、加分、补充部件）见 `docs/questionnaire-format.md`
- 推荐引擎在 `engine/`（JavaScript ES 模块，无依赖，浏览器和 Node 都能跑）：`rule-engine.js` 是规则实现，`index.js` 写明统一接口（换外部模型时另写一个实现即可），`load-node.js` 给测试和命令行加载数据
- 命令：`npm test`（10 个虚构用户＋引擎测试，用户和期望在 `tests/personas.mjs`）；`npm run report` 生成 `docs/报告/阶段4-推荐测试报告.md`；`node scripts/recommend.mjs 答卷.json` 跑单份答卷
- 改了问卷配置、字段或规则后都要跑 `npm test`；测试失败时先判断是期望写错还是推荐变差，别为了通过而改期望
- `scripts/prototype/` 是正式引擎之前的 Python 原型，只作参考；`docs/报告/推荐结果示例.md` 是原型阶段的模拟记录
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
- `python -X utf8 scripts/check_health.py [--resume|--only a,b]` 写入各项目 `health`，生成 `docs/报告/health-report.md`；网络故障记 `status=error`，用 `--resume` 续跑；检查逻辑改动时把 `CHECKER_VERSION` 加 1
- `python -X utf8 scripts/decide_inclusion.py` 写入 `inclusion`，生成 `docs/报告/inclusion-report.md`（之后停下等负责人审核）
- 可调设置在 `data/settings.json`（停更天数等）
- 负责人 2026-10-28 定：教程（`project_role` = `guide`）和上下文工具（`context_tool`）写完就用，不提示“超过 N 天没有提交”（`decide_inclusion.py` 的 `FINISHED_ROLES`）。`project_role` 是单值字段，值是字符串，别用 `set()` 去套

阶段 5（前端）：
- **2026-10-30 负责人决定前端全部推翻重做**（拟物风格太难做）。旧版的视觉风格、动效、组件造型、配色字体全部作废，原来的定稿记录移到 `docs/前端/旧版/旧版前端记录.md`，只作历史参考，不要沿用。新风格先和负责人确认方向、做样张，再改正式页面。下面是新前端仍要遵守的
- `docs/前端/` 放页面清单（`页面清单.md`）、风格简报模板（`风格简报模板.md`）、结果页的内容文档（`结果页内容草稿.md`、`结果页模拟.md`、`结果页LLM提示词.md`）和负责人写的 `首页与答题页需求.md`。旧版风格的 `网站风格简报v1.md`、`样张/`、`参考图/` 在 `docs/前端/旧版/`（参考图里有三张一直没进 git 的旅行者号轨道线稿、土星环标注图，负责人确认是旧版用的，新版不参考）
- Codex 做的浅色气泡问卷样张（2026-10-30 负责人定：不参考它的设计，但要留着）不在主分支：放在分支 `codex-bubble-prototype`，并用 git worktree 检出在仓库旁边的 `../记忆库推荐-codex样张/generated-codex-bubble-questionnaire/`（截图、字体源文件、浏览器临时配置也搬到了那里，不进 git）。它带一份引擎和项目数据的旧快照，不随数据更新。改正式页面不要读它；不再需要时 `git worktree remove` 再删分支
- **正式网站在 `site/`**：现有 `index.html` 首页、`quiz.html` 答题页、`result.html` 结果页、`assets/` 下的样式和脚本都是旧版，重做时可以整体重写；`assets/result-text.js` 里生成推荐文字的规则（“相比其它几个”、改进建议、搭配方案说明、`splitName`）和页面风格无关，新页面可以直接复用
- 预览：`npm run site` 后打开 http://localhost:5173/site/ （网站要 fetch `data/` 下的问卷配置、import `engine/`，直接双击 html 打不开）
- 结果页在浏览器里跑推荐引擎，项目数据由 `node scripts/build_site_data.mjs` 打包成 `site/data/projects.json`（不进仓库，`npm run site` 会先打包；只留 value、status，结果和完整数据一致）。打包时带上项目顶层的 `safety_note`（只留文字），按 `data/display_names.json` 换显示名、按 `data/display_summaries.json` 换简介（原始数据不改）。改了项目数据要重新打包
- 引擎给页面的接口：`recommend(answers, projects, { free })`（第 7 题的填空由页面传进去），返回 `results`（前 top_n 个）、`more`（其余也通过筛选的）、`combos`、`addons`、`guides`、`relax`、`excluded` 等；另导出 `checkCondition`（跳题、默认勾选，和推荐同一套判断）、`findConflicts`、`projectMatches`（改进建议里“推荐里做到的”用第 8 题的加分规则判断，只看 1 分以上的规则）
- 前后矛盾提示（2026-10-28）：`findConflicts` 来自配置里选项的 `disables`（带 `note` 说明原因），2026-10-30 删去预算题后配置里已没有 `disables`，机制保留；负责人要求答题页只写“与历史选项互斥”／“部分互斥”＋“去第 N 题修改”，被排斥的选项标“互斥”，改完能直接回到出发的那道题；结果页概况里显示完整原因。已选选项全部失效时这道题照样筛选（占位值 `__disabled__`），以前会被当成没回答而不限运行位置。另有只提示、不改变筛选的前后矛盾，写在配置顶层的 `warnings`（本地 LLM 却没电脑、遥控 Agent 却要“点几下”或只选手机、接受托管却没勾项目方账号）
- 答题页完全按 `data/questionnaire/questions.json` 渲染：题目分属哪个部分写在配置的 `parts`；跳题 `show_if`、默认勾选 `default_if` 用引擎导出的 `checkCondition`；进度按当前要答的题数算（追问没触发就不算）；显示题号用题目的 `number`，没有时用 id 里的数字；选项说明里的 `\n` 显示为换行；带说明小字的填空选项选中后出现输入框。答卷存在 `localStorage` 的 `memsite-quiz-v3`（v6 改了题号，所以从 v1 升到 v2；2026-10-30 删去预算题和第 3、7 题各一个选项，升到 v3；以后删题、删选项或改题号都要升级，读写答卷的页面要一起改）（`answers` 是选项 id 数组，填空在 `free["题号.选项"]`）
- 结果页内容结构（2026-10-28 负责人定，草稿 `docs/前端/结果页内容草稿.md`、两位用户的模拟 `docs/前端/结果页模拟.md`）：概况一行 → 为您挑出的 N 个（前 3 张展开、其余折叠；每张：名字＋使用方式标签、简介、最多 3 条理由、“相比其它几个”一句、门槛、花销 `spend_note`、注意事项含 `safety_note`、仓库链接）→ 搭配方案 → 其余也符合条件的 → 为什么只有这些（收窄范围、前后矛盾、提醒、放宽建议、被排除的）→ 改进建议（所有人都有：用过的读 `q8`、没用过的读 `q8n`，按排序逐条写，附前 8 里做到的项目）＋可以加装的部件和教程 → 页脚三个操作：下载答卷、下载推荐结果（含卡片上的门槛、花销、注意和搭配方案）、返回修改问卷（主操作）。不按问题硬分三组；Machine Studio 等用英文名
- **结果页文字以后由 LLM 生成（待办，等有服务器再做）**：提示词草稿在 `docs/前端/结果页LLM提示词.md`（语言风格以 `docs/前端/结果页模拟.md` 为准，只写数据里有的）。引擎仍决定推荐哪些、怎么排，LLM 只写三处——每个项目的“相比其它几个”、改进建议和搭配方案的说明。流程：浏览器跑引擎 → 把答案（附题目原文）、前 8 个项目及其关键字段发给自己的服务器（API Key 不能放浏览器）→ 服务器带 prompt 调 LLM（只许用给出的数据、简洁直白、称“您”，按固定 JSON 返回 `{项目id: 一句话}` 和 `{问题id: 建议}`）→ 页面先显示引擎结果，文字到了再填进去，出错或超时用规则生成的兜底。现在这几处由 `site/assets/result-text.js` 用规则生成，以后 LLM 接进来时只替换这个模块的输出
- 搭配方案（2026-10-28 负责人定，引擎 `buildCombos`）最多两个，每个 2～3 个项目。**只搭真能配合的**：两个独立的记忆库各存各的，一个的整理、遗忘碰不到另一个存的记忆，所以不按环节拼凑，也不拿“针对第 8 题”的另一个记忆库来补。能配合的只有两类：作者设计的一组（`pairs_with`，按数据里写好的顺序，在全部符合条件的项目里找），和记忆库加用户需要的补充部件（情绪引擎、上下文延续工具，来自问卷的 `addons`，每类一个）。第 7 题看出用户正在用某套记忆的，方案一在他现在用的上面补（填了名字的补搭配或部件；笔记软件优先补存成 Markdown 的记忆库；客户端自带记忆补一个记忆库，这两种分工不同，不需要共用记忆），方案二给新方案；没在用的，方案一是完整系统加搭配或部件，方案二是作者设计的一组或记忆库加部件。认法：选“开源的记忆项目”并填了名字的（2026-10-30 负责人删去了第 7 题的“用过其它类型的记忆项目”），按名字对收录的项目，填的内容按顿号逗号拆开逐个对，短名字要完全一样；其次是笔记软件，再次是客户端自带记忆；名字对不上的按没在用处理。第 7 题的填空由页面以 `recommend(answers, projects, { free })` 传给引擎。页面写法：每个方案三段——分工（句首点出胜过另一个方案的地方，`comboEdge`；比另一个少了环节时句末说明）、为什么合起来比单独用好（`comboWhy`）、配合程度（`comboFit`：作者设计的一组为高，分工不同的为较好，部件说明里没写能否和别的项目一起用的为需自行确认，客户端自带记忆为一般）。对比是双向的，两边都说得出胜过对方的地方才给方案二，否则只留方案一，不编号、不写对比；按排名得出的理由太弱，不算。用户在用的项目标“您在用”。2026-10-30 起补充部件按使用方式 `usage_form` 排除装不到一起的（`buildCombos` 里的 `clash`）：一个方案最多一个转发服务（消息只经过一个）、最多一个自带聊天界面的应用；聊天软件插件不和自带界面的应用、Agent 插件搭，两个聊天软件插件要同一宿主。作者设计的一组不查。找不到装得到一起的部件就不给这个方案，1500 份随机答卷里少了 12 个方案、原来装不到一起的 25 个变成 0。每个部件带 `forms`，以后页面可写“怎么装”
- 结果页文字不用括号（负责人 2026-10-28）：项目名里的括号部分（作者、旧名）在页面上拆成名字后面的浅色小字（`result-text.js` 的 `splitName`），类别用 `result.html` 的 `catText` 换说法；数据里的简介、花销说明模板（`normalize.py` 的 `SPEND_PHRASE`）、安全提醒、问卷的 `note`／`reason`／门槛标签都已改写成正常语序。以后新写的给用户看的文字也不要用括号，措辞简洁、书面。概况固定写“为您挑出 N 个记忆库／筛选的硬条件：可用设备、所用 LLM／Agent。／筛选的软条件：对记忆生成、演化、检索的偏好。／项目描述基于 README 生成，核实于 2026 年 10 月”；“为什么是这些”写“该选项排除了 N 个项目”；“相比其它几个”的比较里安装门槛和花销排在最后（变化大，不宜作主要区别）
- **结果页文字的语言风格以 `docs/前端/结果页模拟.md` 为准（负责人 2026-10-28 定），不参考 humanizer-zh**。同日试过参考 humanizer-zh 把推荐理由、注意事项、花销说明、安全提醒、简介里的术语全部换成白话（向量检索→按意思搜索、自托管→装在自己的电脑或服务器上、召回→想起），负责人看过后要求整体回退：能说明项目特点的专业名词要保留（向量检索和 BM25 是两种检索方式，都写成“搜索”就分不出来）；白话说法反而有歧义（“外网”分不清是公网还是国外的网络，“核心设定”说不清是什么）。另外：同一句话里主语不变，可能有歧义时不省略主语；一句话说完就用句号。项目简介按这个风格重写，存在 `data/display_summaries.json`，只在 `build_site_data.mjs` 打包网站数据时替换 `info.summary`，规则判定和测试仍读原始简介，改它不影响推荐。写法规则见 `docs/前端/结果页LLM提示词.md` 的“项目简介的写法”；新增项目要在这里补一条
- **使用方式字段 `usage_form`（负责人 2026-10-28 同意新增）**：回答“用户怎么用上这个项目”，可多选、第一个是主要方式，值有聊天软件插件、Agent 插件、独立服务、转发服务、自带聊天界面的应用、独立应用、聊天机器人、命令行工具、开发者代码包、教程或文档、做法、模型（定义见 schema）。核对值在 `data/usage_form.json`，normalize 写进 `normalized.usage_form`；没列入的新项目按 `access` 推出初值、状态 auto，核对后补进文件，补时遇到新形态可以加新值。结果页上作为名字旁边的标签显示（最多两种，聊天软件插件只接一种软件时写“酒馆插件”这类），简介开头不再重复写“……的程序”。推荐规则不读它，旧的 `access` 字段仍给规则用、没改；搭配方案可以读它
- 已装的设计和动效 skill：impeccable、web-design-guidelines、frontend-design、GSAP 官方 8 个（gsap-core、gsap-timeline、gsap-scrolltrigger、gsap-react 等，MIT，装在用户目录）、color-expert（meodai，CC BY 4.0，配色原理：按性格配色、60-30-10、明度差决定可读性；配色时用它，颜色在 OKLCH 里推导并算 WCAG 对比度）。Lenis、Vanta、React Bits 没有靠谱的 skill，用时看官方文档
- 中文排版与文案参数以项目 skill `.claude/skills/zh-web-typography/SKILL.md` 为准（据 clreq、赫蹏、中文文案排版指北），英文设计 skill（impeccable、frontend-design）给的字号行高与之冲突时按它
- 每页完成后用 web-design-guidelines 审一遍
- 负责人 2026-10-25 定：网站称呼用户统一用“您”；全站不使用 emoji（要图形提示用 SVG 线条图标）。例外：首页用“你”（负责人 2026-10-30 定，新首页沿用旧首页的做法）
- 新前端只做浅色一种配色（负责人 2026-10-30 定）；组件仍只引用语义变量，以后加深色模式时每种模式文字对底色的对比度都要过 4.5
- 文字沙漏动效演示（2026-11-01，负责人要求，独立单文件）：`demos/experiments/hourglass.html`（2026-11-02 起不再使用），Matter.js（cdnjs 0.20.0）＋Canvas，可调参数集中在文件开头的 `CONFIG`，句子抄自 `data/hourglass-sentences.json`，写在页面里（方括号标能通过的词）；网址加 `?debug` 画出看不见的墙。负责人要的效果：一句话是一条软带子，被瓶颈按顺序吃掉（从离瓶颈最近的词开始，先往左吃到句首、再往右吃到句尾；强求从第一个词吃起，整句会被拽得弹起来），普通词在通道口逐个字母被吃掉（`drawEaten`：字母越过瓶颈口往下一点的那条线就淡掉，线的位置是 `eatLine`；放在瓶颈口正上会和词堆混在一起看不出来；斜着进去被强制吃完时，露在外面的字母原地 0.25 秒淡掉，`crumbs`），关键词顺着流下去、竖着出通道后随意翻落；长词要软。做法：每个词按约 3～4 个字母切成几节（`ribbon.segChars`），节与节之间是铰链加中心弹簧（`ribbon.softness`，越小越软，低于约 0.02 词会折成几截、读不出来），同一个词相邻两节不碰撞；瓶颈用静态塞子堵死，`planSentence` 排好顺序，轮到的那一节改成静态、由程序移进通道（`updateFlow`；往左吃时右端朝下进）：程序只拖它朝前的那一端，另一端顺着拖动方向跟过来，转动限速（`turnRate`），先到瓶颈口正上方再竖直往下，进口时不要求竖直、进去后边走边顺直；按固定速度硬转、或停在口子上等转正，负责人都觉得僵硬，同一个词的下一节紧贴着接上（`follow`），后面的靠约束拖着走；`clampSegs` 把越界的节拉回各自那一半，所以拖动不会破坏过滤。词与词之间的带子只在句子刚落下和正在被吃时拉紧（`updateRibbons`），且以拉紧那一刻的长度为准、不收短（`ribbon.reel` = 0）：收短会把整句往一起拽，被吃之前弹一下（实测平均跳 38px，不收短后约 20px，改成从最近的词吃起后约 16px）；一直拉紧词堆会抖。正在被吃的那一句不碰别的句子（改写 `Detector.canCollide`）。下半部分的旧词褪成淡痕迹（`CONFIG.trace`）撑出轮廓；`trace.clearance` 按整个沙漏高度算，设大了会把正常的堆误判成太高、把痕迹全淡掉。性能：切节后物体变多，墙段数、迭代次数、痕迹上限都调低过，电脑上每步约 1.7 毫秒。测手感前用 Node 加载 matter.min.js 跑同一份脚本模拟（无界面浏览器的时钟不走，截不到动画）
- 新风格方向（2026-10-30）：我提了三个平面方向（技术手册线稿、编辑出版式、清爽工具式），负责人说之后一起讨论，还没定
- 首页和问卷页样张（2026-11-02）：
  - 依据：负责人写的 `docs/前端/首页与答题页需求.md`（原来放在根目录，叫 `prompt-for-claude-code.md`）。2026-11-01 做过一版样张，负责人撤销了，提交是 7983d2c 和撤销它的 b745477，不要沿用那一版。
  - 文件都在 `demos/`，正式网站 `site/` 没动：首页 `home.html`（字母版）、问卷页 `quiz.html`、占位的 `catalog.html` 和 `about.html`、共用的 `site.css` 和 `drawer.js`、`fonts/`。要用 `npm run site` 打开，比如 http://localhost:5173/demos/home.html 。
  - 单词版首页 `demos/experiments/home-words.html`（由最早的沙漏演示复制后改；2026-11-02 改用字母版后不再使用，留作备查。入口、比例、字体、加载、抽屉这些做法字母版沿用）：
    - 入口是沙漏下方的“find yours →”，用 HTML 叠在画布上，位置由 `placeFind` 按沙漏底部算。
    - 沙漏形状（负责人 2026-11-02 改）：上半部分从 V 形改成 U 形（`upperCurve` 2.6），中间通道缩短，上下两半更近；下半部分有自己的高度 `lowerHeight`，不再是“剩下的部分”。
    - 比例和尺寸（负责人 2026-11-02 几经调整后的结果；中途试过黄金比例的版面，负责人觉得不够修长，已改掉，不必拘泥黄金比例）：
      - 沙漏要修长，总高 : 最宽处约 16 : 9，下半部分更宽、更有分量（负责人 2026-11-02 给了截图参考）：上口宽 0.44、底座宽 0.5625，三段高 0.44、0.14、0.42（都是相对沙漏总高 S）。
      - 沙漏总高占屏幕高的 80%（`heightRatio`）。留白的 38% 放在上方，其余在下方（`topShare`）；“find yours →”在下方留白从上往下 42% 处（`findAt`）。屏幕矮于 560px 时改占 84%（`shortHeightRatio`）。
      - 高度定尺寸。宽度放不下时只收窄（`slim`），左右至少留 `sideMargin` 24px；最多收窄到 75%（`minSlender`），再窄才整体缩小。390×844 的手机上，沙漏高约为宽的两倍。
      - 字号不小于 `font.minPx` 12px（`G.fk`）。凡是字号相关的计算都用 `fk`，几何相关的用 `k`。
      - 词数按上半部分的实际面积折算：`G.cap` = 上半部分面积 ÷ fk² ÷ `capRef`，用 `capN()` 折算 `minUpperWords`、`maxLowerWords`、痕迹数等。`capRef` 是调好词数时的基准。上口变窄后，电脑上上半部分约 25～30 个词。
    - 上半部分怎么流（负责人 2026-11-02）：
      - 句子居中显示，松开时离句子中间最近的词先落，两端稍后（`updateActive` 里的 `order`）。
      - 同一句的词之间一直连着一根绳子（`updateRibbons`）：只在被拉得比绳长时拉紧，挤近时完全放松，所以整句不会散，也不会互相顶着发抖。绳长是词距加 2 倍字号（`ribbon.slack`）。
      - 因为整句都要通过瓶颈，吃的顺序用 "sentence"：从离瓶颈最近的词开始，先往左到句首、再往右到句尾；正在被吃的那一句不碰别的句子（`drainSid`）。`planSentence` 按词在句子里的位置 `w.idx` 排序，因为词是从中间开始放进去的。
      - 弹跳：绳子太短（0.6 倍字号）时每帧约 0.55 个词往上弹。绳长加到 2 倍、空气阻力 `flow.upperAir` 加到 0.1 后约 0.28。阻力 0.12 更稳，但词下落最快只有每秒约 155px，太慢。
      - 曾改成“谁离瓶颈最近先吃谁”（`order` = "nearest"，弹得最少），但那样句子会被拆散，现在不用了，代码还留着。试过但没用的：指向瓶颈的“漏斗吸力”、物理迭代次数加到 8。
    - 所有词都通过瓶颈，不再吃掉非关键词（负责人 2026-11-02）：
      - 一节进了通道（`swallow`），就拆成一个个字母（`chute`），竖着排在通道里往下走，越往下越快、彼此拉开（`lower.letterSpread`）。非关键词的字母过了 `eatY` 就变灰（`lower.gray`，`colorOf`）。
      - 字母出了通道（`letterOut`），变成下半部分那个词的一节，每个字母一节；和已经出来的相邻字母用一根松的线连上（`linkLoose`）。
      - 整个词都出来 0.6 秒后，线在 1.2 秒内收紧，字母拼回这个词（`updateLowerWords`）。模拟里收紧后相邻字母的间隙中位数约 0.7px。
      - 非关键词拼好后再停 1.2 秒，然后 1 秒淡出、移除，所以会按通过瓶颈的先后淡出，平均存在约 4 秒。关键词留下，超过上限的褪成痕迹；痕迹改成静止物体，省掉运动计算。
      - 所有词同一个字号（20）、同一个字重（400），负责人觉得随机字重有的词显得更粗。
      - 性能：电脑上每步约 4.5 毫秒。
    - 表面要凹（负责人 2026-11-02 要求：真实沙漏的表面是凹的，像有漩涡）：
      - 原来是凸的，中间比两侧高约 3.7%。根本原因是新句子居中从正上方落下，短句在中间堆出小山。
      - 这一节是上一版（按“谁最近先吃谁”时）的记录。改法一：新句子从两侧补进来。试过一句靠左、一句靠右显示，以及居中显示后受侧向的力斜飘向杯壁，负责人都不要（“被风吹的设计更奇怪”），已删除。句子居中、笔直落下。
      - 改法二：瓶颈正上方一柱里的词摩擦小、多一点向下的力，两侧的词摩擦大（`flow.funnel`，`funnelFlow`）。
      - 只用改法二几乎没用，因为中间沉的速度受瓶颈吃词速度限制，最多压到平。两个改法一起用时中间比两侧低约 5.5%。现在只剩改法二，表面接近平、略凸（-1%），凹的表面要另想不改变句子落法的办法。
      - 测量办法：把上半部分横向分成 7 栏，取每栏最高的词，比较中间栏和第 2、6 栏的高度。同一设置跑两次会差约 1 个百分点。
    - 下半部分（负责人 2026-11-02 觉得头重脚轻）：开场时清楚的词从 12 个加到 18 个，痕迹从 10 个加到 18 个、上限 24 个。
    - 沙漏里的词改用 Cormorant Garamond。原来每个词随机取 300～600 中的一种字重，现在统一为 400。
    - 句子从 `data/hourglass-sentences.json` 读，把每句的 `keywords` 换成方括号格式；读不到时用 `CONFIG.sentences` 里的备用句子。
    - Matter.js 用 `defer` 加载，页面脚本是模块，不挡首屏。
    - CPU 核数不超过 4 的设备，词数上限调低（`CONFIG.lowPower`）。
    - 系统设了减少动态效果时，只画一帧堆好的沙漏。
    - 左上角按钮打开左侧抽屉，负责人 2026-11-02 定抽屉要放说明、项目目录页入口、关于页入口和作者。作者的名字和链接还没给，暂写“待填”。`docs/前端/旧版/网站风格简报v1.md` 已作废，不要参考。
  - 字母版首页 `demos/home.html`（原名 `letters.html`，2026-11-02 整理目录时改名；负责人当天要求另做一版；同日负责人认为单词版怎么调都会弹，决定改用字母版继续改）：
    - 单词版弹起的根源：一个词是几节长条，整句又用绳子串起来，吃的时候要把整句从词堆里拽进瓶颈，长条会撬动周围的词。字母一粒粒的，抽走一个只影响附近几个，所以顺。
    - 句子居中显示，松开时每个词打散成字母。所有字母同一字号（20）；普通字母字重 400，关键词的字母 600（`font.keyWeight`，负责人 2026-11-02 要求），句子显示时和打散后关键词都更醒目。网页字体只加载这两种字重。每个字母是一个物体，物体比字形大一圈（宽加 0.1、高 0.86 个字号），字形不会叠在一起。
    - 离瓶颈口最近的字母先进瓶颈（`pickNearest`），每秒最多 `flowRate` 个，在通道里排成一串。中间一柱摩擦小、多一点向下的力（`funnel`，push 0.4），所以中间先塌，表面凹约 4%～6%。push 0.25 时几乎不凹。
    - 非关键词的字母过了瓶颈口变灰（`gray`），关键词的字母保持黑色。`pass` 改成 "keywords" 时，只有关键词的字母能通过。
    - 下半部分不留痕迹：字母超过 `lowerLetters`，或者堆到离出口 `dissolve.clearance` 以内时，从沙堆最底下的字母开始淡掉、移走（`updateLower`），整堆跟着下沉。
    - 关键词的字母淡出得更晚（负责人 2026-11-02 要求）：漏下来后 `dissolve.keyHold`（20 秒）内不会被选去淡掉，先退它旁边的普通字母；轮到时淡得也慢（`keyTime` 1.6 秒，普通字母 0.8 秒）。开场预置的关键词字母，保留期随机错开。模拟 3 分钟：关键词字母在下面停留从约 11 秒变成约 22 秒，普通字母不变（约 9 秒）；最底下一层里关键词字母从 35% 变成 70%，像沉积下来的一层。
    - 以前有痕迹时出过两个问题：痕迹改成了静止物体，它下面的字母退场后，痕迹悬在空中，上面的字母架在几乎看不见的痕迹上，看起来是空白；静止的痕迹还一路堆到出口，新字母出来挤成一团。改成从底部退场后，悬空的字母从 7.3% 降到 0。
    - 比例：电脑上高 : 宽 = 16 : 9；手机（屏幕宽不超过 600px）上 3 : 2（负责人 2026-11-02 先要求手机也用 16 : 9，看过后改成 3 : 2；`phoneAspect`、`phoneMaxWidth`，上口和底座按同一倍数加宽）。`minSlender` 设为 1，宽度放不下时整体等比缩小，比例不变。390×844 的手机上沙漏高 513px、宽 342px，约占屏幕高的 61%。单词版仍是 0.75，手机上约 2 : 1。电脑上每步约 3.3～4 毫秒，开场准备约 0.6 秒。
    - 模拟时可以量：字母之间的重叠深度（`engine.pairs.list` 的 `collision.depth` ÷ 字号）、悬空比例（下半部分静止的字母正下方 1.6 个字高内有没有别的字母）。
  - 蓝色主题 `demos/home-blue.html`、`demos/quiz-blue.html`（负责人 2026-11-02 定方向）：
    - 来历：先试过普鲁士蓝（墨 `#033351`、纸 `#F6F2EA`，文件原名 `home-prussian.html`）、明亮钴蓝配暖米白（`#0356B4`、`#FAF7EC`）、负责人指定的 `#3588D3` 文字配 `#EFF3F6` 底色（对比度只有 3.35，后来调深、调浅）。负责人觉得蓝色比黑白有特色，但担心问卷全用蓝字不好读、首页蓝问卷黑白又不搭。
    - 现在的做法（负责人 2026-11-02 定）：所有文字都用一种蓝，层次靠字重和记号：首页关键词加粗；问卷页选中的选项加粗、记号填满，没选的不变浅。只有不用细读的地方用浅色（过了瓶颈的普通字母、题数）。CSS 变量多了 `--color-accent`、`--color-light`。
    - 现在的颜色（负责人 2026-11-02 在几套里选定）取自海报参考图（`images/10.jpg`，浅冷灰的纸上印饱和的群青蓝）：纸 `#E0E1E1`、蓝 `#1546EC`（对比度 5.1）、浅蓝 `#89A4DE`（1.9）、题数 `#6584C9`（2.8）、细线 `#C1CBDF`。
    - 试过但没选的蓝色配色：纸 `#F2FAFF` 配蓝 `#1C75BE`（4.6，提交 8ecb371）；纯白配纯 RGB 蓝 `#0000FF`（8.6，辅助色是蓝和白在 OKLab 里混合，提交 22a2a96）。
    - 字体（负责人 2026-11-02 要求换成开源的印刷体，选了打字机等宽；看过 `fonts-compare.html` 的四种方案后确定用它）：英文 IBM Plex Mono，中文思源黑体 Noto Sans SC，都从 Google Fonts 加载 400 和 600，都是 OFL 授权。只在蓝色主题两页的 `:root` 里改 `--font-en`、`--font-zh`，首页画布的 `CONFIG.font.family` 也换了。等宽字体同字号下更大、更宽，沙漏里的字号从 20 降到 17。首页抽屉不再用思源宋体的子集字体。
    - 坑：`--font-en` 里不能写通用的 `monospace`。页面上是 `font-family: var(--font-en), var(--font-zh)`，写了的话中文会先落到系统的等宽中文字体上，字距很松，轮不到后面的思源黑体。
    - 试过但负责人不要的：要读的字用深墨色 `#162D43`、主题蓝只标关键词和选中的答案（提交 b768abe）。
  - 圆底沙漏（负责人 2026-11-02 画了示意图：上下外轮廓改成半圆，下面的玻璃泡要比上面的大）。先做在 `home-round.html` 里，同日负责人要求黑白版和蓝色版完全同步、只差字体，就把它合进了 `home.html`，`home-round.html` 已删除：
    - `halfAt` 改成“竖直的壁＋半圆碗底”：上泡的碗底朝下收进瓶颈，下泡的碗底在最下面，中间最低。半径倍数是 `upperRound`、`lowerRound`（1 是正好半圆；`lowerRound` 后来随下泡改成碗状去掉了）。墙体段数从 14 加到 28，弧线才圆。
    - 比例：上泡宽、高都是 0.40，下泡宽 0.5625、高 0.46，下泡碗底半径约是上泡的 1.4 倍，总体仍是 16 : 9。下泡的字母数从 200 加到 280，否则显得空（字母数是按上泡面积折算的）。
    - 下泡改成碗状（负责人 2026-11-02 给了真沙漏的参考图 `images/15.jpg`：底下不是半圆，是碗状的）：`halfAt` 的下半部分分两段。肩部从瓶颈出口沿三次 Hermite 曲线鼓出去，两端切线竖直，在下泡高度的 `lowerMaxAt`（0.62）处到最宽；再往下用超椭圆收成碗底，指数 `lowerBowl` 2.8（负责人看过 3.2 后改的；2 是正圆，越大底越平、圆角越小）。原来的“竖直的壁＋半圆”和 `lowerRound` 已去掉。缩短上下泡距离时，下泡最矮留 `minLowerHeight` 0.30。
    - 喉部（负责人 2026-11-02 要求把收窄的地方画出来）：上泡的碗底不直接收进瓶颈，先收到上口半宽的 60%（`throatWidth`，原来 45%，负责人要求再宽一点），再在沙漏总高 12% 的一段里（`throatHeight`，原来 8%，负责人要求再长一点）沿三次 Hermite 曲线收到瓶颈宽度。起点的斜率接上碗底，终点竖直进瓶颈；斜率太陡会冲过头，所以限在 2.9 倍落差以内。圆心的位置按“碗底正好在喉部顶上收到 45%”来算。墙体段数加到 40。字母会填进喉部，底部收成一个尖。
    - 电脑上 3 : 2（负责人 2026-11-02 要求，原来 16 : 9）：同样不加宽，按 `desktopTarget` 缩短上下泡之间的距离（瓶颈最短 0.08，再缩下泡顶部空段）。1280×800 上瓶颈 61px。
    - 手机上 4 : 3（负责人 2026-11-02 要求，并指明“不是加宽，是缩短上下泡之间的距离”）：宽度仍按 3 : 2 加宽（`phoneAspect`），再把总高缩到 4 : 3（`phoneTarget`）。先缩瓶颈，最短留 `minNeck` 0.08；不够的再缩下泡顶上那段空着的竖直壁，不碰半圆碗底。390×844 的手机上：高 456px、宽 342px，瓶颈 41px。
    - 坑：瓶颈不能太短。模拟里瓶颈 0.08（41px）时每秒约 9 个字母通过，0.06 时 7.5 个，0.03（15px）时只剩 5.5 个。原因是瓶颈短了，口子附近存不住字母，被选中的字母离瓶颈口平均从 5.6px 变成 19.4px，送下一个字母要等前一个走完这段路。量流量要数瓶颈出口出来的字母（`letters_sim.cjs` 的 through/s 把开场预置的字母也算进去了，不准）。
    - 上泡开场时的字母也一层层铺（负责人 2026-11-02 要求上泡多一些字母勾出玻璃泡的形状，又说“不一定要堆高，可以铺得更多”）：从瓶颈口往上，每层按那个高度的玻璃泡宽度从左排到右，喉部最窄处只放中间一个，排满 `upperLetters` 个为止。字母贴着喉部、圆底和侧壁，一开场就勾出上泡的轮廓；之后中间先漏，表面凹下去，两侧留得久。`upperLetters` 从 200 加到 280。试过 420，堆得很高，手机上每步超过 9 毫秒，太慢。开场取字母的小函数是 `pickChar`，上下泡共用。
    - 下泡开场时的字母一层层铺在碗底（负责人 2026-11-02：字母聚在中间，看不出下泡的宽度）：从最底下开始，每层按那个高度的碗宽从左排到右，排满再往上铺，最后让物理跑 120 步落定。原来是从上面随机落下，圆底又滑，全滑到中间堆成小山。之后底部退场先退最低处，也就是碗底中间的字母，两侧较高的字母留得久，宽度一直看得出来。
    - 墙面改滑（摩擦 0.02），但物理引擎的静摩擦取接触双方里较大的（字母是 0.9），字母还是会停在陡的弧面上，墙看不见，就像悬着。所以贴着下泡侧壁 2.5 个字高以内、几乎不动的字母，每帧往中间、往下推一点（`wallSlide` 0.6 倍重力），顺着弧面滑进沙堆。
  - 深色模式（`home-dark.html`、`quiz-dark.html`）和紫色主题（`home-purple.html`、`quiz-purple.html`）：负责人 2026-11-02 宣布作废，文件已删除。要找回，深色版见提交 6d19a10，紫色版见提交 134f015。
    - 黑白版 `home.html` 和蓝色版 `home-blue.html` 的沙漏完全同步（负责人 2026-11-02 要求“两者唯一的差别是字体不同”）：两个文件的代码一行不差，只差颜色（配色变量、CONFIG 的 `colors`、`gray`、`a.find` 的颜色）、字体（字体链接、字体变量、抽屉字体、`font.family`、字号）和入口链接（`quiz.html`／`quiz-blue.html`）。字号黑白 20、蓝色 17：等宽字体同字号下更大、更宽，17 的 Plex Mono 和 20 的 Cormorant 看起来差不多大；沙漏的尺寸、比例、玻璃泡、喉部、字母数量都不受字号影响。画字母和显示句子都按 `colors.accent` 给关键词上色，黑白版的 `accent` 是黑色。以后改沙漏，两个文件要一起改；改完用 `diff demos/home.html demos/home-blue.html` 核对，只应剩颜色、字体和链接。
    - 玻璃沙漏版 `demos/home-blue-glass.html`（负责人 2026-11-02 要求另建一个文件试）：由 `home-blue.html` 复制，只换了几何部分（比例参数、`computeGeometry`、`halfAt`），其余代码相同。轮廓不再用公式，而是从参考图 `images/15.jpg` 上量的点（`upperShape`、`lowerShape`：[在泡里的高度位置, 半宽 ÷ 这个泡最宽处的半宽]），用单调三次插值 `smoothAt` 连成平滑曲线：上泡圆肩、0.25 处最宽、一路收窄；下泡 0.72 处最宽，平底宽为最宽处的 55%。上泡顶口留到 0.86 让句子落进来，句子按顶口宽度折行。喉部（负责人要求画出来）：靠近瓶颈的一段越收越缓，像喇叭口，最后竖直接进瓶颈，字母填进去就看得出收窄；下泡出口同样是喇叭口。只靠形状点里最后几个点的间距控制，第一版收得太直，字母在瓶颈口挤成一个尖，看不出喉部。比例（负责人要求）：上泡 : 下泡 = 1 : 1.08（`lowerScale`，宽和高都是），电脑上高 : 最宽处 3 : 2、手机上 4 : 3（`desktopAspect`、`phoneAspect`）。瓶颈固定 0.08，两个泡按比例压矮、加宽，形状点不变；第一版试过 1 : 1.2、高约为宽的两倍。模拟：手机每秒约 9 个字母通过瓶颈，电脑约 12 个；电脑上泡更大，字母数按面积折算到约 186 个，每步约 9.8 毫秒，比 `home-blue.html`（约 5 毫秒）慢一倍。手机上上泡收窄到屏幕宽的一半（`phoneUpperOfScreen` 0.5，负责人要求试），高度照 4 : 3 算出来不变，下泡按 1.08 跟着变，所以手机上高约为宽的 2.2 倍；390×844 上上泡 195px，开场约 84 个字母，每步约 3.7 毫秒，每秒约 9 个字母通过瓶颈。之后负责人要求上泡和下泡一样大（`upperMatchesLower`）：下泡照 1 : 1.08 那版完全不动，上泡放大到和下泡一样宽、一样高，往上长出去，形状不变。试过两种不要的：保持下泡、放大上泡并加深碗底（2fe9676）；只把 `lowerScale` 改成 1，结果是下泡缩小（4e88f65），都已撤销。手机上开场约 108 个字母、每步约 4.8 毫秒；电脑上约 215 个、每步约 11.7 毫秒，偏慢，还没处理。之前的“碗角不推字母、先退中间、下泡缩小”（提交 f6c68b8）负责人不要，已用 8ed5b38 撤销。
    - `quiz-blue.html` 由 `quiz.html` 复制，只在样式最后加了一段颜色覆盖，并把返回首页的链接指向 `home-blue.html`。改问卷的功能时两个文件要一起改，定下来以后合并成一个。
    - 负责人问过“蓝色版在手机上底色透着暖色”：截图读出底色像素确实是冷色。原因多半是手机的护眼、原彩显示，或者大片饱和的蓝让近中性的浅色看起来偏暖（同时对比），所以纸色改成更带蓝意的 `#F2FAFF`。
  - 环绕线（负责人 2026-11-02 要求在原版上试，给了示意图；看过后要求去掉，代码已删，要再试从提交 dac058a 找回）：一条亮蓝色 `#127EEE` 的螺旋线绕着沙漏转一圈多（`CONFIG.ring`，`ringPoints`、`drawRing`）。转到沙漏后面的段画在字母下面，更细更淡（`ring.back`）；转到前面的段画在字母上面；转到侧面时粗细、深浅渐变。半径从上口宽度的 1.05 倍渐变到底座宽度的 1.15 倍，线宽从 1.2 渐变到 3.4，表现上轻下重；从斜上方看，转到前面的点往下偏（`tilt`）。角度先慢后快（`ease` 1.8）：先沿左侧下来，瓶颈处在正后方，在下半部分转到右边，再从沙堆前面横过，收在左下。角度均匀转的话，线在半高处就转到右边、从瓶颈前面横过，和示意图不符。
  - 首页中文用子集字体 `demos/fonts/home-zh-400/600.woff2`，每个约 15 KB，向 Google Fonts 要的 Noto Serif SC，也就是思源宋体。改了首页的中文后重跑 `python -X utf8 scripts/subset_home_font.py`。
  - 问卷页：
    - 一题一屏。题目左上角用小字写题型：单选、多选、排序。
    - 选项前面有记号（负责人 2026-11-02 要求加回）：单选是圆圈，多选是方框里打勾，排序是方框里写名次。选中的记号填上、字重从 400 变成 600，没选的变浅。
    - 单选题点一下就进入下一题；多选题和排序题点“继续 →”。最后一题，以及改完互斥的题要回去时，单选题也显示这个按钮。
    - 左上角“←”是返回上一题，第一题时回首页；右上角写“3 / 18”，题数按当前要答的题来数，所以“去第 N 题修改”里的 N 也这样数。
    - 排序题的说明直接显示，其余题目的说明收进 i 图标；选项的说明直接显示成小字。
    - 答题逻辑照搬 `site/assets/quiz.js`，答卷格式不变（`memsite-quiz-v3`）。答完进入旧版结果页 `site/result.html`。
  - 问卷页加载 Google Fonts 的 Noto Serif SC 400 和 600（负责人 2026-11-02 要求试试网络字体）。Google 会按字符范围分片，只下载页面上用到的那几片。
  - 右上角题数的颜色用 #aaa，对比度只有 2.2，负责人 2026-11-02 定保持这个颜色。

安全审查（2026-10-26）：结论见 `docs/报告/security-audit.md`，未发现恶意项目；需提醒用户的情况写在 `data/safety_notes.json`，normalize 写入各项目的 `safety_note`（推荐结果页要显示）。新增项目也要查一遍；akephalos 因仓库 404 已移除。

多智能体记忆（2026-10-26，负责人要求补收评测好或 Star 多的）：旧规则 F5“多智能体不面向个人用户”不再一刀切排除。已改为纳入：Cognee、MIRIX、Memanto、PowerMem、deja、agentmemory、Caura，新增 Memorix、A-MEM（见 `candidate_review.py` 第 6 批 `NEW`）。Cipher 因仓库已归档、许可证 Elastic 2.0 排除。负责人 2026-10-26 同意调整 F5：评测突出或 Star 多的例外，其余多智能体项目（Star 均不足 20，无评测）仍排除。这 9 项已于同日逐项对照 README 核实（记在 `data/readme_verification.json`；MIRIX 现在的上手方式是 Docker＋Python 客户端，归开发者向；A-MEM 的 1003 Star 仓库只是论文复现代码，可用的库是 WujiangXu/A-mem-sys）；安全审查见 `docs/报告/security-audit.md` 末节。

AI Companion Atlas 站点复核（2026-10-27，负责人要求）：站点上“记忆”标签的条目与原表 50 项一致，没有新增；对约 24 个站点更新日期较新的项目重跑了 `check_health --only`，并按 README／CHANGELOG 复核字段（改动记在 `readme_verification.json`，备注以“2026-10-27 复核”开头）。另从未打记忆标签的条目里新增 LumiMuse（有完整记忆系统）和 Shared Diary MCP（负责人指定，是共写日记而非自动记忆库；2026-10-28 负责人确认它没有按相关度召回，定位改为 `memory_component`，并给所有记忆部件加了 -2 分的推荐偏好，因为它条件宽、在随机答卷里约 15% 进前 8）；排除 WakeTrace（明说不建记忆库）、Wake Bridge（自称无记忆系统）、Villa Bridge（只做会话桥接）、MIRROW（需宿主的组件，记忆库未公开）。站点首页写“180 个项目”，页面实际约 224 张卡片，数字对不上。

多模态召回字段 `media_recall`（2026-10-26，负责人要求）：值 `image`／`audio`／`video`（可多选）或 `not_mentioned`。标准：系统自己保管原图／原音频／原视频（或直接给原件做向量），召回时能把原件交回；只把图片、语音、视频转成文字（描述、转写、OCR）再存文字的不算，哪怕留了文件路径或链接。与旧特性 `multimodal` 不同，后者命中范围宽（生图、读图都算），不要混用。规则不自动判定，全靠 `readme_verification.json` 里逐项核实：先用 scratchpad 脚本扫 README 里“媒体词＋记忆词”的行，再对命中项克隆仓库看代码和文档。没命中的项目按未提及处理，所以是“已知有”的下限，漏网项目要在以后复核时补。已核实有的 12 个，核实后判为只转文字的 14 个（备注里写了原因）。问卷第 8a 题用它加分（2026-10-26）。

多智能体共用字段 `multi_agent`（2026-10-26，为问卷第 4a 题新增）：值 `shared`（写明几个不同的 Agent 或工具读写同一份记忆）、`per_agent`（能给每个 Agent 分开记忆空间或权限，只共享一部分），可两者都有，或 `not_mentioned`。同一个 Agent 换设备不算（那是 `cross_client`），项目内部由几个子智能体分管记忆（如 MIRIX、agent-zero 的子 agent）也不算；`namespace` 只按项目或用户分的不算 `per_agent`。和 `media_recall` 一样只靠逐项核实：扫 README 里多 agent、共享、agent_id、namespace 等词，逐条看原文判断。写明几个 Agent 共用、原来 `cross_client` 是“未提及”的 10 个顺手改成了 yes。结果：共用 64 个、能分开 29 个。

额外花费字段 `spend`＋`spend_note`（2026-10-28，负责人要求）：与粗分三档的 `cost` 不同，`spend` 可多选，说明具体花在哪：`none`、`model_api`（自备模型／向量接口，按量付费）、`subscription`（已有的付费订阅，如 Claude Pro）、`hosting`（服务器、云平台、租 GPU）、`product_fee`（项目本身收费，目前没有项目属于此类）。**只统计强制花销**（不付就用不了的，负责人 2026-10-28 要求）：付费托管版、云部署的收费档位（如 Render Starter）、赞助等可选花销不进 `spend`，写在 `spend_note` 的“可选花销，不付也能用：”后面，数据里是 `data/spend_review.json` 的 `optional`。`spend_note` 是给用户看的一句话，项目只要需要另付接口或订阅等就以“需要一些额外花销来搭配这个项目”开头，含 README 写明的金额。逐项核实写在 `data/spend_review.json`（41 个：全部有托管版或收费线索的项目、订阅类、租 GPU、几个费用原文未识别的）；没列入的按“需要的账号”和 `cost` 自动推出，状态为 auto，其中收费情况没有逐项看过。金额只写 README 写明的，没写的注“README 没写，以官网为准”；Mem0 的价格是 Mengram README 对比表里的二手信息。`python -X utf8 scripts/spend_report.py` 生成 `docs/报告/spend-report.md`。新增项目要查一遍定价线索再决定；myco、cosmos-mcp 两个仍是 unknown。预算题已删去（2026-10-30），`spend` 只用于结果卡片的花销说明。

token 用量字段 `token_inject`＋`token_background`（2026-10-30，负责人要求，问卷第 18 题 `q18t` 用它加减分）：用户的总用量取决于存了多少记忆、聊得多勤，没法比数字，所以只比设计。`token_inject` 是每轮带进对话的记忆量会不会随存量变多：`bounded`（按需检索只取若干条或有固定上限）、`capped`（默认会变多但能设上限，如 Ombre Brain 的目录模式每个记忆桶占一行，可用 `max_tokens` 限制）、`grows`、`not_mentioned`；`token_background` 是后台另外调用大模型的频率：`none`（由聊天模型或用户写入）、`scheduled`、`per_message`（每轮或每次写入）、`not_mentioned`。由聊天模型自己调用工具写入的算 `none`：token 花在对话里，没有另外的调用。核对值在 `data/token_usage.json`（最常被推荐的约 50 个，加 README 里有“全量注入”“catalog”等字样的约 30 个，逐条看过 README），normalize 写进 `normalized`；其余按已有字段推出、状态 auto（检索后处理有 budget/threshold、MCP 按需检索算 `bounded`；召回调用大模型算 `per_message`），没逐条看过。社区说 Ombre Brain 跑一次约 8 万 token，README 里没有这个数，没写进数据。新增项目要在 `token_usage.json` 补一条。

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
