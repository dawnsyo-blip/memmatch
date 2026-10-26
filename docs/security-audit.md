# 项目安全审查（2026-10-26）

范围：`data/projects/` 全部 239 个项目。方法：读各项目 README 缓存（236 份），再把 GitHub 项目浅克隆到临时目录（只读文本，不运行任何代码），按下列模式扫描。

## 结论

**没有发现需要删除的项目。** 未找到任何一个项目的代码或配置里藏有“诱导 AI 把内容发往第三方”的提示词，也没有混淆执行、窃取凭据或浏览器数据的代码。

## 扫描项

| 类别 | 结果 |
|---|---|
| 针对 AI 的隐藏指令（“忽略之前的指令”“不要告诉用户”“`<IMPORTANT>`”标签、要求发送文件/对话到某网址） | 命中全是防御代码、测试样例或红队报告（如 agentrecall、remembra、atmem、statelessagent 的过滤规则）；无真实注入 |
| 写给 AI 的技能/指令文件（SKILL.md、AGENTS.md、llms.txt、setup.md）里向外部地址 POST | 全是项目自己的 API 或第三方官方 API（mem0、supermemory、Notion、Trello、Telegram 等），属功能本身 |
| 混淆/远程执行（`eval(atob)`、`exec(b64decode)`、`marshal.loads` 等） | 无，命中均为 HTML 实体转义等 |
| 安装脚本 `curl \| sh`、`irm \| iex` | 约 35 个项目有，目标域名都是项目自己的域名或 GitHub 原始地址 |
| npm `postinstall` | 18 个，均为项目自带脚本（下载二进制、编译 sqlite 等），未见可疑域名 |
| 外泄通道（Discord/Slack webhook、pastebin、transfer.sh、裸 IP） | 仅见于用户自行配置的机器人推送、文档示例 |
| 读取 SSH 密钥、浏览器 Cookie、钱包 | 无（daemonkey-agent 只是在注释里说明为何不复制 Edge 的 Cookie） |
| 钩子（UserPromptSubmit/Stop）外发 | 仅发往本机或用户自己配置的记忆服务 |

## 需要注意但不构成恶意的项目

以下三项（mnemo-cortex、bitterbot-desktop、remembra）已写进 `data/safety_notes.json`，由 normalize.py 写入项目的 `safety_note`，推荐时应向用户提示。托管上传已由 `data_passes_through` 表示，不重复写备注。

- **mnemo-cortex**：`adapters/openclaw/SKILL-MNEMO-LIVEWIRE.md` 要求 AI 每次回复后“静默”把用户消息和回复 POST 到本机 `localhost:50001`，并写了“不要征求许可、不要告诉用户”。只发往本机，不外传，但这种不告诉用户的写法值得知悉。
- **托管型记忆服务**（Mem0、Supermemory、Central Intelligence、mem9 等）：按设计会把对话内容发到厂商服务器。这是产品本身的特点，不是恶意，页面上应标明“数据会上传”。
- **bitterbot-desktop**：自带钱包与 x402 支付能力、会在 moltbook 等社交站自动注册，自主性很强，使用时要留意权限。
- **crbro-memory**：README 里有 USDC 打赏地址，属捐赠，无其它异常。
- **remembra**：`llms-full.txt` 里写了“只引用官网价格”之类给 AI 的话，属于营销引导，不涉及外发。

## 无法审查

- **akephalos**（daveinturkey15-byte/akephalos）：仓库现在返回 404（已删除或转私有），原本就是 0 Star 的新账号。代码无法核对。**负责人 2026-10-26 决定移除**：候选结论改为排除，项目文件、覆盖值和核实记录已删。
- **kimi-core、kimi-room**：仓库不可克隆，已是 excluded。
- **echovault**：不是 GitHub 仓库（小红书链接），已是 excluded，无法审查。

## 局限

这是模式扫描加抽读，不是逐行代码审计：239 个项目里不少是大型框架（mastra、gbrain、honey-os 等），无法保证没有任何隐蔽行为。没有扫描依赖包本身（npm/PyPI 的供应链）。需要更高把握时，应对最常被推荐的项目单独做代码审读。

## 补充审查：多智能体记忆项目（2026-10-26）

新收录 9 个：Cognee、MIRIX、Memanto、PowerMem、deja、agentmemory（rohitg00）、Caura、Memorix、A-MEM。方法同上：浅克隆到临时目录，只读文本、不运行代码，扫描隐藏指令、混淆执行、`curl | sh`、postinstall、外泄通道和凭据读取。

**结论：没有发现恶意行为。** 命中项逐条看过：

| 项目 | 命中 | 判断 |
|---|---|---|
| Caura | README 和技能文件里的 `curl … \| bash` 从服务器取安装脚本 | 目标是项目自己的域名或用户自己的服务器，但脚本内容随服务器变化，已写 `safety_notes`（notice） |
| agentmemory | CHANGELOG 里的安装器 `curl \| sh`；README 提供“让 AI 读取远程安装说明自行安装” | 目标是项目自己和上游安装器的域名；已写 `safety_notes`（info） |
| deja | 测试文件里的“忽略指令”样例、`curl \| sh` | 前者是防注入的测试样例；后者是项目自己的安装脚本 |
| Cognee | 代码里出现 `~/.aws/credentials` 字样 | 是注释，说明为何不索引凭据文件 |
| Memorix | `env-api-keys.ts` 读 AWS 配置名 | 读取用户自己配置的模型密钥，属功能 |
| Memanto | `irm https://astral.sh/uv/install.ps1 \| iex` | uv 官方安装器；Vapi 的 webhook 是语音集成功能 |
| MIRIX | 无可疑项 | 但会持续截屏，已写 `safety_notes`（notice） |

**未收录**：Cipher（ByteRover，campfirein/cipher，4945 Star，LoCoMo 96.1%）——仓库已归档，许可证为 Elastic 2.0（非 OSI 开源），记为排除。memX（68 Star）、mcp-shared-memory（5 Star）、agenthelm（6 Star）因 Star 太少且无评测成绩未收。Eion 仓库无法访问。

局限同上：模式扫描加抽读，不是逐行审计；依赖包未扫。
