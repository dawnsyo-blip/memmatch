# 阶段 1 规范化结果与待补充清单

> 由 `scripts/normalize.py` 生成，不要手改本文件。要补充或修改，请在 `docs/review-normalization.xlsx`「待补充」页的「负责人确认值」一列填写，
> 然后运行 `python -X utf8 scripts/normalize.py --apply-review`。确认值存入 `data/normalization_overrides.json`，以后重新生成也会保留。
> 填写方式：同意建议值就填「同意」；要改就填英文代码（多个用逗号分隔，如 `mcp, gateway`）；留空表示暂不处理。

所有判断都来自说明文档（README）和原表，**没有实际安装验证**。

负责人 2026-10-11 决定：有建议值的待审核项一律采用建议值（状态记为“已确认”）；没有建议值的记为“文档未说明”（unknown），并写进项目 JSON 的 `uncertainties` 备注，网站上会如实显示“文档未说明”。

## 每个字段的处理情况

| 字段 | 含义与可选值 | 规则判定 | 已确认 | 文档未说明 | 待审核 |
|---|---|---|---|---|---|
| `access` | `mcp` MCP（让 AI 调用外部工具的通用接口）；`gateway` 网关／代理（挂在助手和模型之间）；`host_plugin` 宿主插件（含钩子、技能）；`library` 代码库（要写代码调用）；`standalone_app` 独立应用；`cli_tool` 命令行小工具（需要时自己运行）；`guide` 教程或设计文档（照着搭） | 250 | 0 | 0 | 0 |
| `compatible_clients` | `claude_desktop` Claude 桌面版；`claude_web_mobile` Claude 网页／手机版；`claude_code` Claude Code；`chatgpt` ChatGPT；`chatgpt_gpt` ChatGPT 自定义 GPT（Actions 调接口；个人账号已不能新建，计划 2026-12 退役）；`openai_compatible` 任意 OpenAI 兼容客户端；`any_mcp_client` 任意 MCP 客户端；`cursor` Cursor；`codex` Codex；`gemini_cli` Gemini CLI；`opencode` OpenCode；`openclaw` OpenClaw；`hermes` Hermes；`astrbot` AstrBot；`sillytavern` SillyTavern；`open_webui` Open WebUI；`kelivo` Kelivo；`deepseek_harness` DeepSeek Harness；`telegram` Telegram；`wechat` 微信；`feishu` 飞书；`discord` Discord；`self_contained` 自带界面（不接其它助手）；`developer_built` 开发者自建的应用 | 201 | 0 | 3 | 0 |
| `runs_on` | `own_computer` 自己的电脑；`own_server` 自己的服务器；`own_cloud_account` 自己的云账号；`phone` 手机；`third_party_hosted` 别人的服务器（托管） | 227 | 0 | 6 | 0 |
| `os` | `windows` Windows；`macos` macOS；`linux` Linux；`android` 安卓；`ios` iOS；`any` 任何系统（浏览器即可） | 210 | 0 | 8 | 0 |
| `difficulty` | `low` 低：应用商店或一键安装；`medium` 中：几条命令或按向导填设置；`high` 高：要写代码或改较多配置 | 237 | 0 | 0 | 0 |
| `cost` | `free` 免费；`model_fees_only` 只需模型调用费；`paid_service` 需付费服务或订阅 | 190 | 4 | 10 | 0 |
| `accounts_needed` | `none` 不需要；`github` GitHub；`cloudflare` Cloudflare；`render` Render；`model_api_key` 模型接口密钥；`vendor_account` 项目方账号；`telegram` Telegram 机器人；`claude_subscription` Claude 付费套餐 | 167 | 21 | 9 | 0 |
| `memory_subject` | `user_facts` 用户本人的事实和偏好；`ai_identity` AI 自身身份与关系；`experience` 做事经验；`task_context` 当前任务上下文；`conversation_history` 历史对话原文 | 206 | 0 | 24 | 0 |
| `write_mode` | `auto` 自动记；`review_first` 先出候选再由人审核；`on_request` 由 AI 或用户主动调用时才记 | 43 | 67 | 73 | 0 |
| `forgetting` | `auto_decay` 自动衰减；`archive` 沉底归档（不删除）；`manual_only` 手动删除；`none` 不遗忘 | 32 | 99 | 74 | 0 |
| `human_review` | `dashboard` 网页面板／应用界面；`files` 直接看改文件；`cli` 命令行；`tools` 让 AI 调工具改 | 181 | 0 | 24 | 0 |
| `export` | `markdown` Markdown；`json` JSON；`sqlite` SQLite 数据库文件；`other_file` 其它文件格式；`none` 无 | 62 | 11 | 166 | 0 |
| `data_passes_through` | `local_only` 仅本机或自己的服务器；`own_cloud` 用户自己的云账号；`third_party` 第三方服务器 | 240 | 0 | 6 | 0 |
| `license_category` | `permissive` 宽松；`copyleft` 要求开源衍生作品；`noncommercial` 禁止商用；`source_available` 源码可见但限制使用；`no_license` 无许可证文件 | 247 | 3 | 5 | 0 |
| `persona_continuity` | **人格／身份连续性**：专门保存 AI 自身的人格、身份、关系，换窗、换模型后仍是同一个“TA”。`yes` 有；`not_mentioned` 未提及 | 249 | 0 | 0 | 0 |
| `window_handoff` | **换窗续接**：新会话自动带入上次的上下文或交接摘要，或在上下文压缩前保存，减少换窗丢细节。`yes` 有；`not_mentioned` 未提及 | 253 | 0 | 0 | 0 |
| `cross_client` | **跨入口共享**：同一份记忆可给多个客户端或设备用（如网页、手机、Claude Code 共用）。`yes` 有；`not_mentioned` 未提及 | 238 | 0 | 0 | 0 |
| `verbatim` | **保留原话**：存下对话原文，结论可追溯到原话，而不只是摘要。`yes` 有；`not_mentioned` 未提及 | 257 | 0 | 0 | 0 |
| `multimodal` | **多模态记忆**：能记住图片、语音、视频等非文字内容。`yes` 有；`not_mentioned` 未提及 | 253 | 0 | 0 | 0 |
| `time_awareness` | **时间感**：记忆带时间线或时间戳，知道过了多久、事实何时有效。`yes` 有；`not_mentioned` 未提及 | 244 | 0 | 0 | 0 |
| `dream_consolidation` | **梦境／离线整理**：在夜间、空闲或定期自动整理、合并、反思记忆。`yes` 有；`not_mentioned` 未提及 | 247 | 0 | 0 | 0 |
| `emotion` | **情绪记忆**：记录情绪、心境，或用情感强度给记忆加权。`yes` 有；`not_mentioned` 未提及 | 253 | 0 | 0 | 0 |
| `proactive` | **主动性**：AI 会主动联系或提起（主动消息、定时问候、心跳任务）。`yes` 有；`not_mentioned` 未提及 | 254 | 0 | 0 | 0 |
| `pinning` | **钉选重要记忆**：可把重要记忆标为核心、永不衰减或锁定。`yes` 有；`not_mentioned` 未提及 | 254 | 0 | 0 | 0 |
| `error_guard` | **记错防护**：能纠错、取代旧事实、检测冲突、追溯来源或回滚，防止记错越记越真。`yes` 有；`not_mentioned` 未提及 | 250 | 0 | 0 | 0 |
| `import_history` | **迁入旧记录**：能导入 ChatGPT、Claude 等平台导出的聊天记录或别的记忆库数据。`yes` 有；`not_mentioned` 未提及 | 252 | 0 | 0 | 0 |
| `retrieval_weighting` | **召回排序**：挑选要想起的记忆时综合考虑重要性、新旧、情感分量，而不只看字面相似。`yes` 有；`not_mentioned` 未提及 | 256 | 0 | 0 | 0 |
| `reflection` | **反思推断**：从零散记忆里归纳出更高层的理解或推断（如“你常聊城市话题，可能对城市规划感兴趣”）。`yes` 有；`not_mentioned` 未提及 | 253 | 0 | 0 | 0 |
| `relationship_stage` | **关系阶段**：记录关系进展、亲密度或信任度，刚认识和久别重逢时表现不同。`yes` 有；`not_mentioned` 未提及 | 255 | 0 | 0 | 0 |
| `independent_life` | **独立生活**：AI 有自己的日程或生活线，能聊它“不在线时”做了什么。`yes` 有；`not_mentioned` 未提及 | 257 | 0 | 0 | 0 |
| `visual_presence` | **视觉形象**：有 Live2D、3D 角色、桌宠等形象，或用画面表现情绪。`yes` 有；`not_mentioned` 未提及 | 257 | 0 | 0 | 0 |
| `voice_interaction` | **语音交互**：支持语音对话、朗读，或从声音里识别情绪。`yes` 有；`not_mentioned` 未提及 | 255 | 0 | 0 | 0 |
| `privacy_protection` | **隐私保护**：加密存储、自动脱敏敏感信息，或明确承诺数据不离开本机。`yes` 有；`not_mentioned` 未提及 | 252 | 0 | 0 | 0 |
| `ranking_signals` | `semantic` 语义相似（向量）；`keyword` 关键词／全文；`recency` 新旧／时间衰减；`importance` 重要性评分；`frequency` 使用频率／被想起的次数；`emotion` 情感强度；`relation` 关联扩散（图谱、链接）；`confidence` 置信度／来源可信度；`not_mentioned` 未提及 | 225 | 0 | 0 | 0 |
| `scoring_stages` | `write` 写入时打分或筛选；`retrieve` 召回时综合排序；`forget` 遗忘时按分数决定；`not_mentioned` 未提及 | 245 | 0 | 0 | 0 |
| `multi_factor` | `multi` 多维（相似度之外至少综合两个因素）；`single` 单一（只看相似度，或只多一个因素）；`not_mentioned` 未提及 | 257 | 0 | 0 | 0 |
| `emotion_handling` | `tags` 给记忆打情绪标签（如效价、唤醒度）；`weighting` 情绪强度影响记忆的保留或召回；`ai_state` AI 自己有会随时间变化的情绪、驱力或身体状态；`user_mood` 记录用户的心情和状态；`not_mentioned` 未提及 | 250 | 0 | 0 | 0 |
| `project_role` | `full_memory` 完整记忆系统；`context_tool` 上下文延续工具（压缩、摘要、换窗）；`memory_component` 记忆部件（只做其中一环）；`state_engine` 状态引擎（情绪、身体、梦）；`companion_app` 自带记忆的应用或 agent；`dev_framework` 开发框架或代码库；`guide` 教程或设计文档；`method` 做法（不装专门的记忆库，用笔记软件当记忆）；`note_connector` 笔记软件连接器（做法的部件） | 244 | 0 | 0 | 0 |
| `lifecycle` | `capture` 写入；`consolidate` 整理（合并、摘要、反思）；`retrieve` 召回；`forget` 自动遗忘或归档；`review` 人工查看和修改 | 257 | 0 | 0 | 0 |
| `lifecycle_complete` | `complete` 五个环节都有；`partial` 只覆盖部分环节 | 257 | 0 | 0 | 0 |
| `pairing` | `designed_to_pair` 明确说明可和其它记忆库搭配（旁路、叠加）；`standard_interface` 走 MCP、OpenAI 兼容接口或宿主插件，可和别的工具并用；`replaces_builtin` 会替换宿主自带的记忆或压缩；`self_contained` 自带完整界面，记忆不拿出来和别的项目共用；`depends_on` 要先有另一个项目才能用；`not_mentioned` 未提及 | 256 | 0 | 0 | 0 |
| `customization` | `settings_ui` 在界面里改设置；`config_file` 改配置文件或环境变量；`prompts` 可以改提示词；`plain_data` 记忆是可以直接编辑的普通文件；`plugin_api` 留了插件或扩展接口；`small_code` 代码小巧（单文件、零依赖），方便自己改；`not_mentioned` 未提及 | 255 | 0 | 0 | 0 |
| `chinese_support` | `zh_docs` 有中文说明文档；`zh_retrieval` 中文检索做过优化（分词、中文向量模型等）；`not_mentioned` 未提及 | 248 | 0 | 0 | 0 |
| `memory_layers` | `layered` 分层记忆（短期／长期、碎片／事件／核心等）；`flat` 单层，没有分层；`not_mentioned` 未提及 | 252 | 0 | 0 | 0 |
| `retrieval_postprocess` | `rerank` 召回后重排；`dedup` 去重、避免反复浮现；`budget` 按 token 预算裁剪；`threshold` 相关度不够就不注入；`not_mentioned` 未提及 | 240 | 0 | 0 | 0 |
| `recall_uses_llm` | `no_llm` 召回时不调用大模型（更快更省）；`llm` 召回时会调用大模型（重排、改写或让 AI 自己翻找）；`not_mentioned` 未提及 | 241 | 0 | 0 | 0 |
| `sensitive_suppression` | `yes` 能压住不该再提的记忆（用户拒绝过、标记回避或未解决的）；`not_mentioned` 未提及 | 253 | 0 | 0 | 0 |
| `write_receipt` | `yes` 写入后能明确告诉你记没记上（回执、返回编号、可回读）；`not_mentioned` 未提及 | 256 | 0 | 0 | 0 |
| `memory_writer` | `chat_agent` 聊天的 AI 自己调用工具记；`background` 后台的模型或规则自动整理；`user` 用户自己手动记；`not_mentioned` 未提及 | 212 | 0 | 0 | 0 |
| `phone_access` | `native` 手机入口直接可用（本身在手机上，或装在机器人、Kelivo、酒馆等宿主里）；`remote_mcp` 提供远程 MCP（Claude App 等可添加为连接器）；`http_endpoint` 网关部署在服务器或云上，手机客户端填地址即可；`cloud` 本身跑在云上（自己的云账号或托管）；`needs_tunnel` 要自己用 Cloudflare Tunnel、Tailscale 等打通；`not_mentioned` 未提及 | 193 | 0 | 0 | 0 |
| `local_model` | `yes` 可以用本地模型（Ollama、LM Studio 等）代替付费接口；`no_model_needed` 本身不调用模型；`not_mentioned` 未提及 | 214 | 0 | 0 | 0 |
| `model_lock` | `claude_only` 只能配合 Claude（官方客户端或付费套餐）；`openai_only` 只能配合 ChatGPT／OpenAI；`not_mentioned` 没发现限制 | 243 | 0 | 0 | 0 |
| `setup_device` | `phone_ok` 只用手机就能装好（手机 App、宿主插件，或全程浏览器部署）；`needs_computer` 安装或部署时要用电脑；`not_mentioned` 未提及 | 205 | 0 | 0 | 0 |
| `media_recall` | `image` 图片：保管原图，能检索并重新召回；`audio` 音频：保管原音频，能检索并重新召回；`video` 视频：保管原视频（或关键帧），能检索并重新召回；`not_mentioned` 未提及，或只把多模态内容转成文字再存 | 231 | 0 | 0 | 0 |
| `multi_agent` | `shared` 写明几个不同的 Agent 共用同一份记忆；`per_agent` 能给每个 Agent 分开记忆空间或权限，只共享一部分；`not_mentioned` 未提及 | 187 | 0 | 0 | 0 |
| `spend` | `none` 不需要额外花钱；`model_api` 要自备模型或向量接口，按调用量付费（能接本地模型的可省）；`subscription` 要已有的付费订阅（如 Claude Pro／Max）；`hosting` 要另付服务器、云平台或租 GPU 的钱；`product_fee` 项目本身收费（托管版或授权，不买用不了） | 208 | 0 | 0 | 0 |

共 257 个项目：文档未说明 408 处，待审核 0 处。另有 `paper_taxonomy`（论文分类）直接沿用原表，只有原表 50 个项目有。

说明：

- 多选字段（如 `access`、`compatible_clients`）可以有多个值，用英文逗号分隔。
- `os`：README 没写明但用 npx、pip、Docker 等跨平台方式安装的，按 Windows/macOS/Linux 都能用处理（理由里会注明“推断”）。
- `data_passes_through` 只看记忆服务本身存在哪里；用云端大模型时，对话还会发给模型提供方，网站上会统一说明。
- `difficulty` 原文是区间（如“低到中”）时取较高一档。

## 用户在意的特性一览

判定为“有”的项目。依据是原表、说明和 README；README 里的命中已由 Claude 逐条核对，误判记在 `scripts/feature_rules.py`。“未提及”只表示文档没写，不等于没有。要更正某一项，同样在 xlsx 里填写（xlsx 另有“特性”页列出全部判定）。

- **人格／身份连续性**（44 个）：专门保存 AI 自身的人格、身份、关系，换窗、换模型后仍是同一个“TA”。
  Aelios、agent-memory（g1itchbot）、把 AI 伴侣搬进 Telegram、我会永远陪着你（AstrBot 陪伴插件）、AstrBot 自主学习、Being、birkin-mnemosyne、Bitterbot、Claude Soul、Companion Emergence、connectome-host、守护猴 Daemonkey、dreams.js、Drivesoid、DuduLove Memory、Echo Mistik、Eros Engine、Headlong、HoneyOS、KI-CO 小屋、Kin 的小脑瓜（Kin Mind）、Letta（原 MemGPT）、L.I.F.E.、LMC-5、LumiMuse、记忆星图 Memory Constellations、MIRA OS、Moraine、Nocturne Memory、Ombre Brain、OpenHer、草履虫 Paramecium、Psycheros、Resonant Mind、Resonant、ReSpark、Sapphire、Synthetic Heart、TeleMem、WrenWen、心潮念、Yoji、Yorishiro、Yuralume Core
- **换窗续接**（91 个）：新会话自动带入上次的上下文或交接摘要，或在上下文压缩前保存，减少换窗丢细节。
  vMem、Aelios、agent-memory（g1itchbot）、agentmemory（rohitg00）、AgentRecall、AIGNE AFS（Agentic File System）、Basic Memory、Being、birkin-mnemosyne、causal-memory、Central Intelligence、claude-handoff、Claude Imprint、Claude-Mem、Claude Soul、云与岛、connectome-host、context-memory、context-slim、ContextLattice、CRBRO、deja、Dylan Heartbeat、EchoVault、engram-rs、fable、Facthouse、forge-reload、Graph Memory、Hipocampo、HMS、Honcho、HoneyOS、Hyperconsciousness、IAI 个人记忆引擎、inspeximus、Jarvis Orb、kimi-room、kiwi-mem、L.I.F.E.、notebook.py、LMC-5、Magnemo、mcp-agent-memory、mcp-memory-service、mem0-mcp-selfhosted、MemForge、MemHeaven、memkeeper、memo、MemoCall、Memorix、memory-lancedb-pro、memory-mcp-1file、Memory MCP（michael-denyer）、/memory（maxtechera）、MemoryZ、MemPalace、Mengram、Midas、Mind Map、MIRA OS、mneme、Mnemo Cortex、mnemo、mnemostack、Neotoma、Nocturne Memory、Ombre Brain、OMEGA、LongMemory（原 OpenMemory）、OptMem、草履虫 Paramecium、爪迹 Pawwake、Piia Engram、PowerContext（原 PowerMem）、Prism Coder、Remembra Relay、RetainDB、roampal-core、Serein、Smart Memory、Qdrant Memory、SAME、Supermemory、Claude Code 换窗教程（精炼续窗）、TokenMizer、Tree Ring Memory、Engram（tstockham96）、weighted-compact、YourMemory
- **跨入口共享**（94 个）：同一份记忆可给多个客户端或设备用（如网页、手机、Claude Code 共用）。
  vMem、Acheron、Acontext、Aelios、afair、agentmemory（rohitg00）、AIGNE AFS（Agentic File System）、Anytype MCP、AtMem、Aura Memory、AutoMem、Basic Memory、birkin-mnemosyne、MCPVault、Caura（原 MemClaw）、causal-memory、Celiums Memory、Central Intelligence、Claude Imprint、Cognee、Compartment、ContextLattice、cosmos-mcp、Obsidian MCP Server（cyanheads）、守护猴 Daemonkey、deja、DuduLove Memory、EverOS、Facthouse、Engram（FBISiri）、GBrain、GENOME、GoodMemory、Graph Memory、Hindsight、Hipocampo、Honcho、Hyperconsciousness、imprint-memory、inspeximus、Kremis、Kybase、Loci、Longhand、lore、mcp-obsidian（MarkusPfundstein）、mcp-logseq、mcp-memory-service、mem9、Memanto、memkeeper、memo、Memorix、memory-lancedb-pro、/memory（maxtechera）、MemoryBear、MemoryZ、MemOS、MemTether、memU、Mengram、笔记库当记忆（Obsidian 等本地 Markdown 笔记）、Notion 当记忆（官方远程 MCP）、Midas、Mind Map、mneme、Mnemo Cortex、mnemo、mnemory、mnemostack、Neotoma、Nocturne Memory、Ombre Brain、OMEGA、Omnigraph、people-context、Piia Engram、Prism Coder、Psycheros、ReMe、Remembra Relay、Remnic、Shared Diary MCP、Obsidian MCP Server（smith-and-web）、SAME、Synapse、Synthetic Heart、TeleMem、TencentDB Agent Memory、Tree Ring Memory、Engram（tstockham96）、YourMemory、Yuralume Core、ZenBrain
- **保留原话**（40 个）：存下对话原文，结论可追溯到原话，而不只是摘要。
  Aelios、agentic-recall、Alaya、LivingMemory、Aura Memory、causal-memory、Central Intelligence、claude-find、Companion Emergence、connectome-host、context-manager（Connectome）、deja、DreamVault、Summaryception、fable、Facthouse、Hindsight、IAI 个人记忆引擎、imprint-memory、LMC-5、Longhand、LoreRoom、MemHeaven、memo、MemoCall、记忆星图 Memory Constellations、MemPalace、Midas、Mind Map、Mnemo Cortex、Mnemosyne（OpenClaw/Hermes 版）、Ombre Brain、草履虫 Paramecium、爪迹 Pawwake、Personal Understanding、Remnic、Serein、taOSmd、TeleMem、TencentDB Agent Memory
- **多模态记忆**（26 个）：能记住图片、语音、视频等非文字内容。
  AI Pocket Chat、Bitterbot、Eros Engine、EverOS、Facthouse、Graphiti（Zep）、HMS、imprint-memory、Memex、memo、Memorix、MemOS、MIRIX、mnemostack、Neotoma、Omnigraph、Prism Coder、Tessera、Psycheros、Sapphire、SimpleMem、Supermemory、TeleMem、TokenMizer、Utsuwa、Yuralume Core
- **时间感**（85 个）：记忆带时间线或时间戳，知道过了多久、事实何时有效。
  Aelios、agentmemory（rohitg00）、AgentRecall、AI 日常规则教程、AI Pocket Chat、我会永远陪着你（AstrBot 陪伴插件）、Aura Memory、Bitterbot、Caura（原 MemClaw）、Celiums Memory、claude-handoff、Claude Imprint、Claude-Mem、Claude Soul、Companion Emergence、Compartment、Context-Keeper、ContextLattice、Cyberboss、deja、Drivesoid、Dylan Heartbeat、fable、Facthouse、GENOME、Graph Memory、Graphiti（Zep）、Headlong、imprint-memory、InternalBeyond 移动版、KI-CO 小屋、kiwi-mem、lean-memory、notebook.py、LMC-5、LocalKeep、Longhand、LumiMuse、机的独立工作室 Machine Studio、Mem0、Memanto、Memex、MemForge、MemHeaven、memo、Memobase、Memora、Memorix、memory-mcp-1file、MemoryBear、MemoryZ、MemPalace、MemTether、笔记库当记忆（Obsidian 等本地 Markdown 笔记）、Midas、Mímir、MIRA OS、mneme、mnemo、mnemory、mnemostack、Moraine、墨知 MoRead、OMEGA、LongMemory（原 OpenMemory）、爪迹 Pawwake、people-context、Personal Understanding、Piia Engram、Tessera、Psycheros、Remembra Relay、Remnic、Sapphire、ShadowGraph、Shared Diary MCP、SimpleMem、Smart Memory、Statewave、Supermemory、Talamus、Timeline Memory、Engram（tstockham96）、Utsuwa、Yuralume Core
- **梦境／离线整理**（100 个）：在夜间、空闲或定期自动整理、合并、反思记忆。
  Aelios、afair、agent-memory（g1itchbot）、agentic-recall、agentmemory（rohitg00）、AgentRecall、AIGNE AFS（Agentic File System）、Alaya、archon-memory-core、LivingMemory、我会永远陪着你（AstrBot 陪伴插件）、Aura Memory、AutoMem、Being、Bitterbot、Caura（原 MemClaw）、causal-memory、Celiums Memory、Claude Imprint、Claude Soul、Cometline、Companion Emergence、CRBRO、dreams.js、DreamVault、Echo Mistik、engram-rs、Eventide、EverOS、Facthouse、Engram（FBISiri）、FluctlightDB、GBrain、GENOME、Graph Memory、Engram（HBarefoot）、Hindsight、Hipocampo、IAI 个人记忆引擎、imprint-memory、把乌鸦留在身边、KI-CO 小屋、Kin 的小脑瓜（Kin Mind）、kiwi-mem、LangMem、lean-memory、Letta（原 MemGPT）、L.I.F.E.、LMC-5、LumiMuse、mcp-agent-memory、mcp-memory-service、Memanto、Memex、MemForge、memkeeper、memo、Memora、Memorix、memory-lancedb-pro、/memory（maxtechera）、MemoryBear、记忆星图 Memory Constellations、MemoryOS、Midas、Mímir、Mind Map、MIRIX、Mnemo Cortex、mnemo、mnemos（vishalbanwari26）、mnemostack、Mnemosyne（OpenClaw/Hermes 版）、Moraine、Ombre Brain、OMEGA、LongMemory（原 OpenMemory）、OpenViking、爪迹 Pawwake、PowerContext（原 PowerMem）、Tessera、Psycheros、ReMe、Remnic、Resonant Mind、RetainDB、Sapphire、Serein、Shodh-Memory、Smart Memory、SAME、Synthetic Heart、taOSmd、Tree Ring Memory、Engram（tstockham96）、weighted-compact、心潮念、YourMemory、Yuralume Core、ZenBrain
- **情绪记忆**（37 个）：记录情绪、心境，或用情感强度给记忆加权。
  给 AI 伴侣装思考链和情绪、AI Pocket Chat、我会永远陪着你（AstrBot 陪伴插件）、AstrBot 主动消息插件、AstrBot 自主学习、Being、Bitterbot、Celiums Memory、Chord Affect Anchors、Companion Emergence、Drivesoid、Echo Mistik、情绪系统（bvsden）、InternalBeyond 移动版、把乌鸦留在身边、KI-CO 小屋、Kin 的小脑瓜（Kin Mind）、kiwi-mem、L.I.F.E.、LMC-5、LumiMuse、记忆星图 Memory Constellations、Mímir、Ombre Brain、OpenHer、Resonant Mind、Resonant、rolling-memory、Sapphire、Smart Memory、Synthetic Heart、Utsuwa、VCPToolBox、心潮念、Yoji、Yuralume Core、ZenBrain
- **主动性**（27 个）：AI 会主动联系或提起（主动消息、定时问候、心跳任务）。
  把 AI 伴侣搬进 Telegram、AI Pocket Chat、我会永远陪着你（AstrBot 陪伴插件）、AstrBot 主动消息插件、云与岛、Companion Emergence、Cyberboss、Dylan Heartbeat、情绪系统（bvsden）、Headlong、InternalBeyond 移动版、把乌鸦留在身边、kimi-core、Letta（原 MemGPT）、MochiBot、OpenHer、Psycheros、Resonant、RikkaHub Jude、Sapphire、Synthetic Heart、三天没睡、Utsuwa、VCPToolBox、心潮念、Yoji、Yuralume Core
- **钉选重要记忆**（24 个）：可把重要记忆标为核心、永不衰减或锁定。
  vMem、Aelios、archon-memory-core、Aura Memory、birkin-mnemosyne、Bitterbot、Companion Emergence、EchoVault、IAI 个人记忆引擎、imprint-memory、kiwi-mem、笔记库当记忆（Obsidian 等本地 Markdown 笔记）、Mind Map、Mnemo Cortex、mnemory、Nocturne Memory、Ombre Brain、爪迹 Pawwake、Smart Memory、SAME、VectHare、widemem、心潮念、ZenBrain
- **记错防护**（101 个）：能纠错、取代旧事实、检测冲突、追溯来源或回滚，防止记错越记越真。
  Aelios、afair、agent-memory（g1itchbot）、Agent Zero、agentic-recall、agentmemory（rohitg00）、AgentRecall、Alaya、archon-memory-core、AstrBot 自主学习、AtMem、birkin-mnemosyne、Bitterbot、Caura（原 MemClaw）、Central Intelligence、Claude Imprint、Claude Soul、Claudex、Compartment、context-manager（Connectome）、ContextLattice、CRBRO、deja、DreamVault、Facthouse、FluctlightDB、GBrain、Graph Memory、Graphiti（Zep）、Engram（HBarefoot）、Hipocampo、HMS、IAI 个人记忆引擎、imprint-memory、inspeximus、Jarvis Orb、kimi-core、Kin 的小脑瓜（Kin Mind）、kiwi-mem、langstate、lean-memory、Letta（原 MemGPT）、notebook.py、LMC-5、mcp-memory-service、mem0-mcp-selfhosted、Memanto、MemForge、memgres、MemHeaven、memo、Memora、Memorix、记忆星图 Memory Constellations、MemoryMesh、MemoryZ、MemOS、MemTether、Midas、Mímir、Mnemo Cortex、mnemo、mnemory、mnemostack、Mnemosyne（OpenClaw/Hermes 版）、Moraine、NemoLore、Neotoma、Nocturne Memory、Ombre Brain、OMEGA、Open WebUI Memory、LongMemory（原 OpenMemory）、草履虫 Paramecium、爪迹 Pawwake、people-context、Personal Understanding、Piia Engram、药盒 pilulier、Tessera、Portable AI Memory SDK、Remembra Relay、Remnic、RetainDB、ShadowGraph、Shodh-Memory、Smart Memory、SAME、Statewave、Supermemory、Synapse、Synthetic Heart、Talamus、taOSmd、TeleMem、TokenMizer、Tree Ring Memory、Engram（tstockham96）、weighted-compact、widemem、YourMemory
- **迁入旧记录**（31 个）：能导入 ChatGPT、Claude 等平台导出的聊天记录或别的记忆库数据。
  agentic-recall、把 AI 伴侣搬进 Telegram、Alaya、Basic Memory、Central Intelligence、claude-handoff、connectome-host、HoneyOS、inspeximus、InternalBeyond 移动版、KI-CO 小屋、MemForge、Mengram、Midas、Mind Map、MochiBot、Neotoma、Ombre Brain、LongMemory（原 OpenMemory）、爪迹 Pawwake、people-context、Piia Engram、Tessera、Psycheros、Portable AI Memory SDK、Remnic、ReSpark、RetainDB、Serein、Synapse、心潮念
- **召回排序**（43 个）：挑选要想起的记忆时综合考虑重要性、新旧、情感分量，而不只看字面相似。
  agent-memory（g1itchbot）、agentic-recall、AgentRecall、Alaya、archon-memory-core、Aura Memory、memex（ayushagrawal288）、Caura（原 MemClaw）、causal-memory、Celiums Memory、Companion Emergence、Compartment、CRBRO、Engram（FBISiri）、FluctlightDB、GBrain、Engram（HBarefoot）、Hipocampo、IAI 个人记忆引擎、imprint-memory、Jarvis Orb、kimi-core、kiwi-mem、lean-memory、MemForge、memory-lancedb-pro、记忆星图 Memory Constellations、Mímir、mneme、mnemo、mnemos（vishalbanwari26）、mnemostack、Mnemosyne（OpenClaw/Hermes 版）、NemoLore、Ombre Brain、Tessera、Shodh-Memory、Qdrant Memory、Engram（tstockham96）、VectHare、widemem、Yuralume Core、ZenBrain
- **反思推断**（26 个）：从零散记忆里归纳出更高层的理解或推断（如“你常聊城市话题，可能对城市规划感兴趣”）。
  agentmemory（rohitg00）、AIGNE AFS（Agentic File System）、Aura Memory、Being、Bitterbot、Claude Soul、Companion Emergence、Echo Mistik、Eros Engine、EverOS、Engram（FBISiri）、kiwi-mem、L.I.F.E.、LMC-5、mcp-memory-service、Memex、MemForge、memory-lancedb-pro、MemoryBear、记忆星图 Memory Constellations、Mímir、mnemos（vishalbanwari26）、Resonant Mind、Synthetic Heart、taOSmd、Yuralume Core
- **关系阶段**（7 个）：记录关系进展、亲密度或信任度，刚认识和久别重逢时表现不同。
  AI Pocket Chat、AstrBot 自主学习、Eros Engine、HoneyOS、Smart Memory、Utsuwa、Yuralume Core
- **独立生活**（6 个）：AI 有自己的日程或生活线，能聊它“不在线时”做了什么。
  AI Pocket Chat、Companion Emergence、Eros Engine、InternalBeyond 移动版、KI-CO 小屋、Yuralume Core
- **视觉形象**（8 个）：有 Live2D、3D 角色、桌宠等形象，或用画面表现情绪。
  守护猴 Daemonkey、Echo Mistik、Jarvis Orb、Sapphire、Synthetic Heart、Utsuwa、Yoji、Yorishiro
- **语音交互**（22 个）：支持语音对话、朗读，或从声音里识别情绪。
  把 AI 伴侣搬进 Telegram、AI Pocket Chat、我会永远陪着你（AstrBot 陪伴插件）、AstrBot 主动消息插件、connectome-host、Echo Mistik、Eros Engine、InternalBeyond 移动版、把乌鸦留在身边、L.I.F.E.、墨知 MoRead、OpenHer、Psycheros、Resonant、RikkaHub Jude、Sapphire、Synthetic Heart、三天没睡、Utsuwa、Yoji、Yorishiro、Yuralume Core
- **隐私保护**（75 个）：加密存储、自动脱敏敏感信息，或明确承诺数据不离开本机。
  Acheron、agentic-recall、agentmemory（rohitg00）、AgentRecall、alethech、archon-memory-core、AtMem、Aura Memory、Being、Caura（原 MemClaw）、Celiums Memory、claude-handoff、Claude-Mem、Companion Emergence、Compartment、ContextLattice、CRBRO、deja、fable、GENOME、GoodMemory、Graph Memory、Engram（HBarefoot）、Hindsight、Hyperconsciousness、IAI 个人记忆引擎、inspeximus、InternalBeyond 移动版、KI-CO 小屋、lean-memory、LMC-5、Longhand、LoreRoom、Memanto、Memex、MemHeaven、memo、Memora、memory-mcp-1file、/memory（maxtechera）、记忆星图 Memory Constellations、MemoryZ、MemOS、MemPalace、Mengram、Midas、Mímir、Mind Map、MIRA OS、MIRIX、mneme、Mnemo Cortex、Neotoma、OMEGA、people-context、Piia Engram、Prism Coder、Tessera、ReMe、Remnic、Resonant、Sapphire、ShadowGraph、Shodh-Memory、SAME、Statewave、Talamus、taOSmd、TeleMem、Tree Ring Memory、Engram（tstockham96）、Utsuwa、widemem、YourMemory、Yuralume Core

## `compatible_clients` 能配合的助手（3 处）

| 项目 | 状态 | 原文 | 建议值 | 不确定的地方 |
|---|---|---|---|---|
| Chord Affect Anchors（`chord-affect-anchors`） | 文档未说明 | 不限 | — | 客户端原文：不限 |
| Obsidian MCP Server（smith-and-web）（`smith-and-web-obsidian-mcp-server`） | 文档未说明 | 支持远程 MCP 的客户端；只支持本地的客户端经 mcp-remote 转接 | — | 客户端原文：支持远程 MCP 的客户端；只支持本地的客户端经 mcp-remote 转接 |
| WrenWen（`wrenwen`） | 文档未说明 | 不限（照着自建） | — | 客户端原文：不限（照着自建） |

## `runs_on` 运行位置（6 处）

| 项目 | 状态 | 原文 | 建议值 | 不确定的地方 |
|---|---|---|---|---|
| 给 AI 伴侣装思考链和情绪（`ai-companion-cot-emotion`） | 文档未说明 | — | — | 说明文档没有写 |
| 和机的另一个家 ChatNest UI（`chatnest-ui`） | 文档未说明 | 浏览器；后端需自行实现 | — | 文档写的是“浏览器；后端需自行实现”，归不进固定选项 |
| Chord Affect Anchors（`chord-affect-anchors`） | 文档未说明 | — | — | 说明文档没有写 |
| DreamVault（`dreamvault`） | 文档未说明 | 嵌入你自己的记忆系统所在机器 | — | 文档写的是“嵌入你自己的记忆系统所在机器”，归不进固定选项 |
| 药盒 pilulier（`pilulier`） | 文档未说明 | — | — | 说明文档没有写 |
| WrenWen（`wrenwen`） | 文档未说明 | — | — | 说明文档没有写 |

## `os` 支持的系统（8 处）

| 项目 | 状态 | 原文 | 建议值 | 不确定的地方 |
|---|---|---|---|---|
| 给 AI 伴侣装思考链和情绪（`ai-companion-cot-emotion`） | 文档未说明 | — | — | README 和原表都没提到系统 |
| Chord Affect Anchors（`chord-affect-anchors`） | 文档未说明 | — | — | README 和原表都没提到系统 |
| DreamVault（`dreamvault`） | 文档未说明 | — | — | README 和原表都没提到系统 |
| HMS（`hms`） | 文档未说明 | — | — | README 和原表都没提到系统 |
| kimi-room（`kimi-room`） | 文档未说明 | — | — | README 和原表都没提到系统 |
| Kin 的小脑瓜（Kin Mind）（`kin-mind`） | 文档未说明 | — | — | README 和原表都没提到系统 |
| 记忆星图 Memory Constellations（`memoryconstellations`） | 文档未说明 | — | — | README 和原表都没提到系统 |
| 药盒 pilulier（`pilulier`） | 文档未说明 | — | — | README 和原表都没提到系统 |

## `cost` 费用（10 处）

| 项目 | 状态 | 原文 | 建议值 | 不确定的地方 |
|---|---|---|---|---|
| 给 AI 伴侣装思考链和情绪（`ai-companion-cot-emotion`） | 文档未说明 | — | — | 说明文档没有写 |
| AI 日常规则教程（`ai-daily-rules-tutorial`） | 文档未说明 | — | — | 文档写的是“手机（安卓）；CC BY-NC-SA；人机恋向”，归不进固定选项 |
| alethech（`alethech`） | 文档未说明 | — | — | 文档写的是“自己的电脑；Star 为 0”，归不进固定选项 |
| ContextLattice（`contextlattice`） | 文档未说明 | — | — | 文档写的是“自己的电脑（容器运行时）；偏编程场景”，归不进固定选项 |
| cosmos-mcp（`cosmos-mcp`） | 文档未说明 | Cosmos 账号 | — | 文档写的是“Cosmos 账号；需 Cosmos 服务密钥；同步 App 仅 macOS；免代码用法默认经第三方服务器”，归不进固定选项 |
| FluctlightDB（`fluctlightdb`） | 文档未说明 | — | — | 文档写的是“自己的电脑；MIT 或 Apache-2.0”，归不进固定选项 |
| Myco（`myco`） | 文档未说明 | — | — | 文档写的是“自己的电脑；偏编程场景”，归不进固定选项 |
| Omnigraph（`omnigraph`） | 文档未说明 | — | — | 文档写的是“自己的电脑或对象存储”，归不进固定选项 |
| Portable AI Memory SDK（`python-sdk`） | 文档未说明 | — | — | 文档写的是“自己的电脑”，归不进固定选项 |
| WrenWen（`wrenwen`） | 文档未说明 | — | — | 文档写的是“代码不开源”，归不进固定选项 |

## `accounts_needed` 需要的账号（9 处）

| 项目 | 状态 | 原文 | 建议值 | 不确定的地方 |
|---|---|---|---|---|
| 给 AI 伴侣装思考链和情绪（`ai-companion-cot-emotion`） | 文档未说明 | — | — | 说明文档没有写 |
| AI 日常规则教程（`ai-daily-rules-tutorial`） | 文档未说明 | — | — | 说明文档没有写 |
| alethech（`alethech`） | 文档未说明 | — | — | 说明文档没有写 |
| ContextLattice（`contextlattice`） | 文档未说明 | — | — | 说明文档没有写 |
| FluctlightDB（`fluctlightdb`） | 文档未说明 | — | — | 说明文档没有写 |
| Myco（`myco`） | 文档未说明 | — | — | 说明文档没有写 |
| Omnigraph（`omnigraph`） | 文档未说明 | — | — | 说明文档没有写 |
| Portable AI Memory SDK（`python-sdk`） | 文档未说明 | — | — | 说明文档没有写 |
| WrenWen（`wrenwen`） | 文档未说明 | — | — | 说明文档没有写 |

## `memory_subject` 主要记住什么（24 处）

| 项目 | 状态 | 原文 | 建议值 | 不确定的地方 |
|---|---|---|---|---|
| alethech（`alethech`） | 文档未说明 | 签名的记忆提交 | — | 文档写的是“签名的记忆提交”，归不进固定选项 |
| AtMem（`atmem`） | 文档未说明 | agent 记忆与证据 | — | 文档写的是“agent 记忆与证据”，归不进固定选项 |
| Aura Memory（`aurasdk`） | 文档未说明 | 记忆 | — | 文档写的是“记忆”，归不进固定选项 |
| Celiums Memory（`celiums-memory`） | 文档未说明 | 多类记忆 | — | 文档写的是“多类记忆”，归不进固定选项 |
| EverOS（`everos`） | 文档未说明 | 长期记忆 | — | 文档写的是“长期记忆”，归不进固定选项 |
| Hipocampo（`hipocampo`） | 文档未说明 | agent 记忆 | — | 文档写的是“agent 记忆”，归不进固定选项 |
| HMS（`hms`） | 文档未说明 | 长期记忆 | — | 文档写的是“长期记忆”，归不进固定选项 |
| Hyperconsciousness（`hyperconsciousness`） | 文档未说明 | 知识 | — | 文档写的是“知识”，归不进固定选项 |
| Kremis（`kremis`） | 文档未说明 | 知识图 | — | 文档写的是“知识图”，归不进固定选项 |
| Kybase（`kybase`） | 文档未说明 | 笔记＋长期记忆 | — | 文档写的是“笔记＋长期记忆”，归不进固定选项 |
| LangMem（`langmem`） | 文档未说明 | 长期记忆 | — | 文档写的是“长期记忆”，归不进固定选项 |
| mcp-agent-memory（`mcp-agent-memory`） | 文档未说明 | 记忆文件 | — | 文档写的是“记忆文件”，归不进固定选项 |
| MemEngine（`memengine`） | 文档未说明 | 多种记忆模型 | — | 文档写的是“多种记忆模型”，归不进固定选项 |
| memgres（`memgres`） | 文档未说明 | 文档 | — | 文档写的是“文档”，归不进固定选项 |
| memo（`memo`） | 文档未说明 | 编程记忆 | — | 文档写的是“编程记忆”，归不进固定选项 |
| MemoryBear（`memorybear`） | 文档未说明 | 知识 | — | 文档写的是“知识”，归不进固定选项 |
| MemoryMesh（`memorymesh`） | 文档未说明 | 故事世界与角色 | — | 文档写的是“故事世界与角色”，归不进固定选项 |
| Omnigraph（`omnigraph`） | 文档未说明 | 图数据 | — | 文档写的是“图数据”，归不进固定选项 |
| roampal-core（`roampal-core`） | 文档未说明 | 编程记忆 | — | 文档写的是“编程记忆”，归不进固定选项 |
| Shared Diary MCP（`shared-diary-mcp`） | 文档未说明 | 共同书写的日记与回应 | — | 文档写的是“共同书写的日记与回应”，归不进固定选项 |
| Statewave（`statewave`） | 文档未说明 | 情节与编译记忆 | — | 文档写的是“情节与编译记忆”，归不进固定选项 |
| Text2Mem（`text2mem`） | 文档未说明 | 通用记忆操作 | — | 文档写的是“通用记忆操作”，归不进固定选项 |
| WrenWen（`wrenwen`） | 文档未说明 | 伴侣系统整体设计 | — | 文档写的是“伴侣系统整体设计”，归不进固定选项 |
| ZenBrain（`zenbrain`） | 文档未说明 | 多层记忆 | — | 文档写的是“多层记忆”，归不进固定选项 |

## `write_mode` 记忆怎么写入（73 处）

| 项目 | 状态 | 原文 | 建议值 | 不确定的地方 |
|---|---|---|---|---|
| Acontext（`acontext`） | 文档未说明 | — | — | README 没提写入方式 |
| Agent Zero（`agent-zero`） | 文档未说明 | — | — | README 没提写入方式 |
| 给 AI 伴侣装思考链和情绪（`ai-companion-cot-emotion`） | 文档未说明 | — | — | README 没提写入方式 |
| 把 AI 伴侣搬进 Telegram（`ai-companion-telegram-guide`） | 文档未说明 | — | — | README 没提写入方式 |
| AI 日常规则教程（`ai-daily-rules-tutorial`） | 文档未说明 | — | — | README 没提写入方式 |
| AI Pocket Chat（`ai-pocket-chat`） | 文档未说明 | 长期／近期记忆；— | — | 原表写入方式未识别：长期／近期记忆；—；— |
| AIGNE AFS（Agentic File System）（`aigne-framework`） | 文档未说明 | — | — | README 没提写入方式 |
| alethech（`alethech`） | 文档未说明 | — | — | README 没提写入方式 |
| archon-memory-core（`archon-memory-core`） | 文档未说明 | — | — | README 没提写入方式 |
| 我会永远陪着你（AstrBot 陪伴插件）（`astrbot-plugin-private-companion`） | 文档未说明 | — | — | README 没提写入方式 |
| AstrBot 主动消息插件（`astrbot-plugin-proactive-chat`） | 文档未说明 | — | — | README 没提写入方式 |
| AtMem（`atmem`） | 文档未说明 | — | — | README 没提写入方式 |
| 和机的另一个家 ChatNest UI（`chatnest-ui`） | 文档未说明 | 模型通过接口写记忆，后端去重；去重时 | — | 原表写入方式未识别：模型通过接口写记忆，后端去重；去重时；近似去重，前端标红、人来定夺 |
| Chord Affect Anchors（`chord-affect-anchors`） | 文档未说明 | — | — | README 没提写入方式 |
| claude-handoff（`claude-handoff`） | 文档未说明 | — | — | README 没提写入方式 |
| 云与岛（`cloud-and-island`） | 文档未说明 | — | — | README 没提写入方式 |
| Companion Emergence（`companion-emergence`） | 文档未说明 | 角色自己把多轮验证过的记忆结晶为“灵魂”；可选：审阅灵魂记忆 | — | 原表写入方式未识别：角色自己把多轮验证过的记忆结晶为“灵魂”；可选：审阅灵魂记忆；灵魂记忆可审阅、可撤销，不会被悄悄改写 |
| connectome-host（`connectome-host`） | 文档未说明 | — | — | README 没提写入方式 |
| context-manager（Connectome）（`context-manager`） | 文档未说明 | — | — | README 没提写入方式 |
| context-slim（`context-slim`） | 文档未说明 | — | — | README 没提写入方式 |
| dreams.js（`dreams`） | 文档未说明 | — | — | README 没提写入方式 |
| DreamVault（`dreamvault`） | 文档未说明 | 不负责写入；在写入闸口检查记忆有没有事实锚点；不由人介入，机器闸口拦截 | — | 原表写入方式未识别：不负责写入；在写入闸口检查记忆有没有事实锚点；不由人介入，机器闸口拦截；写入闸口检查事实锚点，不通过即隔离；只有 AI 本人能认领 |
| Drivesoid（`drivesoid`） | 文档未说明 | 你的桥接层上报对话事件；— | — | 原表写入方式未识别：你的桥接层上报对话事件；—；— |
| 情绪系统（bvsden）（`emotion-system`） | 文档未说明 | — | — | README 没提写入方式 |
| Eventide（`eventide`） | 文档未说明 | — | — | README 没提写入方式 |
| Summaryception（`extension-summaryception`） | 文档未说明 | — | — | README 没提写入方式 |
| forge-reload（`forge-reload`） | 文档未说明 | — | — | README 没提写入方式 |
| Headlong（`headlong`） | 文档未说明 | — | — | README 没提写入方式 |
| HMS（`hms`） | 文档未说明 | — | — | README 没提写入方式 |
| HoneyOS（`honey-os`） | 文档未说明 | 身份、关系、用户三类记忆写入文件；关系记忆需双方确认；确认关系约定时 | — | 原表写入方式未识别：身份、关系、用户三类记忆写入文件；关系记忆需双方确认；确认关系约定时；关系记忆需双方确认；高风险操作先确认 |
| 把乌鸦留在身边（`keep-the-crow`） | 文档未说明 | — | — | README 没提写入方式 |
| kimi-room（`kimi-room`） | 文档未说明 | 换窗时把旧窗口总结存入浏览器；整理时 | — | 原表写入方式未识别：换窗时把旧窗口总结存入浏览器；整理时；记忆回顾页人工整理 |
| Kin 的小脑瓜（Kin Mind）（`kin-mind`） | 文档未说明 | — | — | README 没提写入方式 |
| LangMem（`langmem`） | 文档未说明 | — | — | README 没提写入方式 |
| langstate（`langstate`） | 文档未说明 | — | — | README 没提写入方式 |
| Loci（`loci`） | 文档未说明 | — | — | README 没提写入方式 |
| Mastra（`mastra`） | 文档未说明 | — | — | README 没提写入方式 |
| Mem0（`mem0`） | 文档未说明 | — | — | README 没提写入方式 |
| mem9（`mem9`） | 文档未说明 | — | — | README 没提写入方式 |
| MemEngine（`memengine`） | 文档未说明 | — | — | README 没提写入方式 |
| Memex（`memex-lab-memex`） | 文档未说明 | 你随手记录，多个 AI 助手整理成卡片；— | — | 原表写入方式未识别：你随手记录，多个 AI 助手整理成卡片；—；无专门机制 |
| Memobase（`memobase`） | 文档未说明 | — | — | README 没提写入方式 |
| mnemos（vishalbanwari26）（`mnemos`） | 文档未说明 | — | — | README 没提写入方式 |
| Mnemosyne（OpenClaw/Hermes 版）（`mnemosyne-agentmemory-engine-openclaw-hermes`） | 文档未说明 | — | — | README 没提写入方式 |
| NemoLore（`nemolore`） | 文档未说明 | — | — | README 没提写入方式 |
| 不会消失的恋人（`not-fade-away`） | 文档未说明 | — | — | README 没提写入方式 |
| OmniDimen Emotion（`omnidimen-emotion`） | 文档未说明 | 训练期通过微调内化；— | — | 原表写入方式未识别：训练期通过微调内化；—；— |
| Open WebUI Memory（`open-webui-memory`） | 文档未说明 | — | — | README 没提写入方式 |
| OptMem（`optmem`） | 文档未说明 | — | — | README 没提写入方式 |
| 草履虫 Paramecium（`paramecium`） | 文档未说明 | 原文机械入库；小模型摘录信息点，必须附可校验的逐字引用；不需要人 | — | 原表写入方式未识别：原文机械入库；小模型摘录信息点，必须附可校验的逐字引用；不需要人；机器校验摘录的逐字引用；矛盾时旧条目标记“被取代”，不删除 |
| 药盒 pilulier（`pilulier`） | 文档未说明 | — | — | README 没提写入方式 |
| Portable AI Memory SDK（`python-sdk`） | 文档未说明 | — | — | README 没提写入方式 |
| ReMe（`reme`） | 文档未说明 | — | — | README 没提写入方式 |
| Resonant Mind（`resonant-mind`） | 文档未说明 | AI 调用 write、record 等工具写入；可选：调用修订工具 | — | 原表写入方式未识别：AI 调用 write、record 等工具写入；可选：调用修订工具；Surgery 区可编辑、删除、归档；身份修改有提案机制 |
| ReSpark（`respark`） | 文档未说明 | — | — | README 没提写入方式 |
| RikkaHub Jude（`rikkahub-auto-compress`） | 文档未说明 | — | — | README 没提写入方式 |
| Second Me（`second-me`） | 文档未说明 | — | — | README 没提写入方式 |
| ShadowGraph（`shadowgraph`） | 文档未说明 | — | — | README 没提写入方式 |
| Presence（`sillytavern-presence`） | 文档未说明 | — | — | README 没提写入方式 |
| Statewave（`statewave`） | 文档未说明 | — | — | README 没提写入方式 |
| Claude Code 换窗教程（精炼续窗）（`swap-tutorial`） | 文档未说明 | — | — | README 没提写入方式 |
| TeleMem（`telemem`） | 文档未说明 | 程序调用 add，由 LLM 抽取角色化摘要；不需要人 | — | 原表写入方式未识别：程序调用 add，由 LLM 抽取角色化摘要；不需要人；LLM 语义聚类，融合、更新、去重相似记忆 |
| TencentDB Agent Memory（`tencentdb-agent-memory`） | 文档未说明 | — | — | README 没提写入方式 |
| Text2Mem（`text2mem`） | 文档未说明 | — | — | README 没提写入方式 |
| 三天没睡（`three-days-no-sleep`） | 文档未说明 | README 未描述；— | — | 原表写入方式未识别：README 未描述；—；— |
| Tidefall（`tidefall`） | 文档未说明 | — | — | README 没提写入方式 |
| Timeline Memory（`timeline-memory`） | 文档未说明 | — | — | README 没提写入方式 |
| TokenMizer（`tokenmizer`） | 文档未说明 | — | — | README 没提写入方式 |
| VCPToolBox（`vcptoolbox`） | 文档未说明 | — | — | README 没提写入方式 |
| VectHare（`vecthare`） | 文档未说明 | — | — | README 没提写入方式 |
| WrenWen（`wrenwen`） | 文档未说明 | — | — | README 没提写入方式 |
| Yoji（`yoji`） | 文档未说明 | 用户画像写入 AGENTS.md；长对话生成摘要；— | — | 原表写入方式未识别：用户画像写入 AGENTS.md；长对话生成摘要；—；— |
| Yorishiro（`yorishiro`） | 文档未说明 | 角色按人格写日记，要点累积进 memories.md；— | — | 原表写入方式未识别：角色按人格写日记，要点累积进 memories.md；—；— |

## `forgetting` 怎么遗忘（74 处）

| 项目 | 状态 | 原文 | 建议值 | 不确定的地方 |
|---|---|---|---|---|
| A-MEM（`a-mem`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Acontext（`acontext`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Agent Zero（`agent-zero`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| AI Pocket Chat（`ai-pocket-chat`） | 文档未说明 | README 未描述 | — | 原表：README 未描述；— |
| AIGNE AFS（Agentic File System）（`aigne-framework`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| alethech（`alethech`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| AstrBot 主动消息插件（`astrbot-plugin-proactive-chat`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Basic Memory（`basic-memory`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Chord Affect Anchors（`chord-affect-anchors`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| claude-handoff（`claude-handoff`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Claude-Mem（`claude-mem`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Claude Soul（`claude-soul`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Context-Keeper（`context-keeper`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| context-manager（Connectome）（`context-manager`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| ContextLattice（`contextlattice`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| cosmos-mcp（`cosmos-mcp`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Cyberboss（`cyberboss`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| 守护猴 Daemonkey（`daemonkey-agent`） | 文档未说明 | README 未描述 | — | 原表：README 未描述；— |
| 情绪系统（bvsden）（`emotion-system`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Eventide（`eventide`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| EverOS（`everos`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| fable（`fable`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| GBrain（`gbrain`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Hindsight（`hindsight`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| HMS（`hms`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Honcho（`honcho`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| HoneyOS（`honey-os`） | 文档未说明 | README 未描述 | — | 原表：README 未描述；— |
| Hyperconsciousness（`hyperconsciousness`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| InternalBeyond 移动版（`internalbeyond-mobile`） | 文档未说明 | README 未描述 | — | 原表：README 未描述；— |
| KI-CO 小屋（`ki-co`） | 文档未说明 | README 未描述 | — | 原表：README 未描述；— |
| Kremis（`kremis`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Kybase（`kybase`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| LangMem（`langmem`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| langstate（`langstate`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Letta（原 MemGPT）（`letta`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| LightMem（`lightmem`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Loci（`loci`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| LoreRoom（`loreroom`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Magnemo（`magnemo`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Mastra（`mastra`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| MemEngine（`memengine`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| MemMachine（`memmachine`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| MemoCall（`memocall`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| MemoryOS（`memoryos`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| MemOS（`memos`） | 文档未说明 | README 未描述 | — | 原表：README 未描述；— |
| MemPalace（`mempalace`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Mengram（`mengram`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| MIRIX（`mirix`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Myco（`myco`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| NemoLore（`nemolore`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| OmniDimen Emotion（`omnidimen-emotion`） | 文档未说明 | 不适用 | — | 原表：不适用；— |
| Omnigraph（`omnigraph`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Open WebUI Memory（`open-webui-memory`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| OpenViking（`openviking`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| 药盒 pilulier（`pilulier`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Prism Coder（`prism-mcp`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Psycheros（`psycheros`） | 文档未说明 | README 未描述 | — | 原表：README 未描述；— |
| Portable AI Memory SDK（`python-sdk`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| ReMe（`reme`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Remnic（`remnic`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| ReSpark（`respark`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Sapphire（`sapphire`） | 文档未说明 | README 未描述 | — | 原表：README 未描述；— |
| Memory Books（`sillytavern-memorybooks`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Qvink Memory（`sillytavern-messagesummarize`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| SimpleMem（`simplemem`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| SAME（`statelessagent`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Talamus（`talamus`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| TencentDB Agent Memory（`tencentdb-agent-memory`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| 三天没睡（`three-days-no-sleep`） | 文档未说明 | README 未描述 | — | 原表：README 未描述；— |
| Tidefall（`tidefall`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| VCPToolBox（`vcptoolbox`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| WrenWen（`wrenwen`） | 文档未说明 | — | — | README 没提遗忘或删除 |
| Yoji（`yoji`） | 文档未说明 | README 未描述 | — | 原表：README 未描述；— |
| Yuralume Core（`yuralume-core`） | 文档未说明 | README 未描述 | — | 原表：README 未描述；— |

## `human_review` 能否查看和修改记忆（24 处）

| 项目 | 状态 | 原文 | 建议值 | 不确定的地方 |
|---|---|---|---|---|
| vMem（`0compactmem`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| A-MEM（`a-mem`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| AI 日常规则教程（`ai-daily-rules-tutorial`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| 我会永远陪着你（AstrBot 陪伴插件）（`astrbot-plugin-private-companion`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| Being（`being`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| Chord Affect Anchors（`chord-affect-anchors`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| claude-find（`claude-find`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| context-manager（Connectome）（`context-manager`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| DreamVault（`dreamvault`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| EchoVault（`echovault`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| 情绪系统（bvsden）（`emotion-system`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| HMS（`hms`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| kimi-core（`kimi-core`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| LangMem（`langmem`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| LoreRoom（`loreroom`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| MemEngine（`memengine`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| MemMachine（`memmachine`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| MemoryOS（`memoryos`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| Myco（`myco`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| OmniDimen Emotion（`omnidimen-emotion`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| Qvink Memory（`sillytavern-messagesummarize`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| Statewave（`statewave`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| Claude Code 换窗教程（精炼续窗）（`swap-tutorial`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |
| VectHare（`vecthare`） | 文档未说明 | — | — | 没找到查看或修改记忆的方式 |

## `export` 能否导出（166 处）

| 项目 | 状态 | 原文 | 建议值 | 不确定的地方 |
|---|---|---|---|---|
| A-MEM（`a-mem`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Acheron（`acheron-mcp-server`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Aelios（`aelios`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| agent-memory（g1itchbot）（`agent-memory`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Agent Zero（`agent-zero`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| agentic-recall（`agentic-recall`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| AgentRecall（`agentrecall`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| 给 AI 伴侣装思考链和情绪（`ai-companion-cot-emotion`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| 把 AI 伴侣搬进 Telegram（`ai-companion-telegram-guide`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| AI 日常规则教程（`ai-daily-rules-tutorial`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| AI Pocket Chat（`ai-pocket-chat`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| AIGNE AFS（Agentic File System）（`aigne-framework`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| archon-memory-core（`archon-memory-core`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| LivingMemory（`astrbot-plugin-livingmemory`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| 我会永远陪着你（AstrBot 陪伴插件）（`astrbot-plugin-private-companion`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| AstrBot 主动消息插件（`astrbot-plugin-proactive-chat`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| AstrBot 自主学习（`astrbot-plugin-self-learning`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| AutoMem（`automem`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| memex（ayushagrawal288）（`ayushagrawal288-memex`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Being（`being`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| birkin-mnemosyne（`birkin-mnemosyne`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| causal-memory（`causal-memory`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| 和机的另一个家 ChatNest UI（`chatnest-ui`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Chord Affect Anchors（`chord-affect-anchors`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| claude-find（`claude-find`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Claude Imprint（`claude-imprint`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Claude-Mem（`claude-mem`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Claude Soul（`claude-soul`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| 云与岛（`cloud-and-island`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Cometline（`cometline`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Companion Emergence（`companion-emergence`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Context-Keeper（`context-keeper`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| context-manager（Connectome）（`context-manager`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| context-slim（`context-slim`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| ContextLattice（`contextlattice`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| cosmos-mcp（`cosmos-mcp`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| CRBRO（`crbro-memory`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Cyberboss（`cyberboss`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| 守护猴 Daemonkey（`daemonkey-agent`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| dreams.js（`dreams`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| DreamVault（`dreamvault`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Drivesoid（`drivesoid`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| DuduLove Memory（`dudulove-memory`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Dylan Heartbeat（`dylan-heartbeat`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Echo Mistik（`echo-mistik`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| EchoVault（`echovault`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| 情绪系统（bvsden）（`emotion-system`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Eros Engine（`eros-engine`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Eventide（`eventide`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| EverOS（`everos`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Engram（FBISiri）（`fbisiri-engram`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| FluctlightDB（`fluctlightdb`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| forge-reload（`forge-reload`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| GENOME（`genome`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Graphiti（Zep）（`graphiti`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Headlong（`headlong`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Hindsight（`hindsight`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Hipocampo（`hipocampo`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| HMS（`hms`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Honcho（`honcho`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| HoneyOS（`honey-os`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Hyperconsciousness（`hyperconsciousness`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| IAI 个人记忆引擎（`iai-personal-memory-engine`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Jarvis Orb（`jarvis-orb`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| 把乌鸦留在身边（`keep-the-crow`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| kimi-core（`kimi-core`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| kimi-room（`kimi-room`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Kin 的小脑瓜（Kin Mind）（`kin-mind`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Kremis（`kremis`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| LangMem（`langmem`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| langstate（`langstate`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| L.I.F.E.（`life`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| LightMem（`lightmem`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| notebook.py（`llmcompressor`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| LocalKeep（`localkeep`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Loci（`loci`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| LoreRoom（`loreroom`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Mastra（`mastra`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| mcp-agent-memory（`mcp-agent-memory`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| mem0-mcp-selfhosted（`mem0-mcp-selfhosted`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Mem0（`mem0`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| mem9（`mem9`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| MemEngine（`memengine`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| memgres（`memgres`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| MemHeaven（`memheaven`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| MemMachine（`memmachine`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Memobase（`memobase`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| MemoCall（`memocall`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Memora（`memora`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Memori（`memori`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| memory-mcp-1file（`memory-mcp-1file`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Memory MCP（michael-denyer）（`memory-mcp`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| /memory（maxtechera）（`memory`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| MemoryBear（`memorybear`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| 记忆星图 Memory Constellations（`memoryconstellations`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| MemoryMesh（`memorymesh`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| MemoryOS（`memoryos`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| MemoryZ（`memoryz`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| MemOS（`memos`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| MemPalace（`mempalace`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| memU（`memu`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Mengram（`mengram`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| MIRA OS（`mira-oss`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| MIRIX（`mirix`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Mnemo Cortex（`mnemo-cortex`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| mnemory（`mnemory`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| mnemos（vishalbanwari26）（`mnemos`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Mnemosyne（OpenClaw/Hermes 版）（`mnemosyne-agentmemory-engine-openclaw-hermes`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| MochiBot（`mochibot`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Myco（`myco`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| NemoLore（`nemolore`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| 不会消失的恋人（`not-fade-away`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Ocean（`ocean`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| OMEGA（`omega-memory`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| omemo（`omemo`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| OmniDimen Emotion（`omnidimen-emotion`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Omnigraph（`omnigraph`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Open WebUI Memory（`open-webui-memory`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| OpenHer（`openher`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| LongMemory（原 OpenMemory）（`openmemory`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| OpenViking（`openviking`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| OptMem（`optmem`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| 草履虫 Paramecium（`paramecium`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Personal Understanding（`personal-understanding`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| 药盒 pilulier（`pilulier`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| PowerContext（原 PowerMem）（`powermem`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Psycheros（`psycheros`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| ReMe（`reme`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Remembra Relay（`remembra`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Resonant Mind（`resonant-mind`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| RetainDB（`retaindb`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| RikkaHub Jude（`rikkahub-auto-compress`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| roampal-core（`roampal-core`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Sapphire（`sapphire`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Second Me（`second-me`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Knowledge Graph Memory Server（MCP 官方）（`servers`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Shodh-Memory（`shodh-memory`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Memory Books（`sillytavern-memorybooks`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Qvink Memory（`sillytavern-messagesummarize`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Presence（`sillytavern-presence`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| ReMemory（`sillytavern-rememory`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| SimpleMem（`simplemem`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Smart Memory（`smart-memory`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Qdrant Memory（`st-qdrant-memory`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| SAME（`statelessagent`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Statewave（`statewave`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Supermemory（`supermemory`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Claude Code 换窗教程（精炼续窗）（`swap-tutorial`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Synapse（`synapse`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Synthetic Heart（`synthetic-heart`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Talamus（`talamus`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| taOSmd（`taosmd`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| TeleMem（`telemem`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| TencentDB Agent Memory（`tencentdb-agent-memory`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Text2Mem（`text2mem`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| 三天没睡（`three-days-no-sleep`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Tidefall（`tidefall`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| TokenMizer（`tokenmizer`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| VCPToolBox（`vcptoolbox`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| VectHare（`vecthare`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| weighted-compact（`weighted-compact`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| WrenWen（`wrenwen`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| 心潮念（`xinchao-nian`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Yorishiro（`yorishiro`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| Yuralume Core（`yuralume-core`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |
| ZenBrain（`zenbrain`） | 文档未说明 | — | — | 没写导出功能，也看不出数据格式 |

## `data_passes_through` 数据经过谁的服务器（6 处）

| 项目 | 状态 | 原文 | 建议值 | 不确定的地方 |
|---|---|---|---|---|
| 给 AI 伴侣装思考链和情绪（`ai-companion-cot-emotion`） | 文档未说明 | — | — | 运行位置未识别 |
| 和机的另一个家 ChatNest UI（`chatnest-ui`） | 文档未说明 | — | — | 运行位置未识别 |
| Chord Affect Anchors（`chord-affect-anchors`） | 文档未说明 | — | — | 运行位置未识别 |
| DreamVault（`dreamvault`） | 文档未说明 | — | — | 运行位置未识别 |
| 药盒 pilulier（`pilulier`） | 文档未说明 | — | — | 运行位置未识别 |
| WrenWen（`wrenwen`） | 文档未说明 | — | — | 运行位置未识别 |

## `license_category` 许可证类别（5 处）

| 项目 | 状态 | 原文 | 建议值 | 不确定的地方 |
|---|---|---|---|---|
| 把乌鸦留在身边（`keep-the-crow`） | 文档未说明 | 其它（见仓库） | — | 许可证原文：其它（见仓库） |
| Mastra（`mastra`） | 文档未说明 | 其它（见仓库） | — | 许可证原文：其它（见仓库） |
| 笔记库当记忆（Obsidian 等本地 Markdown 笔记）（`method-note-vault`） | 文档未说明 | — | — | 没有许可证信息 |
| Notion 当记忆（官方远程 MCP）（`method-notion`） | 文档未说明 | — | — | 没有许可证信息 |
| 不会消失的恋人（`not-fade-away`） | 文档未说明 | 其它（见仓库） | — | 许可证原文：其它（见仓库） |
