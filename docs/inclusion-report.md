# 阶段 3 收录状态报告

> 由 `scripts/decide_inclusion.py` 生成，判定日期 2026-10-11。依据说明文档、仓库内容和阶段 2 的检查结果（`docs/health-report.md`），**没有实际安装验证**。

## 判定规则

- **排除 C**：仓库已归档。只是长期没有提交、但没有“跑不通”的证据的，不排除，只加风险提示（仓库问题反馈没有逐个查看）。
- **排除 B**（核心闭源、只能用托管）已在候选表阶段排除，此处不再出现；**排除 D**（无导出且格式不开放）目前没有项目被确认“无导出”，暂未触发。
- **排除 N**：代码不在 GitHub 上或仓库无法访问（负责人 2026-10-11 决定排除；`data/settings.json` 的 `exclude_unreachable` 关掉后改为待定）。
- **风险提示**（只提示、不排除）：超过停更阈值没有提交、近一年只有一人维护、没有正式发布版本、没有许可证文件、许可证禁止商用或限制使用、对话内容经过第三方服务器。
- **与路线图的差异**：负责人决定收录需写代码（A）、应用自带记忆（E1）、存的不是记忆（E2）的项目，用“收录类别”区分，不排除。

## 统计

| 状态 | 数量 |
|---|---|
| 收录 | 83 |
| 收录但加风险提示 | 93 |
| 排除 | 3 |
| 待定（证据不足） | 0 |

| 收录类别 | 收录 | 收录但提示 | 排除 | 待定 |
|---|---|---|---|---|
| 可接入已有助手 | 58 | 58 | 1 | 0 |
| 自带记忆的应用 | 10 | 13 | 1 | 0 |
| 需写代码（开发者向） | 15 | 20 | 1 | 0 |
| 边缘项（存的不是对话记忆） | 0 | 2 | 0 | 0 |

| 风险提示 | 项目数 |
|---|---|
| 近一年只有一人维护 | 47 |
| 没有正式发布版本 | 38 |
| 超过 180 天没有提交 | 13 |
| 托管模式下对话内容经过第三方服务器（也可自己部署） | 9 |
| 许可证禁止商用 | 9 |
| 对话内容默认经过第三方服务器 | 8 |
| 没有许可证文件 | 7 |
| 近一年没有人提交 | 2 |
| 许可证限制使用（源码可见） | 2 |
| 许可证限制使用（据原表／README） | 1 |
| 许可证非标准，需看原文 | 1 |
| 许可证禁止商用（据原表／README，部分内容） | 1 |

## 排除（3 个）

| 项目 | 代码 | 原因 |
|---|---|---|
| EchoVault（`echovault`） | N | 代码不在 GitHub 上，无法自动检查 |
| kimi-core（`kimi-core`） | N | 仓库无法访问（已删除、改名或设为私有） |
| kimi-room（`kimi-room`） | N | 仓库无法访问（已删除、改名或设为私有） |

## 收录但加风险提示（93 个）

| 项目 | 收录类别 | 风险提示 |
|---|---|---|
| Acheron（`acheron-mcp-server`） | 可接入已有助手 | 超过 180 天没有提交、近一年只有一人维护、没有正式发布版本 |
| agent-memory（g1itchbot）（`agent-memory`） | 可接入已有助手 | 超过 180 天没有提交、近一年只有一人维护、没有正式发布版本 |
| agentic-recall（`agentic-recall`） | 可接入已有助手 | 近一年只有一人维护 |
| Akephalos（`akephalos`） | 可接入已有助手 | 近一年只有一人维护、没有正式发布版本 |
| Basic Memory（`basic-memory`） | 可接入已有助手 | 托管模式下对话内容经过第三方服务器（也可自己部署） |
| Central Intelligence（`central-intelligence`） | 可接入已有助手 | 对话内容默认经过第三方服务器 |
| claude-find（`claude-find`） | 可接入已有助手 | 近一年只有一人维护、没有正式发布版本 |
| claude-handoff（`claude-handoff`） | 可接入已有助手 | 近一年只有一人维护 |
| Claude-Mem（`claude-mem`） | 可接入已有助手 | 托管模式下对话内容经过第三方服务器（也可自己部署） |
| Context-Keeper（`context-keeper`） | 可接入已有助手 | 超过 180 天没有提交、没有正式发布版本 |
| context-memory（`context-memory`） | 可接入已有助手 | 超过 180 天没有提交、近一年只有一人维护 |
| cosmos-mcp（`cosmos-mcp`） | 可接入已有助手 | 对话内容默认经过第三方服务器 |
| engram-rs（`engram-rs`） | 可接入已有助手 | 超过 180 天没有提交、近一年只有一人维护 |
| Engram（FBISiri）（`fbisiri-engram`） | 可接入已有助手 | 近一年只有一人维护 |
| Engram（tstockham96）（`tstockham96-engram`） | 可接入已有助手 | 近一年只有一人维护 |
| fable（`fable`） | 可接入已有助手 | 没有正式发布版本 |
| Graph Memory（`graph-memory`） | 可接入已有助手 | 近一年只有一人维护 |
| Honcho（`honcho`） | 可接入已有助手 | 托管模式下对话内容经过第三方服务器（也可自己部署） |
| imprint-memory（`imprint-memory`） | 可接入已有助手 | 近一年只有一人维护、没有正式发布版本 |
| kiwi-mem（`kiwi-mem`） | 可接入已有助手 | 托管模式下对话内容经过第三方服务器（也可自己部署） |
| Kybase（`kybase`） | 可接入已有助手 | 近一年只有一人维护 |
| L.I.F.E.（`life`） | 可接入已有助手 | 超过 180 天没有提交、近一年只有一人维护、没有正式发布版本 |
| lean-memory（`lean-memory`） | 可接入已有助手 | 近一年只有一人维护 |
| LocalKeep（`localkeep`） | 可接入已有助手 | 没有正式发布版本 |
| lore（`lore`） | 可接入已有助手 | 没有正式发布版本 |
| LoreRoom（`loreroom`） | 可接入已有助手 | 近一年只有一人维护、没有正式发布版本 |
| Magnemo（`magnemo`） | 可接入已有助手 | 近一年只有一人维护 |
| Mem0（`mem0`） | 可接入已有助手 | 对话内容默认经过第三方服务器 |
| mem0-mcp-selfhosted（`mem0-mcp-selfhosted`） | 可接入已有助手 | 超过 180 天没有提交 |
| mem9（`mem9`） | 可接入已有助手 | 没有正式发布版本、对话内容默认经过第三方服务器 |
| MemHeaven（`memheaven`） | 可接入已有助手 | 没有正式发布版本 |
| MemMachine（`memmachine`） | 可接入已有助手 | 托管模式下对话内容经过第三方服务器（也可自己部署） |
| memo（`memo`） | 可接入已有助手 | 近一年只有一人维护 |
| MemoCall（`memocall`） | 可接入已有助手 | 近一年只有一人维护、没有正式发布版本 |
| Memori（`memori`） | 可接入已有助手 | 对话内容默认经过第三方服务器 |
| memory-lancedb-pro（`memory-lancedb-pro`） | 可接入已有助手 | 没有许可证文件 |
| MemoryMesh（`memorymesh`） | 可接入已有助手 | 超过 180 天没有提交、没有正式发布版本 |
| MemOS（`memos`） | 可接入已有助手 | 托管模式下对话内容经过第三方服务器（也可自己部署） |
| memU（`memu`） | 可接入已有助手 | 托管模式下对话内容经过第三方服务器（也可自己部署） |
| Mengram（`mengram`） | 可接入已有助手 | 对话内容默认经过第三方服务器 |
| Mind Map（`mindmap-mcp-server`） | 可接入已有助手 | 近一年只有一人维护 |
| Mnemosyne（OpenClaw/Hermes 版）（`mnemosyne-agentmemory-engine-openclaw-hermes`） | 可接入已有助手 | 没有正式发布版本 |
| Myco（`myco`） | 可接入已有助手 | 近一年只有一人维护 |
| notebook.py（`llmcompressor`） | 可接入已有助手 | 近一年只有一人维护、没有正式发布版本 |
| Remembra Relay（`remembra`） | 可接入已有助手 | 近一年只有一人维护 |
| Resonant Mind（`resonant-mind`） | 可接入已有助手 | 许可证禁止商用、许可证限制使用（据原表／README） |
| RetainDB（`retaindb`） | 可接入已有助手 | 没有正式发布版本 |
| roampal-core（`roampal-core`） | 可接入已有助手 | 近一年只有一人维护 |
| SAME（`statelessagent`） | 可接入已有助手 | 许可证限制使用（源码可见） |
| ShadowGraph（`shadowgraph`） | 可接入已有助手 | 近一年只有一人维护 |
| Supermemory（`supermemory`） | 可接入已有助手 | 对话内容默认经过第三方服务器 |
| taOSmd（`taosmd`） | 可接入已有助手 | 近一年只有一人维护 |
| Tessera（`project-tessera`） | 可接入已有助手 | 超过 180 天没有提交 |
| vMem（`0compactmem`） | 可接入已有助手 | 近一年只有一人维护、没有许可证文件 |
| YourMemory（`yourmemory`） | 可接入已有助手 | 许可证禁止商用 |
| 心潮念（`xinchao-nian`） | 可接入已有助手 | 许可证禁止商用（据原表／README，部分内容） |
| 机的独立工作室 Machine Studio（`machine-studio`） | 可接入已有助手 | 近一年只有一人维护、没有正式发布版本 |
| 洞察捕捉 Insight（`insight`） | 可接入已有助手 | 近一年只有一人维护、没有正式发布版本、没有许可证文件 |
| AI Pocket Chat（`ai-pocket-chat`） | 自带记忆的应用 | 近一年只有一人维护、没有正式发布版本 |
| Echo Mistik（`echo-mistik`） | 自带记忆的应用 | 近一年只有一人维护、许可证禁止商用 |
| HoneyOS（`honey-os`） | 自带记忆的应用 | 没有正式发布版本 |
| InternalBeyond 移动版（`internalbeyond-mobile`） | 自带记忆的应用 | 近一年只有一人维护、没有正式发布版本、许可证禁止商用 |
| KI-CO 小屋（`ki-co`） | 自带记忆的应用 | 许可证禁止商用 |
| Letta（原 MemGPT）（`letta`） | 自带记忆的应用 | 托管模式下对话内容经过第三方服务器（也可自己部署） |
| Memex（`memex-lab-memex`） | 自带记忆的应用 | 托管模式下对话内容经过第三方服务器（也可自己部署） |
| OpenHer（`openher`） | 自带记忆的应用 | 近一年只有一人维护 |
| Second Me（`second-me`） | 自带记忆的应用 | 超过 180 天没有提交、近一年没有人提交 |
| Synthetic Heart（`synthetic-heart`） | 自带记忆的应用 | 许可证非标准，需看原文 |
| Yoji（`yoji`） | 自带记忆的应用 | 近一年只有一人维护 |
| Yuralume Core（`yuralume-core`） | 自带记忆的应用 | 近一年只有一人维护、许可证限制使用（源码可见） |
| 三天没睡（`three-days-no-sleep`） | 自带记忆的应用 | 近一年只有一人维护、没有正式发布版本、许可证禁止商用 |
| Drivesoid（`drivesoid`） | 边缘项（存的不是对话记忆） | 近一年只有一人维护、许可证禁止商用 |
| OmniDimen Emotion（`omnidimen-emotion`） | 边缘项（存的不是对话记忆） | 超过 180 天没有提交、近一年只有一人维护、没有正式发布版本、没有许可证文件 |
| Acontext（`acontext`） | 需写代码（开发者向） | 对话内容默认经过第三方服务器 |
| Being（`being`） | 需写代码（开发者向） | 没有正式发布版本、没有许可证文件 |
| Celiums Memory（`celiums-memory`） | 需写代码（开发者向） | 近一年只有一人维护 |
| DreamVault（`dreamvault`） | 需写代码（开发者向） | 近一年只有一人维护、没有正式发布版本 |
| Eros Engine（`eros-engine`） | 需写代码（开发者向） | 近一年只有一人维护 |
| FluctlightDB（`fluctlightdb`） | 需写代码（开发者向） | 近一年只有一人维护 |
| GoodMemory（`goodmemory`） | 需写代码（开发者向） | 近一年只有一人维护 |
| Hipocampo（`hipocampo`） | 需写代码（开发者向） | 近一年只有一人维护 |
| HMS（`hms`） | 需写代码（开发者向） | 没有正式发布版本 |
| Hyperconsciousness（`hyperconsciousness`） | 需写代码（开发者向） | 没有正式发布版本 |
| LangMem（`langmem`） | 需写代码（开发者向） | 没有正式发布版本 |
| MemEngine（`memengine`） | 需写代码（开发者向） | 超过 180 天没有提交、近一年没有人提交、没有正式发布版本、没有许可证文件 |
| memex（ayushagrawal288）（`ayushagrawal288-memex`） | 需写代码（开发者向） | 近一年只有一人维护 |
| memgres（`memgres`） | 需写代码（开发者向） | 没有正式发布版本 |
| Memobase（`memobase`） | 需写代码（开发者向） | 超过 180 天没有提交、没有正式发布版本 |
| mnemos（vishalbanwari26）（`mnemos`） | 需写代码（开发者向） | 近一年只有一人维护、没有正式发布版本 |
| Mímir（`mimir`） | 需写代码（开发者向） | 没有正式发布版本、许可证禁止商用 |
| 和机的另一个家 ChatNest UI（`chatnest-ui`） | 需写代码（开发者向） | 没有正式发布版本、许可证禁止商用 |
| 草履虫 Paramecium（`paramecium`） | 需写代码（开发者向） | 没有正式发布版本、没有许可证文件 |
| 记忆星图 Memory Constellations（`memoryconstellations`） | 需写代码（开发者向） | 近一年只有一人维护、没有正式发布版本 |

## 收录（83 个）

| 项目 | 收录类别 | 风险提示 |
|---|---|---|
| Aelios（`aelios`） | 可接入已有助手 | — |
| afair（`afair`） | 可接入已有助手 | — |
| AgentRecall（`agentrecall`） | 可接入已有助手 | — |
| AstrBot 自主学习（`astrbot-plugin-self-learning`） | 可接入已有助手 | — |
| AtMem（`atmem`） | 可接入已有助手 | — |
| birkin-mnemosyne（`birkin-mnemosyne`） | 可接入已有助手 | — |
| causal-memory（`causal-memory`） | 可接入已有助手 | — |
| Claude Soul（`claude-soul`） | 可接入已有助手 | — |
| Claudex（`claudex`） | 可接入已有助手 | — |
| Cometline（`cometline`） | 可接入已有助手 | — |
| Compartment（`compartment`） | 可接入已有助手 | — |
| ContextLattice（`contextlattice`） | 可接入已有助手 | — |
| CRBRO（`crbro-memory`） | 可接入已有助手 | — |
| Engram（HBarefoot）（`hbarefoot-engram`） | 可接入已有助手 | — |
| Facthouse（`facthouse`） | 可接入已有助手 | — |
| GBrain（`gbrain`） | 可接入已有助手 | — |
| GENOME（`genome`） | 可接入已有助手 | — |
| Hindsight（`hindsight`） | 可接入已有助手 | — |
| IAI 个人记忆引擎（`iai-personal-memory-engine`） | 可接入已有助手 | — |
| Jarvis Orb（`jarvis-orb`） | 可接入已有助手 | — |
| Knowledge Graph Memory Server（MCP 官方）（`servers`） | 可接入已有助手 | — |
| LivingMemory（`astrbot-plugin-livingmemory`） | 可接入已有助手 | — |
| Longhand（`longhand`） | 可接入已有助手 | — |
| LongMemory（原 OpenMemory）（`openmemory`） | 可接入已有助手 | — |
| mcp-memory-service（`mcp-memory-service`） | 可接入已有助手 | — |
| memkeeper（`memkeeper`） | 可接入已有助手 | — |
| Memory MCP（michael-denyer）（`memory-mcp`） | 可接入已有助手 | — |
| memory-mcp-1file（`memory-mcp-1file`） | 可接入已有助手 | — |
| MemoryOS（`memoryos`） | 可接入已有助手 | — |
| MemTether（`memtether`） | 可接入已有助手 | — |
| Midas（`midas`） | 可接入已有助手 | — |
| mneme（`mneme`） | 可接入已有助手 | — |
| mnemo（`mnemo-mcp`） | 可接入已有助手 | — |
| Mnemo Cortex（`mnemo-cortex`） | 可接入已有助手 | — |
| mnemory（`mnemory`） | 可接入已有助手 | — |
| mnemostack（`mnemostack`） | 可接入已有助手 | — |
| Neotoma（`neotoma`） | 可接入已有助手 | — |
| Nocturne Memory（`nocturne-memory`） | 可接入已有助手 | — |
| Ombre Brain（`ombre-brain`） | 可接入已有助手 | — |
| OMEGA（`omega-memory`） | 可接入已有助手 | — |
| omemo（`omemo`） | 可接入已有助手 | — |
| OpenViking（`openviking`） | 可接入已有助手 | — |
| people-context（`people-context`） | 可接入已有助手 | — |
| Personal Understanding（`personal-understanding`） | 可接入已有助手 | — |
| Piia Engram（`piia-engram`） | 可接入已有助手 | — |
| Prism Coder（`prism-mcp`） | 可接入已有助手 | — |
| Psycheros（`psycheros`） | 可接入已有助手 | — |
| ReMe（`reme`） | 可接入已有助手 | — |
| Remnic（`remnic`） | 可接入已有助手 | — |
| Shodh-Memory（`shodh-memory`） | 可接入已有助手 | — |
| Synapse（`synapse`） | 可接入已有助手 | — |
| Talamus（`talamus`） | 可接入已有助手 | — |
| TencentDB Agent Memory（`tencentdb-agent-memory`） | 可接入已有助手 | — |
| TokenMizer（`tokenmizer`） | 可接入已有助手 | — |
| Tree Ring Memory（`tree-ring-memory`） | 可接入已有助手 | — |
| weighted-compact（`weighted-compact`） | 可接入已有助手 | — |
| widemem（`widemem-ai`） | 可接入已有助手 | — |
| 爪迹 Pawwake（`pawwake`） | 可接入已有助手 | — |
| Bitterbot（`bitterbot-desktop`） | 自带记忆的应用 | — |
| Companion Emergence（`companion-emergence`） | 自带记忆的应用 | — |
| MIRA OS（`mira-oss`） | 自带记忆的应用 | — |
| MochiBot（`mochibot`） | 自带记忆的应用 | — |
| Resonant（`resonant`） | 自带记忆的应用 | — |
| Sapphire（`sapphire`） | 自带记忆的应用 | — |
| Utsuwa（`utsuwa`） | 自带记忆的应用 | — |
| Yorishiro（`yorishiro`） | 自带记忆的应用 | — |
| 墨知 MoRead（`moread`） | 自带记忆的应用 | — |
| 守护猴 Daemonkey（`daemonkey-agent`） | 自带记忆的应用 | — |
| Alaya（`alaya`） | 需写代码（开发者向） | — |
| alethech（`alethech`） | 需写代码（开发者向） | — |
| archon-memory-core（`archon-memory-core`） | 需写代码（开发者向） | — |
| Aura Memory（`aurasdk`） | 需写代码（开发者向） | — |
| EverOS（`everos`） | 需写代码（开发者向） | — |
| Graphiti（Zep）（`graphiti`） | 需写代码（开发者向） | — |
| inspeximus（`inspeximus`） | 需写代码（开发者向） | — |
| Kremis（`kremis`） | 需写代码（开发者向） | — |
| mcp-agent-memory（`mcp-agent-memory`） | 需写代码（开发者向） | — |
| Memora（`memora`） | 需写代码（开发者向） | — |
| MemoryBear（`memorybear`） | 需写代码（开发者向） | — |
| Omnigraph（`omnigraph`） | 需写代码（开发者向） | — |
| Statewave（`statewave`） | 需写代码（开发者向） | — |
| TeleMem（`telemem`） | 需写代码（开发者向） | — |
| ZenBrain（`zenbrain`） | 需写代码（开发者向） | — |
