# 阶段 1 待审核清单：字段规范化

> 由 `scripts/normalize.py` 生成，不要手改本文件。要修改结论，请在 `docs/review-normalization.xlsx` 的「负责人确认值」一列填写，
> 然后运行 `python -X utf8 scripts/normalize.py --apply-review`。确认值存入 `data/normalization_overrides.json`，以后重新生成也会保留。
> 填写方式：同意建议值就填「同意」；要改就填英文代码（多个用逗号分隔，如 `mcp, gateway`）；留空表示暂不处理。

所有判断都来自说明文档（README）和原表，**没有实际安装验证**。规则拿不准的字段不猜，标为待审核列在下面，附原文、建议值和理由。

## 每个字段的处理情况

| 字段 | 含义与可选值 | 规则判定 | 待审核 | 已确认 |
|---|---|---|---|---|
| `access` | `mcp` MCP（让 AI 调用外部工具的通用接口）；`gateway` 网关／代理（挂在助手和模型之间）；`host_plugin` 宿主插件（含钩子、技能）；`library` 代码库（要写代码调用）；`standalone_app` 独立应用 | 176 | 3 | 0 |
| `compatible_clients` | `claude_desktop` Claude 桌面版；`claude_web_mobile` Claude 网页／手机版；`claude_code` Claude Code；`chatgpt` ChatGPT；`openai_compatible` 任意 OpenAI 兼容客户端；`any_mcp_client` 任意 MCP 客户端；`cursor` Cursor；`codex` Codex；`gemini_cli` Gemini CLI；`opencode` OpenCode；`openclaw` OpenClaw；`hermes` Hermes；`astrbot` AstrBot；`sillytavern` SillyTavern；`open_webui` Open WebUI；`telegram` Telegram；`wechat` 微信；`feishu` 飞书；`discord` Discord；`self_contained` 自带界面（不接其它助手）；`developer_built` 开发者自建的应用 | 173 | 6 | 0 |
| `runs_on` | `own_computer` 自己的电脑；`own_server` 自己的服务器；`own_cloud_account` 自己的云账号；`phone` 手机；`third_party_hosted` 别人的服务器（托管） | 177 | 2 | 0 |
| `os` | `windows` Windows；`macos` macOS；`linux` Linux；`android` 安卓；`ios` iOS；`any` 任何系统（浏览器即可） | 168 | 11 | 0 |
| `difficulty` | `low` 低：应用商店或一键安装；`medium` 中：几条命令或按向导填设置；`high` 高：要写代码或改较多配置 | 179 | 0 | 0 |
| `cost` | `free` 免费；`model_fees_only` 只需模型调用费；`paid_service` 需付费服务或订阅 | 156 | 23 | 0 |
| `accounts_needed` | `none` 不需要；`github` GitHub；`cloudflare` Cloudflare；`render` Render；`model_api_key` 模型接口密钥；`vendor_account` 项目方账号；`telegram` Telegram 机器人；`claude_subscription` Claude 付费套餐 | 134 | 45 | 0 |
| `memory_subject` | `user_facts` 用户本人的事实和偏好；`ai_identity` AI 自身身份与关系；`experience` 做事经验；`task_context` 当前任务上下文；`conversation_history` 历史对话原文 | 153 | 26 | 0 |
| `write_mode` | `auto` 自动记；`review_first` 先出候选再由人审核；`on_request` 由 AI 或用户主动调用时才记 | 56 | 123 | 0 |
| `forgetting` | `auto_decay` 自动衰减；`archive` 沉底归档（不删除）；`manual_only` 手动删除；`none` 不遗忘 | 35 | 144 | 0 |
| `human_review` | `dashboard` 网页面板／应用界面；`files` 直接看改文件；`cli` 命令行；`tools` 让 AI 调工具改 | 161 | 18 | 0 |
| `export` | `markdown` Markdown；`json` JSON；`sqlite` SQLite 数据库文件；`other_file` 其它文件格式；`none` 无 | 49 | 130 | 0 |
| `data_passes_through` | `local_only` 仅本机或自己的服务器；`own_cloud` 用户自己的云账号；`third_party` 第三方服务器 | 177 | 2 | 0 |
| `license_category` | `permissive` 宽松；`copyleft` 要求开源衍生作品；`noncommercial` 禁止商用；`source_available` 源码可见但限制使用；`no_license` 无许可证文件 | 176 | 3 | 0 |
| `persona_continuity` | **人格／身份连续性**：专门保存 AI 自身的人格、身份、关系，换窗、换模型后仍是同一个“TA”。`yes` 有；`not_mentioned` 未提及 | 179 | 0 | 0 |
| `window_handoff` | **换窗续接**：新会话自动带入上次的上下文或交接摘要，或在上下文压缩前保存，减少换窗丢细节。`yes` 有；`not_mentioned` 未提及 | 179 | 0 | 0 |
| `cross_client` | **跨入口共享**：同一份记忆可给多个客户端或设备用（如网页、手机、Claude Code 共用）。`yes` 有；`not_mentioned` 未提及 | 179 | 0 | 0 |
| `verbatim` | **保留原话**：存下对话原文，结论可追溯到原话，而不只是摘要。`yes` 有；`not_mentioned` 未提及 | 179 | 0 | 0 |
| `multimodal` | **多模态记忆**：能记住图片、语音、视频等非文字内容。`yes` 有；`not_mentioned` 未提及 | 179 | 0 | 0 |
| `time_awareness` | **时间感**：记忆带时间线或时间戳，知道过了多久、事实何时有效。`yes` 有；`not_mentioned` 未提及 | 179 | 0 | 0 |
| `dream_consolidation` | **梦境／离线整理**：在夜间、空闲或定期自动整理、合并、反思记忆。`yes` 有；`not_mentioned` 未提及 | 179 | 0 | 0 |
| `emotion` | **情绪记忆**：记录情绪、心境，或用情感强度给记忆加权。`yes` 有；`not_mentioned` 未提及 | 179 | 0 | 0 |
| `proactive` | **主动性**：AI 会主动联系或提起（主动消息、定时问候、心跳任务）。`yes` 有；`not_mentioned` 未提及 | 179 | 0 | 0 |
| `pinning` | **钉选重要记忆**：可把重要记忆标为核心、永不衰减或锁定。`yes` 有；`not_mentioned` 未提及 | 179 | 0 | 0 |
| `error_guard` | **记错防护**：能纠错、取代旧事实、检测冲突、追溯来源或回滚，防止记错越记越真。`yes` 有；`not_mentioned` 未提及 | 179 | 0 | 0 |
| `import_history` | **迁入旧记录**：能导入 ChatGPT、Claude 等平台导出的聊天记录或别的记忆库数据。`yes` 有；`not_mentioned` 未提及 | 179 | 0 | 0 |

共 179 个项目、536 处待审核。另有 `paper_taxonomy`（论文分类）直接沿用原表，只有原表 50 个项目有。

说明：

- 多选字段（如 `access`、`compatible_clients`）可以有多个值，用英文逗号分隔。
- `os`：README 没写明但用 npx、pip、Docker 等跨平台方式安装的，按 Windows/macOS/Linux 都能用处理（理由里会注明“推断”）。
- `data_passes_through` 只看记忆服务本身存在哪里；用云端大模型时，对话还会发给模型提供方，网站上会统一说明。
- `difficulty` 原文是区间（如“低到中”）时取较高一档。

## 用户在意的特性一览

判定为“有”的项目。依据是原表、说明和 README；README 里的命中已由 Claude 逐条核对，误判记在 `scripts/feature_rules.py`。“未提及”只表示文档没写，不等于没有。要更正某一项，同样在 xlsx 里填写（xlsx 另有“特性”页列出全部判定）。

- **人格／身份连续性**（30 个）：专门保存 AI 自身的人格、身份、关系，换窗、换模型后仍是同一个“TA”。
  Aelios、agent-memory（g1itchbot）、LivingMemory、AstrBot 自主学习、Being、birkin-mnemosyne、Bitterbot、Claude Soul、Companion Emergence、守护猴 Daemonkey、Echo Mistik、Eros Engine、HoneyOS、KI-CO 小屋、L.I.F.E.、记忆星图 Memory Constellations、MIRA OS、Nocturne Memory、OpenHer、草履虫 Paramecium、Psycheros、Resonant Mind、Resonant、Sapphire、Synthetic Heart、TeleMem、心潮念、Yoji、Yorishiro、Yuralume Core
- **换窗续接**（69 个）：新会话自动带入上次的上下文或交接摘要，或在上下文压缩前保存，减少换窗丢细节。
  vMem、Aelios、agent-memory（g1itchbot）、AgentRecall、Basic Memory、Being、birkin-mnemosyne、causal-memory、Central Intelligence、claude-handoff、Claude-Mem、Claude Soul、context-memory、ContextLattice、CRBRO、Drivesoid、EchoVault、engram-rs、fable、Facthouse、Graph Memory、Hipocampo、HMS、Honcho、HoneyOS、Hyperconsciousness、IAI 个人记忆引擎、inspeximus、Jarvis Orb、kimi-room、L.I.F.E.、notebook.py、Magnemo、mcp-agent-memory、mcp-memory-service、mem0-mcp-selfhosted、MemHeaven、memkeeper、memo、MemoCall、memory-lancedb-pro、memory-mcp-1file、Memory MCP（michael-denyer）、Mengram、Midas、Mind Map、MIRA OS、mneme、Mnemo Cortex、mnemo、mnemostack、Neotoma、Nocturne Memory、Ombre Brain、OMEGA、LongMemory（原 OpenMemory）、草履虫 Paramecium、爪迹 Pawwake、Piia Engram、Prism Coder、Remembra Relay、RetainDB、roampal-core、SAME、TokenMizer、Tree Ring Memory、Engram（tstockham96）、weighted-compact、YourMemory
- **跨入口共享**（65 个）：同一份记忆可给多个客户端或设备用（如网页、手机、Claude Code 共用）。
  vMem、Acheron、Acontext、Aelios、afair、Akephalos、AtMem、Aura Memory、Basic Memory、birkin-mnemosyne、Celiums Memory、Central Intelligence、Compartment、ContextLattice、cosmos-mcp、守护猴 Daemonkey、EverOS、Facthouse、Engram（FBISiri）、GBrain、Graph Memory、Hindsight、Hipocampo、Honcho、Hyperconsciousness、imprint-memory、Kremis、Kybase、Longhand、lore、mcp-memory-service、mem9、memkeeper、memo、memory-lancedb-pro、MemOS、MemTether、memU、Mengram、Midas、Mind Map、mneme、Mnemo Cortex、mnemo、Neotoma、Nocturne Memory、Ombre Brain、OMEGA、Omnigraph、people-context、Piia Engram、Prism Coder、Psycheros、ReMe、Remembra Relay、Remnic、SAME、Synapse、Synthetic Heart、TeleMem、TencentDB Agent Memory、Engram（tstockham96）、YourMemory、Yuralume Core、ZenBrain
- **保留原话**（33 个）：存下对话原文，结论可追溯到原话，而不只是摘要。
  Aelios、agentic-recall、Alaya、LivingMemory、Aura Memory、causal-memory、Central Intelligence、claude-find、Companion Emergence、DreamVault、fable、Facthouse、Hindsight、IAI 个人记忆引擎、imprint-memory、Longhand、LoreRoom、MemHeaven、memo、MemoCall、记忆星图 Memory Constellations、Midas、Mind Map、Mnemo Cortex、Mnemosyne（OpenClaw/Hermes 版）、Ombre Brain、草履虫 Paramecium、爪迹 Pawwake、Personal Understanding、Remnic、taOSmd、TeleMem、TencentDB Agent Memory
- **多模态记忆**（19 个）：能记住图片、语音、视频等非文字内容。
  AI Pocket Chat、Bitterbot、EverOS、Facthouse、Graphiti（Zep）、HMS、imprint-memory、Memex、memo、MemOS、mnemostack、Neotoma、Omnigraph、Prism Coder、Tessera、Sapphire、Supermemory、TeleMem、TokenMizer
- **时间感**（54 个）：记忆带时间线或时间戳，知道过了多久、事实何时有效。
  AgentRecall、AI Pocket Chat、Aura Memory、Celiums Memory、claude-handoff、Claude-Mem、Claude Soul、Companion Emergence、Compartment、Context-Keeper、ContextLattice、fable、Facthouse、GENOME、Graph Memory、Graphiti（Zep）、imprint-memory、KI-CO 小屋、lean-memory、notebook.py、LocalKeep、Longhand、Mem0、Memex、MemHeaven、memo、Memobase、Memora、memory-mcp-1file、MemoryBear、MemTether、Midas、Mímir、MIRA OS、mneme、mnemo、mnemostack、墨知 MoRead、OMEGA、LongMemory（原 OpenMemory）、people-context、Personal Understanding、Piia Engram、Tessera、Psycheros、Remembra Relay、Remnic、Sapphire、ShadowGraph、Statewave、Talamus、Engram（tstockham96）、Utsuwa、Yuralume Core
- **梦境／离线整理**（81 个）：在夜间、空闲或定期自动整理、合并、反思记忆。
  Aelios、afair、agent-memory（g1itchbot）、agentic-recall、AgentRecall、Alaya、archon-memory-core、LivingMemory、Aura Memory、Being、Bitterbot、causal-memory、Celiums Memory、Claude Soul、Cometline、Companion Emergence、Compartment、CRBRO、DreamVault、Drivesoid、Echo Mistik、engram-rs、EverOS、Facthouse、Engram（FBISiri）、FluctlightDB、GBrain、GENOME、Graph Memory、Engram（HBarefoot）、Hindsight、Hipocampo、IAI 个人记忆引擎、imprint-memory、KI-CO 小屋、kiwi-mem、LangMem、lean-memory、L.I.F.E.、mcp-agent-memory、mcp-memory-service、Memex、memkeeper、memo、Memora、memory-lancedb-pro、MemoryBear、记忆星图 Memory Constellations、MemoryOS、Midas、Mímir、Mind Map、Mnemo Cortex、mnemo、mnemos（vishalbanwari26）、mnemostack、Mnemosyne（OpenClaw/Hermes 版）、Nocturne Memory、Ombre Brain、OMEGA、LongMemory（原 OpenMemory）、OpenViking、爪迹 Pawwake、Tessera、Psycheros、ReMe、Remnic、Resonant Mind、RetainDB、Sapphire、Shodh-Memory、SAME、Synthetic Heart、taOSmd、Tree Ring Memory、Engram（tstockham96）、weighted-compact、心潮念、YourMemory、Yuralume Core、ZenBrain
- **情绪记忆**（28 个）：记录情绪、心境，或用情感强度给记忆加权。
  AI Pocket Chat、AstrBot 自主学习、Being、Bitterbot、Celiums Memory、Companion Emergence、Drivesoid、Echo Mistik、InternalBeyond 移动版、KI-CO 小屋、kiwi-mem、L.I.F.E.、机的独立工作室 Machine Studio、记忆星图 Memory Constellations、Mímir、Ombre Brain、OmniDimen Emotion、OpenHer、爪迹 Pawwake、Resonant Mind、Resonant、Sapphire、Synthetic Heart、Utsuwa、心潮念、Yoji、Yuralume Core、ZenBrain
- **主动性**（13 个）：AI 会主动联系或提起（主动消息、定时问候、心跳任务）。
  AI Pocket Chat、InternalBeyond 移动版、kimi-core、MochiBot、OpenHer、Psycheros、Resonant、Sapphire、Synthetic Heart、三天没睡、Utsuwa、Yoji、Yuralume Core
- **钉选重要记忆**（21 个）：可把重要记忆标为核心、永不衰减或锁定。
  vMem、Aelios、archon-memory-core、Aura Memory、birkin-mnemosyne、Bitterbot、Companion Emergence、EchoVault、IAI 个人记忆引擎、imprint-memory、kiwi-mem、Mind Map、Mnemo Cortex、mnemory、Nocturne Memory、Ombre Brain、爪迹 Pawwake、SAME、widemem、心潮念、ZenBrain
- **记错防护**（78 个）：能纠错、取代旧事实、检测冲突、追溯来源或回滚，防止记错越记越真。
  Aelios、afair、agent-memory（g1itchbot）、agentic-recall、AgentRecall、Alaya、archon-memory-core、AstrBot 自主学习、AtMem、birkin-mnemosyne、Bitterbot、Central Intelligence、Claude Soul、Claudex、Compartment、ContextLattice、CRBRO、DreamVault、Facthouse、FluctlightDB、GBrain、Graph Memory、Graphiti（Zep）、Engram（HBarefoot）、Hipocampo、HMS、IAI 个人记忆引擎、imprint-memory、洞察捕捉 Insight、inspeximus、Jarvis Orb、kimi-core、kiwi-mem、lean-memory、notebook.py、mem0-mcp-selfhosted、memgres、memo、Memora、记忆星图 Memory Constellations、MemoryMesh、MemOS、MemTether、Midas、Mímir、Mnemo Cortex、mnemo、mnemory、mnemostack、Mnemosyne（OpenClaw/Hermes 版）、Neotoma、Nocturne Memory、Ombre Brain、OMEGA、LongMemory（原 OpenMemory）、草履虫 Paramecium、爪迹 Pawwake、people-context、Personal Understanding、Piia Engram、Tessera、Remembra Relay、Remnic、RetainDB、ShadowGraph、Shodh-Memory、SAME、Statewave、Supermemory、Synapse、Talamus、taOSmd、TeleMem、TokenMizer、Tree Ring Memory、Engram（tstockham96）、widemem、YourMemory
- **迁入旧记录**（21 个）：能导入 ChatGPT、Claude 等平台导出的聊天记录或别的记忆库数据。
  agentic-recall、Alaya、Basic Memory、Central Intelligence、claude-handoff、HoneyOS、inspeximus、InternalBeyond 移动版、KI-CO 小屋、Mengram、Midas、Mind Map、MochiBot、Neotoma、爪迹 Pawwake、people-context、Tessera、Psycheros、Remnic、RetainDB、Synapse

## `access`（3 处）

| 项目 | 原文 | 建议值 | 理由 |
|---|---|---|---|
| claude-handoff（`claude-handoff`） | 命令行 | — | 接入方式原文未识别：命令行 |
| Drivesoid（`drivesoid`） | HTTP 旁路服务 | — | 接入方式原文未识别：HTTP 旁路服务；HTTP 旁路服务 |
| OmniDimen Emotion（`omnidimen-emotion`） | 模型权重 | — | 接入方式原文未识别：模型权重；模型权重 |

## `compatible_clients`（6 处）

| 项目 | 原文 | 建议值 | 理由 |
|---|---|---|---|
| Aura Memory（`aurasdk`） | 多个 AI 工具 | — | 客户端原文：多个 AI 工具 |
| Drivesoid（`drivesoid`） | （见理由） | — | 客户端原文： |
| MemoryBear（`memorybear`） | （见理由） | — | 客户端原文： |
| OmniDimen Emotion（`omnidimen-emotion`） | （见理由） | — | 客户端原文： |
| Personal Understanding（`personal-understanding`） | 支持技能的 agent（README 未逐一列出） | — | 客户端原文：支持技能的 agent（README 未逐一列出） |
| ShadowGraph（`shadowgraph`） | Claude 系列 | — | 客户端原文：Claude 系列 |

## `runs_on`（2 处）

| 项目 | 原文 | 建议值 | 理由 |
|---|---|---|---|
| 和机的另一个家 ChatNest UI（`chatnest-ui`） | 浏览器；后端需自行实现 | — | 运行位置原文未识别：浏览器；后端需自行实现；浏览器；后端需自行实现 |
| DreamVault（`dreamvault`） | 嵌入你自己的记忆系统所在机器 | — | 运行位置原文未识别：嵌入你自己的记忆系统所在机器；嵌入你自己的记忆系统所在机器 |

## `os`（11 处）

| 项目 | 原文 | 建议值 | 理由 |
|---|---|---|---|
| Akephalos（`akephalos`） | （见理由） | — | README 和原表都没提到系统 |
| LivingMemory（`astrbot-plugin-livingmemory`） | （见理由） | — | README 和原表都没提到系统 |
| DreamVault（`dreamvault`） | （见理由） | — | README 和原表都没提到系统 |
| Drivesoid（`drivesoid`） | （见理由） | — | README 和原表都没提到系统 |
| HMS（`hms`） | （见理由） | — | README 和原表都没提到系统 |
| kimi-room（`kimi-room`） | （见理由） | — | README 和原表都没提到系统 |
| notebook.py（`llmcompressor`） | （见理由） | — | README 和原表都没提到系统 |
| 记忆星图 Memory Constellations（`memoryconstellations`） | （见理由） | — | README 和原表都没提到系统 |
| Myco（`myco`） | （见理由） | — | README 和原表都没提到系统 |
| OmniDimen Emotion（`omnidimen-emotion`） | （见理由） | — | README 和原表都没提到系统 |
| TencentDB Agent Memory（`tencentdb-agent-memory`） | （见理由） | — | README 和原表都没提到系统 |

## `cost`（23 处）

| 项目 | 原文 | 建议值 | 理由 |
|---|---|---|---|
| Aelios（`aelios`） | 浏览器、GitHub 账号、Cloudflare 账号；不需要自己的服务器 | free | 只需免费账号（浏览器、GitHub 账号、Cloudflare 账号；不需要自己的服务器；Cloudflare 云端（你自己的账号）；网关＋MCP 两种接法，Claude 官方网页和手机 App 也能用；覆盖面最广：第三方客户端走网关，Claude 官方网页和手机 App 走 MCP；只有登记过的主模型才有记忆；浏览器、GitHub 账号、Cloudflare 账号；不需要自己的服务器），但云平台免费额度有限，需确认 |
| alethech（`alethech`） | （见理由） | — | 费用原文未识别：自己的电脑；Star 为 0 |
| LivingMemory（`astrbot-plugin-livingmemory`） | 已运行的 AstrBot（4.24.2 以上才有管理页）及其接入的 QQ、微信、Telegram 等平台 | free | 只需免费账号（已运行的 AstrBot（4.24.2 以上才有管理页）及其接入的 QQ、微信、Telegram 等平台；AstrBot 所在的电脑或服务器；AstrBot 插件；只服务 AstrBot；与自主学习插件配合时分工明确；正在测试 2.7.0 版；已运行的 AstrBot（4.24.2 以上才有管理页）及其接入的 QQ、微信、Telegram 等平台），但云平台免费额度有限，需确认 |
| Claude-Mem（`claude-mem`） | （见理由） | — | 费用原文未识别：本机服务；部分宿主默认用托管的 CMEM Pro；偏编程场景；Star 很多（约 9.9 万），但以编程项目为主 |
| ContextLattice（`contextlattice`） | （见理由） | — | 费用原文未识别：自己的电脑（容器运行时）；偏编程场景 |
| cosmos-mcp（`cosmos-mcp`） | Cosmos 账号 | — | 费用原文未识别：Cosmos 账号；需 Cosmos 服务密钥；同步 App 仅 macOS；免代码用法默认经第三方服务器 |
| FluctlightDB（`fluctlightdb`） | （见理由） | — | 费用原文未识别：自己的电脑；MIT 或 Apache-2.0 |
| InternalBeyond 移动版（`internalbeyond-mobile`） | 任意浏览器（推荐 Chrome）；可选免费 HTTPS 静态空间（如 GitHub Pages） | free | 只需免费账号（任意浏览器（推荐 Chrome）；可选免费 HTTPS 静态空间（如 GitHub Pages）；手机或电脑浏览器本地；伴侣应用自带记忆；数据全在浏览器本地，与电脑版互通备份；15 个模块；仅限非商业；任意浏览器（推荐 Chrome）；可选免费 HTTPS 静态空间（如 GitHub Pages）），但云平台免费额度有限，需确认 |
| Kremis（`kremis`） | （见理由） | — | 费用原文未识别：自己的电脑（需 Rust 编译）；alpha 版 |
| Letta（原 MemGPT）（`letta`） | （见理由） | — | 费用原文未识别：本地或 Letta Cloud；已更名 Letta，现为 Letta Code 应用（桌面/网页/Telegram）；源码已迁至 letta-ai/letta-code；项目已更名为 Letta |
| LoreRoom（`loreroom`） | Telegram 机器人 | free | 只需免费账号（Telegram 机器人；自己的电脑），但云平台免费额度有限，需确认 |
| MemHeaven（`memheaven`） | Cloudflare 账号 | free | 只需免费账号（Cloudflare 账号；自己的 Cloudflare 账号），但云平台免费额度有限，需确认 |
| Memory MCP（michael-denyer）（`memory-mcp`） | （见理由） | — | 费用原文未识别：自己的电脑；偏编程场景 |
| Mengram（`mengram`） | Mengram 账号 | — | 费用原文未识别：Mengram 账号；托管（mengram.io）；免代码用法默认经第三方服务器 |
| Myco（`myco`） | （见理由） | — | 费用原文未识别：自己的电脑；偏编程场景 |
| Omnigraph（`omnigraph`） | （见理由） | — | 费用原文未识别：自己的电脑或对象存储 |
| 爪迹 Pawwake（`pawwake`） | 浏览器、GitHub 账号、Render 账号、免费 PostgreSQL（Render 免费库 90 天有效） | free | 只需免费账号（浏览器、GitHub 账号、Render 账号、免费 PostgreSQL（Render 免费库 90 天有效）；Render 等能跑 Docker 的云平台＋PostgreSQL；分阶段搭建，可先只做转发；带分区缓存省 token；客户端需支持自定义请求头 X-Gateway-Key；浏览器、GitHub 账号、Render 账号、免费 PostgreSQL（Render 免费库 90 天有效）），但云平台免费额度有限，需确认 |
| Second Me（`second-me`） | （见理由） | — | 费用原文未识别：自己的电脑（Docker）；最后提交 2025-09，更新放缓；更新放缓 |
| ShadowGraph（`shadowgraph`） | （见理由） | — | 费用原文未识别：自己的电脑；偏编程场景；技术预览版，npm 上没有 |
| Supermemory（`supermemory`） | Supermemory 账号 | — | 费用原文未识别：Supermemory 账号；默认托管 API；可自托管；插件调用托管 API，数据经第三方；论文表 9 已列；支持自部署 |
| Talamus（`talamus`） | （见理由） | — | 费用原文未识别：自己的电脑；偏编程场景 |
| 三天没睡（`three-days-no-sleep`） | Cloudflare 账号；能运行 Node.js 的电脑 | free | 只需免费账号（Cloudflare 账号；能运行 Node.js 的电脑；Cloudflare 云端；伴侣应用自带记忆；README 只有部署教程，功能未经核实；仅限非商业；Cloudflare 账号；能运行 Node.js 的电脑），但云平台免费额度有限，需确认 |
| Tree Ring Memory（`tree-ring-memory`） | （见理由） | — | 费用原文未识别：自己的电脑；偏编程场景 |

## `accounts_needed`（45 处）

| 项目 | 原文 | 建议值 | 理由 |
|---|---|---|---|
| AgentRecall（`agentrecall`） | （见理由） | model_api_key | 说明里没写；README 提到“optional vector search when `OPENAI_API_KEY` is set. No inverted index or”，建议值 model_api_key，需确认是否必需 |
| Alaya（`alaya`） | （见理由） | model_api_key | 说明里没写；README 提到“AYA_LLM_API_KEY` ／ *(none)* ／ API key for auto-consolidation (enabl”，建议值 model_api_key，需确认是否必需 |
| alethech（`alethech`） | （见理由） | — | 账号原文未识别：（空） |
| AtMem（`atmem`） | 可选本地 Ollama 或托管模型 | model_api_key | 账号原文：可选本地 Ollama 或托管模型（含“可选”，需确认是否必需） |
| Aura Memory（`aurasdk`） | （见理由） | model_api_key | 说明里没写；README 提到“consistent evidence) ``` No API keys. No embeddings required. No”，建议值 model_api_key，需确认是否必需 |
| memex（ayushagrawal288）（`ayushagrawal288-memex`） | （见理由） | model_api_key | 说明里没写；README 提到“Docker and Docker Compose. No API keys required — the entire stack”，建议值 model_api_key，需确认是否必需 |
| causal-memory（`causal-memory`） | （见理由） | model_api_key | 说明里没写；README 提到“### With local embeddings (no API key needed) ```bash cargo build”，建议值 model_api_key，需确认是否必需 |
| Celiums Memory（`celiums-memory`） | （见理由） | model_api_key | 说明里没写；README 提到“at the HTTP endpoint with the API key. Example for Claude Code / Cu”，建议值 model_api_key，需确认是否必需 |
| Claude-Mem（`claude-mem`） | （见理由） | — | 账号原文未识别：（空） |
| Context-Keeper（`context-keeper`） | （见理由） | model_api_key | 说明里没写；README 提到“=600 # 超时时间 # 云端模型API Keys（备用） DEEPSEEK_API_KEY=your-de”，建议值 model_api_key，需确认是否必需 |
| ContextLattice（`contextlattice`） | （见理由） | — | 账号原文未识别：（空） |
| Facthouse（`facthouse`） | 可选 Ollama 或 Voyage | model_api_key | 账号原文：可选 Ollama 或 Voyage（含“可选”，需确认是否必需） |
| FluctlightDB（`fluctlightdb`） | （见理由） | — | 账号原文未识别：（空） |
| GoodMemory（`goodmemory`） | （见理由） | model_api_key | 说明里没写；README 提到“er ranks. It does not include API keys, query text, or memory conte”，建议值 model_api_key，需确认是否必需 |
| Hipocampo（`hipocampo`） | （见理由） | model_api_key | 说明里没写；README 提到“Decisions > **Bring your own API key.** TypeSafe is in early acces”，建议值 model_api_key，需确认是否必需 |
| Hyperconsciousness（`hyperconsciousness`） | （见理由） | model_api_key | 说明里没写；README 提到“igning in. No Bun or provider API keys are needed. See [hosted acce”，建议值 model_api_key，需确认是否必需 |
| inspeximus（`inspeximus`） | （见理由） | model_api_key | 说明里没写；README 提到“eck in three seconds, with no API key Measured 2026-08-25 against”，建议值 model_api_key，需确认是否必需 |
| InternalBeyond 移动版（`internalbeyond-mobile`） | 任意浏览器（推荐 Chrome）；可选免费 HTTPS 静态空间（如 GitHub Pages） | github | 账号原文：任意浏览器（推荐 Chrome）；可选免费 HTTPS 静态空间（如 GitHub Pages）；任意浏览器（推荐 Chrome）；可选免费 HTTPS 静态空间（如 GitHub Pages）（含“可选”，需确认是否必需） |
| kimi-core（`kimi-core`） | 电脑或服务器；Node.js；Postgres＋pgvector；守护进程需 Claude 订阅令牌（可选） | claude_subscription | 账号原文：电脑或服务器；Node.js；Postgres＋pgvector；守护进程需 Claude 订阅令牌（可选）；电脑或服务器；Node.js；Postgres＋pgvector；守护进程需 Claude 订阅令牌（可选）（含“可选”，需确认是否必需） |
| Kremis（`kremis`） | （见理由） | — | 账号原文未识别：（空） |
| Letta（原 MemGPT）（`letta`） | （见理由） | — | 账号原文未识别：（空） |
| mem0-mcp-selfhosted（`mem0-mcp-selfhosted`） | （见理由） | model_api_key | 说明里没写；README 提到“y relationships) ／ ／ **Google API Key** ／ Optional ／ Required only”，建议值 model_api_key，需确认是否必需 |
| memgres（`memgres`） | （见理由） | model_api_key | 说明里没写；README 提到“st, unrelated: - **Embedding API key** (`MEMGRES_EMBED_API_KEY`) —”，建议值 model_api_key，需确认是否必需 |
| memo（`memo`） | （见理由） | model_api_key | 说明里没写；README 提到“n, and OpenCode. No cloud, no API keys, no Ollama, no vector DB to”，建议值 model_api_key，需确认是否必需 |
| Memora（`memora`） | （见理由） | model_api_key | 说明里没写；README 提到“UDFLARE_API_TOKEN":"REPLACE","OPENAI_API_KEY":"REPLACE"}}}} JSON chm”，建议值 model_api_key，需确认是否必需 |
| memory-mcp-1file（`memory-mcp-1file`） | （见理由） | model_api_key | 说明里没写；README 提到“ealDB is embedded) * ✅ **No API Keys, No Cloud, No Python** — Eve”，建议值 model_api_key，需确认是否必需 |
| Memory MCP（michael-denyer）（`memory-mcp`） | （见理由） | — | 账号原文未识别：（空） |
| MemoryBear（`memorybear`） | （见理由） | model_api_key | 说明里没写；README 提到“ies ／ ／ Service API ／ `/v1` ／ API Key ／ Knowledge extraction, graph”，建议值 model_api_key，需确认是否必需 |
| 墨知 MoRead（`moread`） | Android 8.0+ 手机；模型服务密钥（可选） | model_api_key | 账号原文：Android 8.0+ 手机；模型服务密钥（可选）；Android 8.0+ 手机；模型服务密钥（可选）（含“可选”，需确认是否必需） |
| Myco（`myco`） | （见理由） | — | 账号原文未识别：（空） |
| OMEGA（`omega-memory`） | （见理由） | model_api_key | 说明里没写；README 提到“** Services like Mem0 require API keys and send your data to their”，建议值 model_api_key，需确认是否必需 |
| Omnigraph（`omnigraph`） | （见理由） | — | 账号原文未识别：（空） |
| OpenHer（`openher`） | Python 3.11+；macOS 14+（桌面客户端，可选）；任一模型服务密钥或本地 Ollama | model_api_key | 账号原文：Python 3.11+；macOS 14+（桌面客户端，可选）；任一模型服务密钥或本地 Ollama；Python 3.11+；macOS 14+（桌面客户端，可选）；任一模型服务密钥或本地 Ollama（含“可选”，需确认是否必需） |
| Prism Coder（`prism-mcp`） | （见理由） | model_api_key | 说明里没写；README 提到“ed). **No account needed. No API keys. Runs on your machine.** A”，建议值 model_api_key，需确认是否必需 |
| Remembra Relay（`remembra`） | （见理由） | model_api_key | 说明里没写；README 提到“dings, so the server needs no API key. The first start downloads th”，建议值 model_api_key，需确认是否必需 |
| RetainDB（`retaindb`） | （见理由） | model_api_key | 说明里没写；README 提到“Kafka, Qdrant, Cloudflare, or API keys. ### Self-Hosted Server Us”，建议值 model_api_key，需确认是否必需 |
| roampal-core（`roampal-core`） | （见理由） | model_api_key | 说明里没写；README 提到“sers without a local model or API key — they route through OpenCode”，建议值 model_api_key，需确认是否必需 |
| Second Me（`second-me`） | （见理由） | — | 账号原文未识别：（空） |
| ShadowGraph（`shadowgraph`） | （见理由） | — | 账号原文未识别：（空） |
| SAME（`statelessagent`） | （见理由） | model_api_key | 说明里没写；README 提到“ecurity.md). No accounts. No API keys. Everything runs locally. ``”，建议值 model_api_key，需确认是否必需 |
| Statewave（`statewave`） | （见理由） | model_api_key | 说明里没写；README 提到“s `stub` (local heuristic, no API key) ／ ／ SDKs ／ [Python](https://”，建议值 model_api_key，需确认是否必需 |
| Talamus（`talamus`） | （见理由） | — | 账号原文未识别：（空） |
| TokenMizer（`tokenmizer`） | （见理由） | model_api_key | 说明里没写；README 提到“OpenAI client = OpenAI( api_key="your-key", base_url="htt”，建议值 model_api_key，需确认是否必需 |
| Tree Ring Memory（`tree-ring-memory`） | （见理由） | — | 账号原文未识别：（空） |
| ZenBrain（`zenbrain`） | （见理由） | model_api_key | 说明里没写；README 提到“ts/compare-mechanisms.sh`, no API keys and nothing to install. It p”，建议值 model_api_key，需确认是否必需 |

## `memory_subject`（26 处）

| 项目 | 原文 | 建议值 | 理由 |
|---|---|---|---|
| agentic-recall（`agentic-recall`） | 长期记忆（Markdown 文件夹） | — | 记忆对象原文未识别：长期记忆（Markdown 文件夹） |
| alethech（`alethech`） | 签名的记忆提交 | — | 记忆对象原文未识别：签名的记忆提交 |
| AtMem（`atmem`） | agent 记忆与证据 | — | 记忆对象原文未识别：agent 记忆与证据 |
| Aura Memory（`aurasdk`） | 记忆 | — | 记忆对象原文未识别：记忆 |
| Celiums Memory（`celiums-memory`） | 多类记忆 | — | 记忆对象原文未识别：多类记忆 |
| Drivesoid（`drivesoid`） | 工作／状态记忆（快情绪、慢心境） | — | 记忆对象原文未识别：工作／状态记忆（快情绪、慢心境）；工作／状态记忆（快情绪、慢心境） |
| EverOS（`everos`） | 长期记忆 | — | 记忆对象原文未识别：长期记忆 |
| Hipocampo（`hipocampo`） | agent 记忆 | — | 记忆对象原文未识别：agent 记忆 |
| HMS（`hms`） | 长期记忆 | — | 记忆对象原文未识别：长期记忆 |
| Hyperconsciousness（`hyperconsciousness`） | 知识 | — | 记忆对象原文未识别：知识 |
| Kremis（`kremis`） | 知识图 | — | 记忆对象原文未识别：知识图 |
| Kybase（`kybase`） | 笔记＋长期记忆 | — | 记忆对象原文未识别：笔记＋长期记忆 |
| LangMem（`langmem`） | 长期记忆 | — | 记忆对象原文未识别：长期记忆 |
| Letta（原 MemGPT）（`letta`） | agent 自身记忆 | — | 记忆对象原文未识别：agent 自身记忆 |
| mcp-agent-memory（`mcp-agent-memory`） | 记忆文件 | — | 记忆对象原文未识别：记忆文件 |
| MemEngine（`memengine`） | 多种记忆模型 | — | 记忆对象原文未识别：多种记忆模型 |
| memgres（`memgres`） | 文档 | — | 记忆对象原文未识别：文档 |
| memo（`memo`） | 编程记忆 | — | 记忆对象原文未识别：编程记忆 |
| MemoryBear（`memorybear`） | 知识 | — | 记忆对象原文未识别：知识 |
| MemoryMesh（`memorymesh`） | 故事世界与角色 | — | 记忆对象原文未识别：故事世界与角色 |
| OmniDimen Emotion（`omnidimen-emotion`） | 情绪识别与生成能力 | — | 记忆对象原文未识别：情绪识别与生成能力；情绪识别与生成能力 |
| Omnigraph（`omnigraph`） | 图数据 | — | 记忆对象原文未识别：图数据 |
| Remembra Relay（`remembra`） | 交接记录 | — | 记忆对象原文未识别：交接记录 |
| roampal-core（`roampal-core`） | 编程记忆 | — | 记忆对象原文未识别：编程记忆 |
| Statewave（`statewave`） | 情节与编译记忆 | — | 记忆对象原文未识别：情节与编译记忆 |
| ZenBrain（`zenbrain`） | 多层记忆 | — | 记忆对象原文未识别：多层记忆 |

## `write_mode`（123 处）

| 项目 | 原文 | 建议值 | 理由 |
|---|---|---|---|
| vMem（`0compactmem`） | （见理由） | — | README 没提写入方式 |
| Acheron（`acheron-mcp-server`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Acontext（`acontext`） | （见理由） | — | README 没提写入方式 |
| afair（`afair`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| AgentRecall（`agentrecall`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| AI Pocket Chat（`ai-pocket-chat`） | 长期／近期记忆；— | — | 原表写入方式未识别：长期／近期记忆；—；— |
| Akephalos（`akephalos`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Alaya（`alaya`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| alethech（`alethech`） | （见理由） | — | README 没提写入方式 |
| archon-memory-core（`archon-memory-core`） | （见理由） | — | README 没提写入方式 |
| AtMem（`atmem`） | （见理由） | — | README 没提写入方式 |
| Aura Memory（`aurasdk`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| memex（ayushagrawal288）（`ayushagrawal288-memex`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Basic Memory（`basic-memory`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Being（`being`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| birkin-mnemosyne（`birkin-mnemosyne`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| causal-memory（`causal-memory`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Celiums Memory（`celiums-memory`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Central Intelligence（`central-intelligence`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| 和机的另一个家 ChatNest UI（`chatnest-ui`） | 模型通过接口写记忆，后端去重；去重时 | — | 原表写入方式未识别：模型通过接口写记忆，后端去重；去重时；近似去重，前端标红、人来定夺 |
| claude-find（`claude-find`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| claude-handoff（`claude-handoff`） | （见理由） | — | README 没提写入方式 |
| Claude Soul（`claude-soul`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Claudex（`claudex`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Companion Emergence（`companion-emergence`） | 角色自己把多轮验证过的记忆结晶为“灵魂”；可选：审阅灵魂记忆 | — | 原表写入方式未识别：角色自己把多轮验证过的记忆结晶为“灵魂”；可选：审阅灵魂记忆；灵魂记忆可审阅、可撤销，不会被悄悄改写 |
| Context-Keeper（`context-keeper`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| ContextLattice（`contextlattice`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| cosmos-mcp（`cosmos-mcp`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| CRBRO（`crbro-memory`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| DreamVault（`dreamvault`） | 不负责写入；在写入闸口检查记忆有没有事实锚点；不由人介入，机器闸口拦截 | — | 原表写入方式未识别：不负责写入；在写入闸口检查记忆有没有事实锚点；不由人介入，机器闸口拦截；写入闸口检查事实锚点，不通过即隔离；只有 AI 本人能认领 |
| Drivesoid（`drivesoid`） | 你的桥接层上报对话事件；— | — | 原表写入方式未识别：你的桥接层上报对话事件；—；— |
| engram-rs（`engram-rs`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| fable（`fable`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Facthouse（`facthouse`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Engram（FBISiri）（`fbisiri-engram`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| FluctlightDB（`fluctlightdb`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| GBrain（`gbrain`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| GENOME（`genome`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Graph Memory（`graph-memory`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Graphiti（Zep）（`graphiti`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Engram（HBarefoot）（`hbarefoot-engram`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Hindsight（`hindsight`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Hipocampo（`hipocampo`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| HMS（`hms`） | （见理由） | — | README 没提写入方式 |
| Honcho（`honcho`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| HoneyOS（`honey-os`） | 身份、关系、用户三类记忆写入文件；关系记忆需双方确认；确认关系约定时 | — | 原表写入方式未识别：身份、关系、用户三类记忆写入文件；关系记忆需双方确认；确认关系约定时；关系记忆需双方确认；高风险操作先确认 |
| Hyperconsciousness（`hyperconsciousness`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| 洞察捕捉 Insight（`insight`） | AI 识别高价值时刻→暂存候选→用户确认后入库；AI 写入之前 | — | 原表写入方式未识别：AI 识别高价值时刻→暂存候选→用户确认后入库；AI 写入之前；候选层：先暂存，用户确认后才入库，可合并或丢弃 |
| InternalBeyond 移动版（`internalbeyond-mobile`） | 聊天、通话结束可一键生成记忆；每位 AI 独立档案；可选：在透视区纠正 | — | 原表写入方式未识别：聊天、通话结束可一键生成记忆；每位 AI 独立档案；可选：在透视区纠正；记忆可查可纠 |
| Jarvis Orb（`jarvis-orb`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| kimi-room（`kimi-room`） | 换窗时把旧窗口总结存入浏览器；整理时 | — | 原表写入方式未识别：换窗时把旧窗口总结存入浏览器；整理时；记忆回顾页人工整理 |
| Kremis（`kremis`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Kybase（`kybase`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| LangMem（`langmem`） | （见理由） | — | README 没提写入方式 |
| Letta（原 MemGPT）（`letta`） | （见理由） | — | README 没提写入方式 |
| L.I.F.E.（`life`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| notebook.py（`llmcompressor`） | （见理由） | — | README 没提写入方式 |
| LocalKeep（`localkeep`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Longhand（`longhand`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| mcp-agent-memory（`mcp-agent-memory`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| mcp-memory-service（`mcp-memory-service`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| mem0-mcp-selfhosted（`mem0-mcp-selfhosted`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Mem0（`mem0`） | （见理由） | — | README 没提写入方式 |
| mem9（`mem9`） | （见理由） | — | README 没提写入方式 |
| MemEngine（`memengine`） | （见理由） | — | README 没提写入方式 |
| Memex（`memex-lab-memex`） | 你随手记录，多个 AI 助手整理成卡片；— | — | 原表写入方式未识别：你随手记录，多个 AI 助手整理成卡片；—；无专门机制 |
| memgres（`memgres`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| MemHeaven（`memheaven`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| memkeeper（`memkeeper`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| MemMachine（`memmachine`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| memo（`memo`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Memobase（`memobase`） | （见理由） | — | README 没提写入方式 |
| MemoCall（`memocall`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Memora（`memora`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| memory-mcp-1file（`memory-mcp-1file`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Memory MCP（michael-denyer）（`memory-mcp`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| MemoryBear（`memorybear`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| MemoryMesh（`memorymesh`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| MemoryOS（`memoryos`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| MemTether（`memtether`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Midas（`midas`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| mneme（`mneme`） | （见理由） | — | README 没提写入方式 |
| mnemo（`mnemo-mcp`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| mnemory（`mnemory`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| mnemos（vishalbanwari26）（`mnemos`） | （见理由） | — | README 没提写入方式 |
| mnemostack（`mnemostack`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Mnemosyne（OpenClaw/Hermes 版）（`mnemosyne-agentmemory-engine-openclaw-hermes`） | （见理由） | — | README 没提写入方式 |
| Myco（`myco`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Neotoma（`neotoma`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Ombre Brain（`ombre-brain`） | AI 通过 MCP 工具自己写入（hold、grow），并打情感坐标；不需要人；可在面板钉选、主动遗忘、归档 | — | 原表写入方式未识别：AI 通过 MCP 工具自己写入（hold、grow），并打情感坐标；不需要人；可在面板钉选、主动遗忘、归档；删除只移入归档；trace 是唯一的元数据写入口；可验证的备份与恢复 |
| OmniDimen Emotion（`omnidimen-emotion`） | 训练期通过微调内化；— | — | 原表写入方式未识别：训练期通过微调内化；—；— |
| Omnigraph（`omnigraph`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| LongMemory（原 OpenMemory）（`openmemory`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| OpenViking（`openviking`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| 草履虫 Paramecium（`paramecium`） | 原文机械入库；小模型摘录信息点，必须附可校验的逐字引用；不需要人 | — | 原表写入方式未识别：原文机械入库；小模型摘录信息点，必须附可校验的逐字引用；不需要人；机器校验摘录的逐字引用；矛盾时旧条目标记“被取代”，不删除 |
| people-context（`people-context`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Personal Understanding（`personal-understanding`） | （见理由） | — | README 没提写入方式 |
| Prism Coder（`prism-mcp`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Tessera（`project-tessera`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| ReMe（`reme`） | （见理由） | — | README 没提写入方式 |
| Remembra Relay（`remembra`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Remnic（`remnic`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Resonant Mind（`resonant-mind`） | AI 调用 write、record 等工具写入；可选：调用修订工具 | — | 原表写入方式未识别：AI 调用 write、record 等工具写入；可选：调用修订工具；Surgery 区可编辑、删除、归档；身份修改有提案机制 |
| roampal-core（`roampal-core`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Sapphire（`sapphire`） | 带标签的记忆条目；Librarian 每晚整理；— | — | 原表写入方式未识别：带标签的记忆条目；Librarian 每晚整理；—；Librarian 改动记入人格账本 |
| Second Me（`second-me`） | （见理由） | — | README 没提写入方式 |
| Knowledge Graph Memory Server（MCP 官方）（`servers`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| ShadowGraph（`shadowgraph`） | （见理由） | — | README 没提写入方式 |
| SAME（`statelessagent`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Statewave（`statewave`） | （见理由） | — | README 没提写入方式 |
| taOSmd（`taosmd`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| TeleMem（`telemem`） | 程序调用 add，由 LLM 抽取角色化摘要；不需要人 | — | 原表写入方式未识别：程序调用 add，由 LLM 抽取角色化摘要；不需要人；LLM 语义聚类，融合、更新、去重相似记忆 |
| TencentDB Agent Memory（`tencentdb-agent-memory`） | （见理由） | — | README 没提写入方式 |
| 三天没睡（`three-days-no-sleep`） | README 未描述；— | — | 原表写入方式未识别：README 未描述；—；— |
| TokenMizer（`tokenmizer`） | （见理由） | — | README 没提写入方式 |
| Engram（tstockham96）（`tstockham96-engram`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| weighted-compact（`weighted-compact`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| widemem（`widemem-ai`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Yoji（`yoji`） | 用户画像写入 AGENTS.md；长对话生成摘要；— | — | 原表写入方式未识别：用户画像写入 AGENTS.md；长对话生成摘要；—；— |
| Yorishiro（`yorishiro`） | 角色按人格写日记，要点累积进 memories.md；— | — | 原表写入方式未识别：角色按人格写日记，要点累积进 memories.md；—；— |
| YourMemory（`yourmemory`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |
| Yuralume Core（`yuralume-core`） | 五层人设模型；日程活动成为情节记忆；共享经历入库前 | — | 原表写入方式未识别：五层人设模型；日程活动成为情节记忆；共享经历入库前；共享活动须用户同意才成为共同记忆 |
| ZenBrain（`zenbrain`） | （见理由） | on_request | README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request |

## `forgetting`（144 处）

| 项目 | 原文 | 建议值 | 理由 |
|---|---|---|---|
| vMem（`0compactmem`） | （见理由） | auto_decay | README：“only ／ recency ／ recency + decay／ ／ Pin / mlock semantics ／ ✅”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| Acheron（`acheron-mcp-server`） | （见理由） | manual_only | README 只提到删除：“ype, tags ／ ／ `bridge_delete_context` ／ Forget a saved context ／ ／ `bridge_status` ／ O”，没提自动衰减，建议值 manual_only |
| Acontext（`acontext`） | （见理由） | — | README 没提遗忘或删除 |
| agent-memory（g1itchbot）（`agent-memory`） | （见理由） | manual_only | README 只提到删除：“, I lose the thread. I repeat myself. I forget decisions. Most memory systems are bui”，没提自动衰减，建议值 manual_only |
| agentic-recall（`agentic-recall`） | （见理由） | auto_decay | README：“**hot-tier boost** and a **mild recency decay**. Every result reports its `provenance”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| AI Pocket Chat（`ai-pocket-chat`） | README 未描述 | — | 原表：README 未描述；— |
| Akephalos（`akephalos`） | （见理由） | — | README 没提遗忘或删除 |
| alethech（`alethech`） | （见理由） | — | README 没提遗忘或删除 |
| archon-memory-core（`archon-memory-core`） | （见理由） | auto_decay | README：“p expansion ForgettingPolicy — salience decay + stale detection + health scoring ```”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| AstrBot 自主学习（`astrbot-plugin-self-learning`） | README 未描述 | — | 原表：README 未描述；— |
| AtMem（`atmem`） | （见理由） | manual_only | README 只提到删除：“uded from ordinary search and recall. - Forget cascades through canonical, graph, medi”，没提自动衰减，建议值 manual_only |
| Aura Memory（`aurasdk`） | （见理由） | auto_decay | README：“／ ／ Lifecycle and governance ／ Built-in decay/promotion, provenance, contradiction co”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| memex（ayushagrawal288）（`ayushagrawal288-memex`） | （见理由） | auto_decay | README：“mory using semantic search with recency decay, so agents surface what's relevant *and”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| Basic Memory（`basic-memory`） | （见理由） | — | README 没提遗忘或删除 |
| Being（`being`） | （见理由） | auto_decay | README：“everything else: memory consolidation, decay, recall, background reflection, and ide”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| causal-memory（`causal-memory`） | （见理由） | auto_decay | README：“stage 1.7 supersession) - ✅ Vela-style half-life decay tiers (90d / 7d / legacy 0.99-per”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| Celiums Memory（`celiums-memory`） | （见理由） | auto_decay | README：“nce scoring, consolidation, lifecycle decay, and circadian/interoceptive modulati”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| Central Intelligence（`central-intelligence`） | （见理由） | auto_decay | README：“earch: vector + FTS5 + fuzzy + temporal decay ↓ Central Intelligence API (hosted)”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| 和机的另一个家 ChatNest UI（`chatnest-ui`） | 无 | none | 原表写“无”，可能是不遗忘，也可能只是没有自动机制但能手动删，需确认 |
| claude-find（`claude-find`） | （见理由） | — | README 没提遗忘或删除 |
| claude-handoff（`claude-handoff`） | （见理由） | — | README 没提遗忘或删除 |
| Claude-Mem（`claude-mem`） | （见理由） | — | README 没提遗忘或删除 |
| Claude Soul（`claude-soul`） | （见理由） | — | README 没提遗忘或删除 |
| Claudex（`claudex`） | （见理由） | — | README 没提遗忘或删除 |
| Compartment（`compartment`） | （见理由） | manual_only | README 只提到删除：“he host model decides what to store and forget; Compartment captures, encrypts and rec”，没提自动衰减，建议值 manual_only |
| Context-Keeper（`context-keeper`） | （见理由） | — | README 没提遗忘或删除 |
| context-memory（`context-memory`） | （见理由） | manual_only | README 只提到删除：“by default. Use `--remove-data` to also delete the database, or `--keep-data` to skip”，没提自动衰减，建议值 manual_only |
| ContextLattice（`contextlattice`） | （见理由） | — | README 没提遗忘或删除 |
| cosmos-mcp（`cosmos-mcp`） | （见理由） | — | README 没提遗忘或删除 |
| CRBRO（`crbro-memory`） | （见理由） | manual_only | README 只提到删除：“able** — Knowledge can be superseded or retracted, not just piled up — facts, and since”，没提自动衰减，建议值 manual_only |
| 守护猴 Daemonkey（`daemonkey-agent`） | README 未描述 | — | 原表：README 未描述；— |
| DreamVault（`dreamvault`） | 不适用 | archive | 原表：不适用；梦库永久封存，不回流检索；有归档：“梦库永久封存，不回流检索；不适用；移入物理隔离的梦库” |
| Echo Mistik（`echo-mistik`） | 无 | none | 原表写“无”，可能是不遗忘，也可能只是没有自动机制但能手动删，需确认 |
| EverOS（`everos`） | （见理由） | — | README 没提遗忘或删除 |
| fable（`fable`） | （见理由） | — | README 没提遗忘或删除 |
| Facthouse（`facthouse`） | （见理由） | manual_only | README 只提到删除：“ts and integrates — compaction does not delete the transcript, and the hook does not p”，没提自动衰减，建议值 manual_only |
| GBrain（`gbrain`） | （见理由） | — | README 没提遗忘或删除 |
| GENOME（`genome`） | （见理由） | manual_only | README 只提到删除：“gets: **`remember`**, **`recall`**, **`forget`**, **`reset_memories`**. Memories pers”，没提自动衰减，建议值 manual_only |
| GoodMemory（`goodmemory`） | （见理由） | manual_only | README 只提到删除：“the next turn, audit what happened, and delete it when it is wrong. GoodMemory is not”，没提自动衰减，建议值 manual_only |
| Graph Memory（`graph-memory`） | （见理由） | auto_decay | README：“: - **Weighted edges with configurable decay** — frequently-confirmed knowledge stay”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| Graphiti（Zep）（`graphiti`） | （见理由） | manual_only | README 只提到删除：“: - Episode management (add, retrieve, delete) - Entity management and relationship h”，没提自动衰减，建议值 manual_only |
| Hindsight（`hindsight`） | （见理由） | — | README 没提遗忘或删除 |
| Hipocampo（`hipocampo`） | （见理由） | auto_decay, archive | README：“esses historical memories based on time decay, shrinking 24-hour granular details int”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay；有归档：“ecay_hipocampo` now archives old `episodica` memorie” |
| HMS（`hms`） | （见理由） | — | README 没提遗忘或删除 |
| Honcho（`honcho`） | （见理由） | — | README 没提遗忘或删除 |
| HoneyOS（`honey-os`） | README 未描述 | — | 原表：README 未描述；— |
| Hyperconsciousness（`hyperconsciousness`） | （见理由） | — | README 没提遗忘或删除 |
| IAI 个人记忆引擎（`iai-personal-memory-engine`） | （见理由） | auto_decay | README：“lustered, consolidated, reinforced, and decayed ／ The background process is called t”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| 洞察捕捉 Insight（`insight`） | 无 | none | 原表写“无”，可能是不遗忘，也可能只是没有自动机制但能手动删，需确认 |
| inspeximus（`inspeximus`） | （见理由） | manual_only | README 只提到删除：“t once and the old value stays retired; erase a person and prove it; show an auditor”，没提自动衰减，建议值 manual_only |
| InternalBeyond 移动版（`internalbeyond-mobile`） | README 未描述 | — | 原表：README 未描述；— |
| Jarvis Orb（`jarvis-orb`） | （见理由） | auto_decay | README：“／ ／ 02 ／ **Temporal Scoring** ／ 30-day half-life decay. Recent memories surface first. O”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| KI-CO 小屋（`ki-co`） | README 未描述 | — | 原表：README 未描述；— |
| kimi-room（`kimi-room`） | 无 | none | 原表写“无”，可能是不遗忘，也可能只是没有自动机制但能手动删，需确认 |
| Kremis（`kremis`） | （见理由） | — | README 没提遗忘或删除 |
| Kybase（`kybase`） | （见理由） | — | README 没提遗忘或删除 |
| LangMem（`langmem`） | （见理由） | — | README 没提遗忘或删除 |
| lean-memory（`lean-memory`） | （见理由） | auto_decay, archive | README：“cross-encoder, and scores with salience-decay (`0.6·relevance + 0.2·recency + 0.2·imp”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay；有归档：“s), or demotes to a cold tier, so your full histo” |
| Letta（原 MemGPT）（`letta`） | （见理由） | — | README 没提遗忘或删除 |
| notebook.py（`llmcompressor`） | （见理由） | — | README 没提遗忘或删除 |
| LocalKeep（`localkeep`） | （见理由） | manual_only | README 只提到删除：“restarting `localkeep-hub` does **not** delete your banks — only removing the database”，没提自动衰减，建议值 manual_only |
| Longhand（`longhand`） | （见理由） | manual_only | README 只提到删除：“oses ／ Lives until you delete the file ／ ／ **Across model versions*”，没提自动衰减，建议值 manual_only |
| lore（`lore`） | （见理由） | manual_only | README 只提到删除：“D-based detection). ### DB corruption Delete `~/.lore/lore.db` and re-index. Your so”，没提自动衰减，建议值 manual_only |
| LoreRoom（`loreroom`） | （见理由） | — | README 没提遗忘或删除 |
| 机的独立工作室 Machine Studio（`machine-studio`） | 无 | none | 原表写“无”，可能是不遗忘，也可能只是没有自动机制但能手动删，需确认 |
| Magnemo（`magnemo`） | （见理由） | — | README 没提遗忘或删除 |
| mcp-agent-memory（`mcp-agent-memory`） | （见理由） | manual_only | README 只提到删除：“memory --daemon remove # stop and delete the plist / unit ``` `--remove` preser”，没提自动衰减，建议值 manual_only |
| mcp-memory-service（`mcp-memory-service`） | （见理由） | — | README 没提遗忘或删除 |
| mem0-mcp-selfhosted（`mem0-mcp-selfhosted`） | （见理由） | manual_only | README 只提到删除：“ndexes in Qdrant. ／ ／ `delete_memory` ／ Delete a single memory by UUID. ／ ／ `delete_al”，没提自动衰减，建议值 manual_only |
| Mem0（`mem0`） | （见理由） | manual_only | README 只提到删除：“extraction** -- one LLM call, no UPDATE/DELETE. Memories accumulate; nothing is overwr”，没提自动衰减，建议值 manual_only |
| mem9（`mem9`） | （见理由） | manual_only | README 只提到删除：“AI Agents.</strong><br/> Your agents forget everything between sessions. mem9 fixes”，没提自动衰减，建议值 manual_only |
| MemEngine（`memengine`） | （见理由） | — | README 没提遗忘或删除 |
| Memex（`memex-lab-memex`） | README 未描述 | archive | 原表：README 未描述；—；有归档：“子 Agent；按 P.A.R.A 方法归档；生成知识洞察” |
| memgres（`memgres`） | （见理由） | manual_only | README 只提到删除：“mper-evident history that you can still delete when the law says you must. --- ## Wh”，没提自动衰减，建议值 manual_only |
| MemHeaven（`memheaven`） | （见理由） | manual_only | README 只提到删除：“re useful in the moment, but they often forget project context across chats, sessions,”，没提自动衰减，建议值 manual_only |
| memkeeper（`memkeeper`） | （见理由） | manual_only | README 只提到删除：“worth reviewing. - `document-prune` — delete the specific chunks you choose (support”，没提自动衰减，建议值 manual_only |
| MemMachine（`memmachine`） | （见理由） | — | README 没提遗忘或删除 |
| memo（`memo`） | （见理由） | manual_only | README 只提到删除：“` `search` `ask` `get` `edit` `rename` `delete` `list` **Recall & Hooks:** `recall` `”，没提自动衰减，建议值 manual_only |
| Memobase（`memobase`） | （见理由） | manual_only | README 只提到删除：“t found once you flush the memory. # u.delete(bid) ``` > By default, Memobase will r”，没提自动衰减，建议值 manual_only |
| MemoCall（`memocall`） | （见理由） | — | README 没提遗忘或删除 |
| Memora（`memora`） | （见理由） | manual_only | README 只提到删除：“Integrity** - Guards against accidental delete/merge/absorb of document fragments - 🔍”，没提自动衰减，建议值 manual_only |
| Memori（`memori`） | （见理由） | manual_only | README 只提到删除：“r Gateway) By default, OpenClaw agents forget everything between sessions. The Memori”，没提自动衰减，建议值 manual_only |
| memory-mcp-1file（`memory-mcp-1file`） | （见理由） | auto_decay | README：“from 5 code choices). ### 2. Temporal Decay & "Presence" * **Problem:** Old memor”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| Memory MCP（michael-denyer）（`memory-mcp`） | （见理由） | auto_decay, archive | README：“s ／ ／ **Trust scoring** ／ Outdated info decays and sinks ／ All memories equal ／ ／ **S”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay；有归档：“all is needed. 2. **Cold storage (~50ms)** — Everyth” |
| MemoryBear（`memorybear`） | （见理由） | auto_decay | README：“nsion model of memory strength and time decay: - Each knowledge item is assigned an”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| 记忆星图 Memory Constellations（`memoryconstellations`） | 14 天无访问转冷却；被召回自动恢复活跃 | archive | 原表：14 天无访问转冷却；被召回自动恢复活跃；30 天删向量，90 天清空正文（真正删除）；叙事片段 12 个月后归档；有归档：“正文（真正删除）；叙事片段 12 个月后归档；14 天无访问转冷却；被召回自动恢复活” |
| MemoryMesh（`memorymesh`） | （见理由） | manual_only | README 只提到删除：“l, providing context for the AI. *(The `delete` and `update` tools have a generic desc”，没提自动衰减，建议值 manual_only |
| MemoryOS（`memoryos`） | （见理由） | — | README 没提遗忘或删除 |
| MemOS（`memos`） | README 未描述 | — | 原表：README 未描述；— |
| MemTether（`memtether`） | （见理由） | manual_only | README 只提到删除：“===+ ``` ## TL;DR - **Your AI clients forget each other?** Every agent keeps its own”，没提自动衰减，建议值 manual_only |
| memU（`memu`） | （见理由） | manual_only | README 只提到删除：“an resume where you left off. Memory is erased only when you explicitly ask for it.”，没提自动衰减，建议值 manual_only |
| Mengram（`mengram`） | （见理由） | — | README 没提遗忘或删除 |
| Midas（`midas`） | （见理由） | manual_only | README 只提到删除：“g, returns a deletion audit), `stats`, `forget` (chain-safe), `forget_matching` (topic”，没提自动衰减，建议值 manual_only |
| mneme（`mneme`） | （见理由） | manual_only | README 只提到删除：“o the database is derived state you can delete. - **Closing a session costs nothing an”，没提自动衰减，建议值 manual_only |
| mnemo（`mnemo-mcp`） | （见理由） | auto_decay | README：“usion + cross-encoder rerank + temporal decay -- importance x recency archive policy”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| mnemory（`mnemory`） | （见理由） | — | README 没提遗忘或删除 |
| mnemos（vishalbanwari26）（`mnemos`） | （见理由） | auto_decay | README：“ments (via real LLM tool-use calls) and decayed stale facts' confidence; a low-value”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| mnemostack（`mnemostack`） | （见理由） | auto_decay | README：“default, reached at 10 accesses) which fades back toward 1.0 as the access ages and”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| Mnemosyne（OpenClaw/Hermes 版）（`mnemosyne-agentmemory-engine-openclaw-hermes`） | （见理由） | auto_decay, archive | README：“·hitFreq + 0.05·layerW` ／ 42→18ms ／ ／ 时间衰减 Time Decay ／ time.js half-life integrat”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay；有归档：“ns/questions ／ ／ 中期·归档 Medium ／ `medium/YY” |
| MochiBot（`mochibot`） | 无 | none | 原表写“无”，可能是不遗忘，也可能只是没有自动机制但能手动删，需确认 |
| 墨知 MoRead（`moread`） | 无 | none | 原表写“无”，可能是不遗忘，也可能只是没有自动机制但能手动删，需确认 |
| Myco（`myco`） | （见理由） | — | README 没提遗忘或删除 |
| Neotoma（`neotoma`） | （见理由） | manual_only | README 只提到删除：“tes, split an entity by predicate, soft-delete and restore, list potential duplicates,”，没提自动衰减，建议值 manual_only |
| Nocturne Memory（`nocturne-memory`） | 无自动遗忘 | none | 原表写“无自动遗忘”，可能是不遗忘，也可能只是没有自动机制但能手动删，需确认 |
| OMEGA（`omega-memory`） | （见理由） | manual_only | README 只提到删除：“heir cloud. - **Context loss.** Agents forget every decision, preference, and archite”，没提自动衰减，建议值 manual_only |
| omemo（`omemo`） | 无 | none | 原表写“无”，可能是不遗忘，也可能只是没有自动机制但能手动删，需确认 |
| OmniDimen Emotion（`omnidimen-emotion`） | 不适用 | — | 原表：不适用；— |
| Omnigraph（`omnigraph`） | （见理由） | — | README 没提遗忘或删除 |
| LongMemory（原 OpenMemory）（`openmemory`） | （见理由） | auto_decay | README：“ovenance are not rewritten by recall or decay. - **Executable graph:** typed relation”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| OpenViking（`openviking`） | （见理由） | — | README 没提遗忘或删除 |
| 草履虫 Paramecium（`paramecium`） | 明确不做遗忘曲线（作者已把热度衰减代码封存） | none, archive | 原表：明确不做遗忘曲线（作者已把热度衰减代码封存）；原文永不删除；被取代的条目退出排名（明确不做遗忘，但可能仍能手动删除，建议值 none）；有归档：“；明确不做遗忘曲线（作者已把热度衰减代码封存）；新旧记忆高置信矛盾时，旧条目标记 s” |
| people-context（`people-context`） | （见理由） | manual_only | README 只提到删除：“nated about trust: writes are audited, `forget` is a real delete, sensitive records si”，没提自动衰减，建议值 manual_only |
| Personal Understanding（`personal-understanding`） | （见理由） | auto_decay | README：“几轮实测事故磨出来的**——分类器曾把「我堵得慌」锁在档案外、缺日期记录曾被时间衰减无声埋掉、整句口语查询曾被假切片霸榜，每一版修补都在 [CHANGELOG](C”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| Piia Engram（`piia-engram`） | （见理由） | manual_only | README 只提到删除：“that architecture decision last month — erased This happens because AI memory today”，没提自动衰减，建议值 manual_only |
| Prism Coder（`prism-mcp`） | （见理由） | — | README 没提遗忘或删除 |
| Tessera（`project-tessera`） | （见理由） | manual_only | README 只提到删除：“se saved memories ／ ／ `forget_memory` ／ Delete a specific memory ／ ／ `export_memories`”，没提自动衰减，建议值 manual_only |
| Psycheros（`psycheros`） | README 未描述 | — | 原表：README 未描述；— |
| ReMe（`reme`） | （见理由） | — | README 没提遗忘或删除 |
| Remembra Relay（`remembra`） | （见理由） | auto_decay | README：“untested ⏱️ **Temporal Memory** — TTL, decay curves, historical queries 🔍 **Hybrid”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| Remnic（`remnic`） | （见理由） | — | README 没提遗忘或删除 |
| Resonant Mind（`resonant-mind`） | 守护进程处理保留与孤儿检测 | archive | 原表：守护进程处理保留与孤儿检测；归档（Surgery 区）；有归档：“归档（Surgery 区）；守护进程处理保留” |
| Resonant（`resonant`） | 无 | none | 原表写“无”，可能是不遗忘，也可能只是没有自动机制但能手动删，需确认 |
| roampal-core（`roampal-core`） | （见理由） | auto_decay | README：“Yes — 5 collections, promotion/demotion/decay ／ CLAUDE.md unbounded, auto memory firs”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| Sapphire（`sapphire`） | README 未描述 | — | 原表：README 未描述；— |
| Second Me（`second-me`） | （见理由） | manual_only | README 只提到删除：“e individuality: AI that amplifies, not erases, **YOU**. We’re challenging that with”，没提自动衰减，建议值 manual_only |
| Knowledge Graph Memory Server（MCP 官方）（`servers`） | （见理由） | manual_only | README 只提到删除：“are using a docker volume for storage, delete the old docker volume's `index.js` file”，没提自动衰减，建议值 manual_only |
| ShadowGraph（`shadowgraph`） | （见理由） | manual_only | README 只提到删除：“d). Omitted scope means all-null scope. Purge is previewable, logical by default, and”，没提自动衰减，建议值 manual_only |
| SAME（`statelessagent`） | （见理由） | — | README 没提遗忘或删除 |
| Statewave（`statewave`） | （见理由） | manual_only | README 只提到删除：“ines, trace every memory to its source, delete by subject Everything is organised aro”，没提自动衰减，建议值 manual_only |
| Supermemory（`supermemory`） | （见理由） | manual_only | README 只提到删除：“t does ／ ／---／---／ ／ `memory` ／ Save or forget information. Your AI calls this automat”，没提自动衰减，建议值 manual_only |
| Synapse（`synapse`） | （见理由） | manual_only | README 只提到删除：“model and owner settings ``` Delete `synapse.db` and `synapse reindex --vau”，没提自动衰减，建议值 manual_only |
| Talamus（`talamus`） | （见理由） | — | README 没提遗忘或删除 |
| TeleMem（`telemem`） | 无 | none | 原表写“无”，可能是不遗忘，也可能只是没有自动机制但能手动删，需确认 |
| TencentDB Agent Memory（`tencentdb-agent-memory`） | （见理由） | — | README 没提遗忘或删除 |
| 三天没睡（`three-days-no-sleep`） | README 未描述 | — | 原表：README 未描述；— |
| TokenMizer（`tokenmizer`） | （见理由） | manual_only | README 只提到删除：“act text it injects; the same path with DELETE and `?key=...` forgets one, without a k”，没提自动衰减，建议值 manual_only |
| Tree Ring Memory（`tree-ring-memory`） | （见理由） | manual_only | README 只提到删除：“ring recall "protocol design" tree-ring forget mem_example --mode delete --reason "exa”，没提自动衰减，建议值 manual_only |
| Engram（tstockham96）（`tstockham96-engram`） | （见理由） | auto_decay | README：“erything is present tense ／ Timestamps, decay, recency weighting ／ ／ **Proactive reca”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| Utsuwa（`utsuwa`） | 无 | none | 原表写“无”，可能是不遗忘，也可能只是没有自动机制但能手动删，需确认 |
| weighted-compact（`weighted-compact`） | （见理由） | auto_decay | README：“│ × topic-decay / REM │ │ (MCP / CLI) │ ove”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| widemem（`widemem-ai`） | （见理由） | auto_decay | README：“it does ／ ／---／---／ ／ **Importance and decay** ／ The LLM rates each fact 1 to 10. Se”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay |
| Yoji（`yoji`） | README 未描述 | — | 原表：README 未描述；— |
| Yorishiro（`yorishiro`） | 无 | none | 原表写“无”，可能是不遗忘，也可能只是没有自动机制但能手动删，需确认 |
| Yuralume Core（`yuralume-core`） | README 未描述 | — | 原表：README 未描述；— |

## `human_review`（18 处）

| 项目 | 原文 | 建议值 | 理由 |
|---|---|---|---|
| vMem（`0compactmem`） | （见理由） | — | 没找到查看或修改记忆的方式 |
| Acheron（`acheron-mcp-server`） | （见理由） | — | 没找到查看或修改记忆的方式 |
| Being（`being`） | （见理由） | — | 没找到查看或修改记忆的方式 |
| claude-find（`claude-find`） | （见理由） | — | 没找到查看或修改记忆的方式 |
| DreamVault（`dreamvault`） | （见理由） | — | 没找到查看或修改记忆的方式 |
| EchoVault（`echovault`） | （见理由） | — | 没找到查看或修改记忆的方式 |
| HMS（`hms`） | （见理由） | — | 没找到查看或修改记忆的方式 |
| kimi-core（`kimi-core`） | （见理由） | — | 没找到查看或修改记忆的方式 |
| LangMem（`langmem`） | （见理由） | — | 没找到查看或修改记忆的方式 |
| LoreRoom（`loreroom`） | （见理由） | — | 没找到查看或修改记忆的方式 |
| MemEngine（`memengine`） | （见理由） | — | 没找到查看或修改记忆的方式 |
| MemMachine（`memmachine`） | （见理由） | — | 没找到查看或修改记忆的方式 |
| MemoryMesh（`memorymesh`） | （见理由） | — | 没找到查看或修改记忆的方式 |
| MemoryOS（`memoryos`） | （见理由） | — | 没找到查看或修改记忆的方式 |
| Myco（`myco`） | （见理由） | — | 没找到查看或修改记忆的方式 |
| OmniDimen Emotion（`omnidimen-emotion`） | （见理由） | — | 没找到查看或修改记忆的方式 |
| Knowledge Graph Memory Server（MCP 官方）（`servers`） | （见理由） | — | 没找到查看或修改记忆的方式 |
| Statewave（`statewave`） | （见理由） | — | 没找到查看或修改记忆的方式 |

## `export`（130 处）

| 项目 | 原文 | 建议值 | 理由 |
|---|---|---|---|
| vMem（`0compactmem`） | （见理由） | sqlite | 没写导出功能，但数据在单个 SQLite 文件里：“he store. 2. **Store** — single SQLite file (WAL mode) with FTS5 ful”，建议值 sqlite |
| Acheron（`acheron-mcp-server`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Aelios（`aelios`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| agent-memory（g1itchbot）（`agent-memory`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| agentic-recall（`agentic-recall`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| AgentRecall（`agentrecall`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| AI Pocket Chat（`ai-pocket-chat`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Alaya（`alaya`） | （见理由） | sqlite | 没写导出功能，但数据在单个 SQLite 文件里：“embeddable Rust library. One SQLite file. No external services. Y”，建议值 sqlite |
| archon-memory-core（`archon-memory-core`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| LivingMemory（`astrbot-plugin-livingmemory`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| AstrBot 自主学习（`astrbot-plugin-self-learning`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| memex（ayushagrawal288）（`ayushagrawal288-memex`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Being（`being`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| birkin-mnemosyne（`birkin-mnemosyne`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Bitterbot（`bitterbot-desktop`） | （见理由） | markdown | 没写导出功能，但记忆本身存成 Markdown 文件，可以直接拷走：“ives ／ SQLite and Markdown files on your disk”，建议值 markdown |
| causal-memory（`causal-memory`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| 和机的另一个家 ChatNest UI（`chatnest-ui`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| claude-find（`claude-find`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Claude-Mem（`claude-mem`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Claude Soul（`claude-soul`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Cometline（`cometline`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Companion Emergence（`companion-emergence`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Context-Keeper（`context-keeper`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| ContextLattice（`contextlattice`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| cosmos-mcp（`cosmos-mcp`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| CRBRO（`crbro-memory`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| 守护猴 Daemonkey（`daemonkey-agent`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| DreamVault（`dreamvault`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Drivesoid（`drivesoid`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Echo Mistik（`echo-mistik`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| EchoVault（`echovault`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| engram-rs（`engram-rs`） | （见理由） | sqlite | 没写导出功能，但数据在单个 SQLite 文件里：“/p> Single Rust binary, one SQLite file, zero external dependenc”，建议值 sqlite |
| Eros Engine（`eros-engine`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| EverOS（`everos`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Engram（FBISiri）（`fbisiri-engram`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| FluctlightDB（`fluctlightdb`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| GENOME（`genome`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Graphiti（Zep）（`graphiti`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Hindsight（`hindsight`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Hipocampo（`hipocampo`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| HMS（`hms`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Honcho（`honcho`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| HoneyOS（`honey-os`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Hyperconsciousness（`hyperconsciousness`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| IAI 个人记忆引擎（`iai-personal-memory-engine`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| imprint-memory（`imprint-memory`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| 洞察捕捉 Insight（`insight`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Jarvis Orb（`jarvis-orb`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| kimi-core（`kimi-core`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| kimi-room（`kimi-room`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Kremis（`kremis`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| LangMem（`langmem`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| lean-memory（`lean-memory`） | （见理由） | sqlite | 没写导出功能，但数据在单个 SQLite 文件里：“emory(root="./data") # one SQLite file per namespace, stored un”，建议值 sqlite |
| Letta（原 MemGPT）（`letta`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| L.I.F.E.（`life`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| notebook.py（`llmcompressor`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| LocalKeep（`localkeep`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| lore（`lore`） | （见理由） | sqlite | 没写导出功能，但数据在单个 SQLite 文件里：“the index. **Storage:** Single SQLite file at `~/.lore/lore.db` wit”，建议值 sqlite |
| LoreRoom（`loreroom`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| 机的独立工作室 Machine Studio（`machine-studio`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Magnemo（`magnemo`） | （见理由） | markdown | 没写导出功能，但记忆本身存成 Markdown 文件，可以直接拷走：“runs on your machine, in plain markdown files you own. The package imp”，建议值 markdown |
| mcp-agent-memory（`mcp-agent-memory`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| mcp-memory-service（`mcp-memory-service`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| mem0-mcp-selfhosted（`mem0-mcp-selfhosted`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Mem0（`mem0`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| mem9（`mem9`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| MemEngine（`memengine`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| memgres（`memgres`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| MemHeaven（`memheaven`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| memkeeper（`memkeeper`） | （见理由） | sqlite | 没写导出功能，但数据在单个 SQLite 文件里：“y. - **Local-first.** A single SQLite database. No server, no cloud, no”，建议值 sqlite |
| MemMachine（`memmachine`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| memo（`memo`） | （见理由） | markdown | 没写导出功能，但记忆本身存成 Markdown 文件，可以直接拷走：“s/diagram-recall.svg) **Markdown is the source of truth.** Every memory is a pla”，建议值 markdown |
| Memobase（`memobase`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| MemoCall（`memocall`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Memora（`memora`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Memori（`memori`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| memory-mcp-1file（`memory-mcp-1file`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Memory MCP（michael-denyer）（`memory-mcp`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| MemoryBear（`memorybear`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| 记忆星图 Memory Constellations（`memoryconstellations`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| MemoryMesh（`memorymesh`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| MemoryOS（`memoryos`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| MemOS（`memos`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| memU（`memu`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Mengram（`mengram`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Midas（`midas`） | （见理由） | sqlite | 没写导出功能，但数据在单个 SQLite 文件里：“or, and your chat app at one SQLite file and they share one liv”，建议值 sqlite |
| MIRA OS（`mira-oss`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Mnemo Cortex（`mnemo-cortex`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| mnemory（`mnemory`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| mnemos（vishalbanwari26）（`mnemos`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Mnemosyne（OpenClaw/Hermes 版）（`mnemosyne-agentmemory-engine-openclaw-hermes`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| MochiBot（`mochibot`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Myco（`myco`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Nocturne Memory（`nocturne-memory`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| OMEGA（`omega-memory`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| omemo（`omemo`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| OmniDimen Emotion（`omnidimen-emotion`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Omnigraph（`omnigraph`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| OpenHer（`openher`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| LongMemory（原 OpenMemory）（`openmemory`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| OpenViking（`openviking`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| 草履虫 Paramecium（`paramecium`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Personal Understanding（`personal-understanding`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Psycheros（`psycheros`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| ReMe（`reme`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Remembra Relay（`remembra`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Resonant Mind（`resonant-mind`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Resonant（`resonant`） | （见理由） | sqlite | 没写导出功能，但数据在单个 SQLite 文件里：“.** One Node.js process, one SQLite database, one web page you open i”，建议值 sqlite |
| RetainDB（`retaindb`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| roampal-core（`roampal-core`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Sapphire（`sapphire`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Second Me（`second-me`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Knowledge Graph Memory Server（MCP 官方）（`servers`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Shodh-Memory（`shodh-memory`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| SAME（`statelessagent`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Statewave（`statewave`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Supermemory（`supermemory`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Synapse（`synapse`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Synthetic Heart（`synthetic-heart`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Talamus（`talamus`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| taOSmd（`taosmd`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| TeleMem（`telemem`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| TencentDB Agent Memory（`tencentdb-agent-memory`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| 三天没睡（`three-days-no-sleep`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| TokenMizer（`tokenmizer`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| weighted-compact（`weighted-compact`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| 心潮念（`xinchao-nian`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Yorishiro（`yorishiro`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| Yuralume Core（`yuralume-core`） | （见理由） | — | 没写导出功能，也看不出数据格式 |
| ZenBrain（`zenbrain`） | （见理由） | — | 没写导出功能，也看不出数据格式 |

## `data_passes_through`（2 处）

| 项目 | 原文 | 建议值 | 理由 |
|---|---|---|---|
| 和机的另一个家 ChatNest UI（`chatnest-ui`） | （见理由） | — | 运行位置未识别 |
| DreamVault（`dreamvault`） | （见理由） | — | 运行位置未识别 |

## `license_category`（3 处）

| 项目 | 原文 | 建议值 | 理由 |
|---|---|---|---|
| 和机的另一个家 ChatNest UI（`chatnest-ui`） | 自定义源码可用许可（禁止商用、强制署名） | noncommercial | 许可证原文：自定义源码可用许可（禁止商用、强制署名）（含多份许可，取限制最多的一项） |
| Resonant Mind（`resonant-mind`） | Codependent AI Source-Available License（自定义） | source_available | 许可证原文：Codependent AI Source-Available License（自定义） |
| Synthetic Heart（`synthetic-heart`） | GPL-3.0＋附加条款（LICENSE_ADDENDUM） | copyleft | 许可证原文：GPL-3.0＋附加条款（LICENSE_ADDENDUM） |
