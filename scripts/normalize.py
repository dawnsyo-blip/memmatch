"""阶段 1：把项目 JSON 里的自由文字整理成固定选项，写入每个文件的 normalized 字段。

依据（按优先级）：负责人确认值 > 原表结构化字段（raw.记忆项目总表）> info 里的说明 > README 关键词。
每个字段输出 {value, status, basis}：
  status = confirmed（负责人确认）| auto（规则有把握）| needs_review（拿不准，不猜，进待审核清单）
同时生成待审核清单 docs/review-normalization.md 和可填写的 docs/review-normalization.xlsx。

用法（在仓库根目录）：
  python -X utf8 scripts/fetch_readmes.py           先缓存 README（只需一次）
  python -X utf8 scripts/normalize.py               生成规范化结果和待审核清单
  python -X utf8 scripts/normalize.py --apply-review
      读回 docs/review-normalization.xlsx「待补充」页的「负责人确认值」，存入
      data/normalization_overrides.json，再重新生成
  python -X utf8 scripts/normalize.py --accept-suggestions
      把当前所有待审核项的建议值记为负责人确认（负责人 2026-10-11 决定）

没有建议值、规则也判断不了的字段，状态记为 unknown（文档未说明），并写进项目的
uncertainties 备注列表，说明哪里不确定、为什么。
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill

sys.path.insert(0, str(Path(__file__).resolve().parent))
import feature_rules as FR  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
PROJECTS = ROOT / "data/projects"
CACHE = ROOT / "cache/readmes"
OVERRIDES = ROOT / "data/normalization_overrides.json"
REVIEW_MD = ROOT / "docs/review-normalization.md"
REVIEW_XLSX = ROOT / "docs/review-normalization.xlsx"

# 字段 -> 可选值（中文说明）。schema 与审核清单都引用这里。
ENUMS = {
    "access": {"mcp": "MCP（让 AI 调用外部工具的通用接口）", "gateway": "网关／代理（挂在助手和模型之间）",
               "host_plugin": "宿主插件（含钩子、技能）", "library": "代码库（要写代码调用）", "standalone_app": "独立应用",
               "cli_tool": "命令行小工具（需要时自己运行）", "guide": "教程或设计文档（照着搭）"},
    "compatible_clients": {
        "claude_desktop": "Claude 桌面版", "claude_web_mobile": "Claude 网页／手机版", "claude_code": "Claude Code",
        "chatgpt": "ChatGPT", "openai_compatible": "任意 OpenAI 兼容客户端", "any_mcp_client": "任意 MCP 客户端",
        "cursor": "Cursor", "codex": "Codex", "gemini_cli": "Gemini CLI", "opencode": "OpenCode",
        "openclaw": "OpenClaw", "hermes": "Hermes", "astrbot": "AstrBot", "sillytavern": "SillyTavern",
        "open_webui": "Open WebUI", "kelivo": "Kelivo", "telegram": "Telegram", "wechat": "微信", "feishu": "飞书", "discord": "Discord",
        "self_contained": "自带界面（不接其它助手）", "developer_built": "开发者自建的应用"},
    "runs_on": {"own_computer": "自己的电脑", "own_server": "自己的服务器", "own_cloud_account": "自己的云账号",
                "phone": "手机", "third_party_hosted": "别人的服务器（托管）"},
    "os": {"windows": "Windows", "macos": "macOS", "linux": "Linux", "android": "安卓", "ios": "iOS",
           "any": "任何系统（浏览器即可）"},
    "difficulty": {"low": "低：应用商店或一键安装", "medium": "中：几条命令或按向导填设置", "high": "高：要写代码或改较多配置"},
    "cost": {"free": "免费", "model_fees_only": "只需模型调用费", "paid_service": "需付费服务或订阅"},
    "accounts_needed": {"none": "不需要", "github": "GitHub", "cloudflare": "Cloudflare", "render": "Render",
                        "model_api_key": "模型接口密钥", "vendor_account": "项目方账号", "telegram": "Telegram 机器人",
                        "claude_subscription": "Claude 付费套餐"},
    "memory_subject": {"user_facts": "用户本人的事实和偏好", "ai_identity": "AI 自身身份与关系", "experience": "做事经验",
                       "task_context": "当前任务上下文", "conversation_history": "历史对话原文"},
    "write_mode": {"auto": "自动记", "review_first": "先出候选再由人审核", "on_request": "由 AI 或用户主动调用时才记"},
    "forgetting": {"auto_decay": "自动衰减", "archive": "沉底归档（不删除）", "manual_only": "手动删除", "none": "不遗忘"},
    "human_review": {"dashboard": "网页面板／应用界面", "files": "直接看改文件", "cli": "命令行", "tools": "让 AI 调工具改"},
    "export": {"markdown": "Markdown", "json": "JSON", "sqlite": "SQLite 数据库文件", "other_file": "其它文件格式",
               "none": "无"},
    "data_passes_through": {"local_only": "仅本机或自己的服务器", "own_cloud": "用户自己的云账号", "third_party": "第三方服务器"},
    "license_category": {"permissive": "宽松", "copyleft": "要求开源衍生作品", "noncommercial": "禁止商用",
                         "source_available": "源码可见但限制使用", "no_license": "无许可证文件"},
}
# 用户在意的特性（定义见 feature_rules.py）
for _key, (_name, _desc) in FR.FEATURES.items():
    ENUMS[_key] = {"yes": "有", "not_mentioned": "未提及"}
FIELDS = list(ENUMS)  # 输出顺序
FIELD_LABELS = {
    "access": "接入方式", "compatible_clients": "能配合的助手", "runs_on": "运行位置", "os": "支持的系统",
    "difficulty": "上手门槛", "cost": "费用", "accounts_needed": "需要的账号", "memory_subject": "主要记住什么",
    "write_mode": "记忆怎么写入", "forgetting": "怎么遗忘", "human_review": "能否查看和修改记忆", "export": "能否导出",
    "data_passes_through": "数据经过谁的服务器", "license_category": "许可证类别",
    **{k: v[0] for k, v in FR.FEATURES.items()},
}
DECIDED_ON = "2026-10-11"
MULTI = {"access", "compatible_clients", "runs_on", "os", "accounts_needed", "memory_subject", "write_mode",
         "forgetting", "human_review", "export", "data_passes_through"}


def snippet(text, m, width=60):
    a, b = max(0, m.start() - width), min(len(text), m.end() + width)
    return re.sub(r"\s+", " ", text[a:b]).strip()


class Ctx:
    """一个项目的全部可用文字。"""

    def __init__(self, doc):
        self.doc = doc
        # 规则里用简称：desc subj acc cli run diff need lic note
        short = {"summary": "desc", "memory_subject": "subj", "access": "acc", "compatible_clients": "cli",
                 "runs_on": "run", "difficulty": "diff", "accounts_needed": "need", "license": "lic", "notes": "note"}
        self.info = {short[k]: v["value"] for k, v in doc["info"].items()}
        self.x = doc["raw"].get("记忆项目总表") or {}
        self.readme = (CACHE / f"{doc['id']}.md").read_text(encoding="utf-8") if (CACHE / f"{doc['id']}.md").exists() else ""
        self.cat = doc["candidate"]["category"]

    def text(self, *parts):
        out = []
        for p in parts:
            if p.startswith("x:"):
                out.append(str(self.x.get(p[2:]) or ""))
            else:
                out.append(self.info.get(p, ""))
        return "；".join(o for o in out if o)


def hits(text, table):
    """table: {值: 正则}，返回 [(值, 匹配摘录)]。"""
    found = []
    for value, pat in table.items():
        m = re.search(pat, text)
        if m:
            found.append((value, snippet(text, m, 25)))
    return found


def res(value, status, basis):
    return {"value": value, "status": status, "basis": basis}


# ---------------- 各字段规则 ----------------

def n_access(c):
    t = c.text("acc", "x:接入方式")
    found = hits(t, {
        "mcp": r"MCP",
        "gateway": r"网关|代理|proxy",
        "host_plugin": r"插件|钩子|技能|Skill|hook|SillyTavern 扩展|Open WebUI 函数",
        "library": r"代码库|Python 库|TypeScript 库|Rust 库|\bSDK\b|库＋|可嵌入|单个 Python 脚本|数据库＋|服务＋SDK|"
                   r"Node\.js (?:模块|包)|前端组件",
        "standalone_app": r"应用|App|桌面|网页工作台|阅读器|单个 HTML|伴侣|Agent（",
        "cli_tool": r"命令行工具|命令行脚本|桥接程序|^命令行$",
        "guide": r"教程|设计文档|规格说明",
    })
    vals = [v for v, _ in found]
    if c.cat == "教程与搭建指南" and "guide" not in vals:
        vals.append("guide")
    if c.cat == "自带记忆的应用" and "standalone_app" not in vals:
        vals.append("standalone_app")
    if c.cat == "需写代码（开发者向）" and not ({"library", "standalone_app"} & set(vals)):
        vals.append("library")
    if not vals:
        return res([], "needs_review", f"接入方式原文未识别：{t or '（空）'}")
    return res(sorted(set(vals)), "auto", "接入方式原文：" + t)


CLIENT_PATS = {
    "claude_desktop": r"Claude Desktop|Claude 桌面|Claude（Desktop|claude_desktop",
    "claude_web_mobile": r"claude\.ai|Claude 网页|Claude 官方网页|手机 App|Mobile, Web",
    "claude_code": r"Claude Code",
    "chatgpt": r"ChatGPT",
    "openai_compatible": r"OpenAI 兼容",
    "any_mcp_client": r"MCP 客户端|任意 MCP|any MCP",
    "cursor": r"Cursor", "codex": r"Codex", "gemini_cli": r"Gemini CLI", "opencode": r"OpenCode",
    "openclaw": r"OpenClaw", "hermes": r"Hermes", "astrbot": r"AstrBot", "sillytavern": r"SillyTavern|酒馆",
    "open_webui": r"Open ?WebUI", "kelivo": r"Kelivo", "telegram": r"Telegram", "wechat": r"微信", "feishu": r"飞书", "discord": r"Discord",
    "developer_built": r"开发者自建|自建聊天机器人|自建聊天应用|自建网页聊天|需自己把|需自行|需自备|LangGraph 应用",
}


def n_clients(c, access):
    t = c.text("cli", "acc", "x:差异要点")
    vals = [v for v, _ in hits(t, CLIENT_PATS)]
    basis = "客户端原文：" + c.text("cli")
    if c.cat == "自带记忆的应用" or re.search(r"^自带", c.text("cli")):
        vals.append("self_contained")
    if "mcp" in access and "any_mcp_client" not in vals and c.cat == "可接入已有助手":
        vals.append("any_mcp_client")
        basis += "；有 MCP 接口，按协议可接任意 MCP 客户端（推断）"
    if not vals:
        return res([], "needs_review", basis)
    return res(sorted(set(vals)), "auto", basis)


def n_runs_on(c):
    t = c.text("run", "x:运行位置")
    found = hits(t, {
        "own_computer": r"电脑|本机|本地|Mac|桌面|树莓派|小型设备",
        "own_server": r"服务器|VPS|NAS",
        "own_cloud_account": r"Cloudflare|Render|Zeabur|Vercel|Fly\.io|Supabase|Neon|Hugging Face|R2",
        "phone": r"手机|Android|安卓|iOS|iPhone|Termux",
        "third_party_hosted": r"托管|memu\.so|Cloud\b|云版|mengram|Cosmos 服务|MemOS Cloud|Letta Cloud|免费云",
    })
    vals = [v for v, _ in found]
    if not vals and re.search(r"Docker|Postgres|Qdrant|二进制|自己的程序", t):
        vals = ["own_computer", "own_server"]
        return res(vals, "auto", f"运行位置原文：{t}（Docker/数据库可在自己电脑或服务器上跑）")
    if not vals:
        return res([], "needs_review", f"运行位置原文未识别：{t or '（空）'}")
    return res(sorted(set(vals)), "auto", "运行位置原文：" + t)


def n_os(c, runs_on):
    t = "；".join([c.text("run", "x:运行位置", "x:运行平台", "diff", "note"), c.readme])
    if runs_on and set(runs_on) <= {"own_cloud_account", "third_party_hosted"}:
        return res(["any"], "auto", "只在云端运行，用浏览器操作即可")
    only = re.search(r"仅支持 Apple Silicon|仅 macOS|macOS only|only (?:on )?macOS|Mac only|自己的 Mac|自己的 Apple Silicon Mac", t)
    if only:
        return res(["macos"], "auto", "原文：" + snippet(t, only, 20))
    found = hits(t, {
        "windows": r"Windows|\.exe\b|\.msi\b|PowerShell|WSL",
        "macos": r"macOS|Mac\b|Homebrew|brew install|Apple Silicon|\.dmg\b",
        "linux": r"Linux|Ubuntu|Debian",
        "android": r"Android|安卓|\bAPK\b|Termux",
        "ios": r"\biOS\b|iPhone|iPad",
    })
    vals = [v for v, _ in found]
    basis = "README／原表提到：" + "；".join(f"{v}（{s}）" for v, s in found[:3])
    cross = re.search(r"\bnpx\b|\buvx\b|pip install|pipx|npm i|npm install|npm ci|docker|Docker|go install|cargo install|"
                      r"Node\.js \d+|Node >= ?\d+|Python 3\.\d+", c.readme + t)
    host = re.search(r"SillyTavern|Open WebUI|AstrBot", c.text("cli"))
    if host and not vals:
        vals += ["windows", "macos", "linux"]
        basis = f"装在 {host.group(0)} 里，随宿主运行（宿主支持 Windows/macOS/Linux，推断）"
    elif cross and not {"windows", "macos", "linux"} <= set(vals):
        vals += ["windows", "macos", "linux"]
        basis += f"；用跨平台运行时安装（{cross.group(0)}），按 Windows/macOS/Linux 都能用推断"
    if not vals:
        return res([], "needs_review", "README 和原表都没提到系统")
    return res(sorted(set(vals)), "auto", basis)


def n_difficulty(c):
    t = c.text("diff", "x:上手门槛")
    m = re.match(r"\s*(低到中|中到高|低|中|高)", t)
    if not m:
        return res("", "needs_review", f"门槛原文未识别：{t or '（空）'}")
    mapping = {"低": "low", "低到中": "medium", "中": "medium", "中到高": "high", "高": "high"}
    basis = f"门槛原文：{t}"
    if "到" in m.group(1):
        basis += "（区间取较高一档）"
    return res(mapping[m.group(1)], "auto", basis)


def n_accounts(c):
    t = c.text("need", "x:所需设备与账号")
    found = hits(t, {
        "github": r"GitHub", "cloudflare": r"Cloudflare", "render": r"Render",
        "model_api_key": r"API ?密钥|API ?Key|模型|OpenAI|Gemini|OpenRouter|Voyage|嵌入|LLM 密钥|Groq|DeepSeek|通义|Anthropic 密钥",
        "vendor_account": r"memu\.so 账号|Supermemory 账号|Mengram 账号|Cosmos 账号|mem9 API|CI API|Memori Cloud|托管需账号|云版需订阅",
        "telegram": r"Telegram", "claude_subscription": r"Pro/Max|Claude 付费|Claude 套餐|Claude Code 订阅|Claude 订阅|并有订阅",
    })
    vals = [v for v, _ in found]
    if "model_api_key" in vals and re.search(r"Ollama", t) and not re.search(
            r"API|密钥|Key|OpenAI|Gemini|OpenRouter|Voyage|Groq|DeepSeek|通义|Anthropic|托管模型", t):
        vals.remove("model_api_key")
    if re.match(r"\s*无|无需账号|默认无需|不强制|README 称无需", t) and "model_api_key" in vals and re.search(r"可选|生成 wiki 时", t):
        vals.remove("model_api_key")
    if not vals and re.match(r"\s*(无|默认无需|不强制|README 称无需|基础功能无需)", t):
        return res(["none"], "auto", "账号原文：" + t)
    if not vals and re.search(r"Ollama", t):
        return res(["none"], "auto", "账号原文：" + t + "（Ollama 在本机运行，不需注册）")
    if not vals and c.x and not re.search(r"账号|密钥|订阅|Key|key", t):
        return res(["none"], "auto", f"原表「所需设备与账号」只列了设备和软件，没有账号：{t}")
    if not vals:
        m = re.search(r"API[ _]?[Kk]ey|OPENAI_API_KEY|api_key", c.readme)
        if m:
            return res(["model_api_key"], "needs_review", f"说明里没写；README 提到“{snippet(c.readme, m, 30)}”，建议值 model_api_key，需确认是否必需")
        return res([], "needs_review", f"账号原文未识别：{t or '（空）'}")
    status = "needs_review" if re.search(r"可选", t) else "auto"
    return res(sorted(set(vals)), status, "账号原文：" + t + ("（含“可选”，需确认是否必需）" if status != "auto" else ""))


def n_cost(c, accounts):
    t = c.text("need", "run", "note", "x:所需设备与账号")
    if re.search(r"Pro/Max|Claude 付费|订阅|按套餐收费|付费", c.text("need")):
        return res("paid_service", "auto", "账号原文：" + c.text("need"))
    if "model_api_key" in accounts:
        return res("model_fees_only", "auto", "需要模型接口密钥，按调用付费（本地模型可免费）")
    if accounts == ["none"]:
        return res("free", "auto", "不需要账号或密钥")
    if accounts and set(accounts) <= {"github", "cloudflare", "render", "telegram"}:
        return res("free", "needs_review", f"只需免费账号（{t}），但云平台免费额度有限，需确认")
    return res("", "needs_review", f"费用原文未识别：{t or '（空）'}")


def n_subject(c):
    t = c.text("subj", "x:记忆功能 Function")
    found = hits(t, {
        "user_facts": r"用户|偏好|事实|个人|人际|画像|你|本人|生活",
        "ai_identity": r"AI 自身|AI 自我|身份|人格|自我|自传|AI 情绪|AI 身体|AI 的梦|伴侣的说话",
        "experience": r"经验|技能|策略|教训|更正|决策|行为",
        "task_context": r"工作记忆|任务|上下文|项目|决定",
        "conversation_history": r"对话|会话|聊天",
    })
    vals = [v for v, _ in found]
    if not vals:
        return res([], "needs_review", f"记忆对象原文未识别：{t or '（空）'}")
    return res(sorted(set(vals)), "auto", "记忆对象原文：" + t)


# 原表字段用宽松词；README 只认明确描述“记忆怎么写入”的说法，避免 staging database、approve the connector 这类误伤
WRITE_REVIEW = r"审核|批准|人确认|人工策展|须用户明确授权"
WRITE_AUTO = r"自动|每轮"
README_REVIEW = (r"until you approve|nothing becomes memory until|human-approved|review-gated|"
                 r"only after human approval|only after you approve|requires? (?:your |human )?approval before|"
                 r"approve (?:it|them|each|the memory|memories)|/review-memory")
README_AUTO = (r"automatically captur|auto-capture|captures? every turn|captures both sides|captures? (?:session|conversation)s? automatically|"
               r"automatically (?:saves|extracts memor|records|remembers|stores|distills)|hooks? captures?|capture hook|"
               r"Stop hook captures|SessionEnd hook automatically indexes all new sessions")


def first_positive(pat, text):
    """第一个前面没有否定词（no / not / without / 不）的匹配。"""
    for m in re.finditer(pat, text, re.I):
        if not re.search(r"\bno\b|\bnot\b|without|\bnever\b|不|无|未", text[max(0, m.start() - 15):m.start()], re.I):
            return m
    return None


def n_write_mode(c, access):
    if c.x:
        t = c.text("x:记忆由谁写入", "x:人在哪一步介入", "x:治理手段")
        vals = []
        if re.search(WRITE_AUTO, t):
            vals.append("auto")
        if re.search(WRITE_REVIEW + r"|人确认合并|人工批准", t) and not re.search(r"^无|不需要", c.text("x:人在哪一步介入")):
            vals.append("review_first")
        if re.search(r"主动调|remember|让.*记|手动|AI 自己", t):
            vals.append("on_request")
        if vals:
            return res(sorted(set(vals)), "auto", "原表写入方式：" + t)
        return res([], "needs_review", "原表写入方式未识别：" + t)
    vals, basis = [], []
    for value, pat in [("review_first", README_REVIEW), ("auto", README_AUTO)]:
        m = first_positive(pat, c.readme)
        if m:
            vals.append(value)
            basis.append(f"README：“{snippet(c.readme, m, 40)}”")
    if vals:
        return res(sorted(vals), "auto", "；".join(basis))
    if "mcp" in access:
        return res(["on_request"], "needs_review", "README 没提自动捕获或审核；MCP 工具通常由 AI 自行决定何时调用，建议值 on_request")
    return res([], "needs_review", "README 没提写入方式")


def n_forgetting(c):
    vals, status, basis = _forgetting_main(c)
    vals = [vals] if isinstance(vals, str) and vals else (vals or [])
    t = c.text("x:遗忘的终点", "x:遗忘怎么发生", "x:演化 Evolution（据 README）")
    m = first_positive(r"归档|沉底|下沉|封存|冷藏", t) if c.x else \
        first_positive(r"archiv(?:e|es|ed|ing) (?:old|stale|cold|unused|low)|sinks? (?:to|into)|cold (?:storage|tier)|沉底|归档", c.readme)
    if m and "archive" not in vals:
        vals.append("archive")
        basis += f"；有归档：“{snippet(t if c.x else c.readme, m, 20)}”"
    return res(vals, status, basis)


def _forgetting_main(c):
    if c.x:
        t = c.text("x:遗忘怎么发生", "x:遗忘的终点")
        first = c.text("x:遗忘怎么发生")
        if re.search(r"不做遗忘|不衰减|永不删除|不删除", first):
            return "none", "needs_review", f"原表：{t}（明确不做遗忘，但可能仍能手动删除，建议值 none）"
        if re.search(r"不自动衰减|无自动衰减|未描述自动衰减", first):
            return "manual_only", "auto", "原表：" + t
        if re.search(r"衰减|淡去|淡出|遗忘曲线|回落|清空|过期|退场", first) and "手动调用" not in first:
            return "auto_decay", "auto", "原表：" + t
        if re.search(r"手动|forget|删除", first):
            return "manual_only", "auto", "原表：" + t
        if re.match(r"\s*无", first):
            return "none", "needs_review", f"原表写“{first}”，可能是不遗忘，也可能只是没有自动机制但能手动删，需确认"
        return "", "needs_review", "原表：" + (t or "（空）")
    m = first_positive(r"forgetting curve|Ebbinghaus|FSRS|遗忘曲线|forgets what doesn|let(?:s)? (?:the rest|noise|old noise)[^.]{0,20}fade|"
                       r"decays? naturally|what you don't use fades|cools and decays|stale weak-memory decay|confidence decay automatically", c.readme)
    if m:
        return "auto_decay", "auto", f"README：“{snippet(c.readme, m, 40)}”"
    m = first_positive(r"\bdecay|half-life|衰减|\bfades?\b", c.readme)
    if m:
        return "auto_decay", "needs_review", f"README：“{snippet(c.readme, m, 40)}”——可能只是检索排序时旧记忆权重变低，不一定会遗忘，建议值 auto_decay"
    m = re.search(r"\bforget\b|\bdelete\b|删除|retract|purge|erase", c.readme, re.I)
    if m:
        return "manual_only", "needs_review", f"README 只提到删除：“{snippet(c.readme, m, 40)}”，没提自动衰减，建议值 manual_only"
    return "", "needs_review", "README 没提遗忘或删除"


def n_human_review(c):
    t = c.text("x:治理手段", "x:记忆保存形式", "desc", "acc", "note") + "；" + c.readme
    found = hits(t, {
        "dashboard": r"面板|控制台|网页界面|管理界面|Dashboard|dashboard|[Ww]eb ?UI|viewer|网页工作台|桌面应用|[Ii]nspector|\bUI\b|"
                     r"[Mm]emory [Vv]iewer|editable (?:lorebook|entries|memor)|lorebook entr|浏览器打开",
        "files": r"Markdown 文件|Markdown files?|markdown files?|plain[ -]text|plain files|纯文本|每条记忆是一个 Markdown|Markdown 笔记|Markdown vault|YAML frontmatter|\.md files",
        "cli": r"命令行|\bCLI\b",
        "tools": r"forget 工具|delete tool|\bforget\b|update_memory|memory_delete|delete_memory|_delete\b",
    })
    vals = [v for v, _ in found]
    if c.cat == "自带记忆的应用" and "dashboard" not in vals:
        vals.append("dashboard")
    if not vals:
        return res([], "needs_review", "没找到查看或修改记忆的方式")
    return res(sorted(set(vals)), "auto", "；".join(f"{v}：{s}" for v, s in found[:3]))


EXPORT_FORMATS = [("markdown", r"markdown|obsidian|\.md\b|okf"), ("json", r"json"), ("sqlite", r"sqlite"),
                  ("other_file", r"zip|csv|bundle|vault|html|\.abhi|备份")]
IMPORT_CONTEXT = r"(?i)ChatGPT|Claude(?:\.ai)? export|chatgpt-export|导出的(?:聊天|旧)?记录|从旧产品导出|mem0 JSON export|conversations\.json|foreign platform|path/to/export"
NOT_MEMORY_EXPORT = r"(?i)subpath export|export-control|or export\.|\bimport \w+ export|\bexport [A-Z_]+="


def n_export(c):
    t = c.text("x:记忆保存形式", "desc", "acc", "note") + "\n" + c.readme
    explicit = r"(?:[Ee]xport|导出)[^\n。]{0,40}?(?:Markdown|markdown|Obsidian|JSON|json|ZIP|zip|CSV|csv|SQLite|bundle|[Vv]ault|OKF|备份)|" \
               r"(?:Markdown|JSON)[^\n]{0,15}(?:export|导出)|export_memories|memory export|\b[a-z-]+ export\b|一键备份|全站导出|打包导出"
    vals, basis = set(), []
    for m in re.finditer(explicit, t):
        around = t[max(0, m.start() - 30):m.end() + 40]
        if re.search(IMPORT_CONTEXT, around) or re.search(NOT_MEMORY_EXPORT, around) or \
                re.search(r"\bno\b|\bnot\b|不|没有", t[max(0, m.start() - 15):m.start()], re.I):
            continue
        frag = t[m.start():m.end() + 30].lower()
        found = [v for v, pat in EXPORT_FORMATS if re.search(pat, frag)] or ["other_file"]
        vals.update(found)
        if len(basis) < 2:
            basis.append(f"“{snippet(t, m, 25)}”")
    if vals:
        return res(sorted(vals), "auto", "明确写了导出：" + "；".join(basis))
    m = first_positive(r"每条记忆是一个 Markdown|记忆即 Markdown|plain markdown files|Markdown files (?:that|you|on your)|as plain (?:JSON and )?Markdown|Markdown is the source of truth|Markdown is ground truth", t)
    if m:
        return res(["markdown"], "needs_review", f"没写导出功能，但记忆本身存成 Markdown 文件，可以直接拷走：“{snippet(t, m, 25)}”，建议值 markdown")
    m = first_positive(r"(?:one|single|a) SQLite (?:file|database)|单个 SQLite|一个 SQLite 文件|SQLite file (?:on your|you own)", t)
    if m:
        return res(["sqlite"], "needs_review", f"没写导出功能，但数据在单个 SQLite 文件里：“{snippet(t, m, 25)}”，建议值 sqlite")
    return res([], "needs_review", "没写导出功能，也看不出数据格式")


def n_data(c, runs_on):
    vals = []
    if {"own_computer", "own_server", "phone"} & set(runs_on):
        vals.append("local_only")
    if "own_cloud_account" in runs_on:
        vals.append("own_cloud")
    if "third_party_hosted" in runs_on or "默认经第三方" in c.text("note"):
        vals.append("third_party")
    if not vals:
        return res([], "needs_review", "运行位置未识别")
    basis = "据运行位置推出（只看记忆服务本身；调用云端大模型时，对话还会经过模型提供方）"
    if len(vals) > 1:
        basis += "；有多种部署方式，可任选"
    return res(vals, "auto", basis)


def n_license(c):
    t = c.text("lic") or c.text("x:许可证（仓库实际文件）")
    if not t:
        return res("", "needs_review", "没有许可证信息")
    order = ["no_license", "noncommercial", "source_available", "copyleft", "permissive"]
    found = []
    if re.search(r"无 LICENSE|未声明|无法核实", t):
        found.append("no_license")
    if re.search(r"PolyForm|NC|非商业|禁止商用|Noncommercial", t):
        found.append("noncommercial")
    if re.search(r"BUSL|BSL|Source-Available|源码可用|自定义", t):
        found.append("source_available")
    if re.search(r"GPL|MPL|CC BY-SA", t):
        found.append("copyleft")
    if re.search(r"MIT|Apache|BSD", t):
        found.append("permissive")
    if not found:
        return res("", "needs_review", f"许可证原文：{t}")
    value = min(found, key=order.index)  # 取限制最多的一项
    status = "needs_review" if re.search(r"自定义|其它|附加条款|Source-Available", t) else "auto"
    basis = f"许可证原文：{t}" + ("（含多份许可，取限制最多的一项）" if len(found) > 1 else "")
    if "README 写" in t and value == "no_license":
        basis += "（README 声明了许可证但仓库没有许可证文件，法律上默认作者保留全部权利）"
    return res(value, status, basis)


STRUCTURED_FOR_FEATURES = ["desc", "subj", "acc", "cli", "note", "x:核心特点", "x:形成 Formation（据 README）",
                           "x:演化 Evolution（据 README）", "x:检索 Retrieval（据 README）", "x:差异要点", "x:记忆保存形式",
                           "x:治理手段", "x:整合（合并、摘要）方式", "x:召回怎么触发", "x:记忆功能 Function", "x:主要防住哪种错误"]


def n_feature(c, key, norm):
    zh, en = FR.PATTERNS[key]
    t = c.text(*STRUCTURED_FOR_FEATURES)
    m = first_positive(zh, t)
    if key == "persona_continuity" and "ai_identity" in norm["memory_subject"]["value"]:
        return res("yes", "auto", "记忆对象含 AI 自身身份")
    if m and (c.doc["id"], key) not in FR.STRUCTURED_REJECT:
        return res("yes", "auto", f"原表／说明：“{snippet(t, m, 25)}”")
    m = first_positive(en, c.readme)
    if m:
        reason = FR.README_REJECT.get((c.doc["id"], key))
        if reason:
            return res("not_mentioned", "auto", f"README 命中的“{snippet(c.readme, m, 20)}”经核对不算：{reason}")
        status = "auto" if key in FR.CHECKED else "needs_review"
        return res("yes", status, f"README：“{snippet(c.readme, m, 40)}”" + ("（已核对）" if status == "auto" else ""))
    if key == "import_history" and "迁入" in t:
        return res("yes", "auto", "说明里写了迁入")
    return res("not_mentioned", "auto", "原表、说明和 README 都没提到（未提及不等于没有）")


def paper_taxonomy(c):
    if not c.x:
        return None
    keys = {"form": "记忆形态 Form", "function": "记忆功能 Function", "formation": "形成 Formation（据 README）",
            "evolution": "演化 Evolution（据 README）", "retrieval": "检索 Retrieval（据 README）", "dynamics_coverage": "动态覆盖类型"}
    return {k: str(c.x.get(v) or "") for k, v in keys.items()}


def normalize(doc, overrides):
    c = Ctx(doc)
    out = {}
    out["access"] = n_access(c)
    acc = out["access"]["value"]
    out["compatible_clients"] = n_clients(c, acc)
    out["runs_on"] = n_runs_on(c)
    out["os"] = n_os(c, out["runs_on"]["value"])
    out["difficulty"] = n_difficulty(c)
    out["accounts_needed"] = n_accounts(c)
    out["cost"] = n_cost(c, out["accounts_needed"]["value"])
    out["memory_subject"] = n_subject(c)
    out["write_mode"] = n_write_mode(c, acc)
    out["forgetting"] = n_forgetting(c)
    out["human_review"] = n_human_review(c)
    out["export"] = n_export(c)
    out["data_passes_through"] = n_data(c, out["runs_on"]["value"])
    out["license_category"] = n_license(c)
    for key in FR.FEATURES:
        out[key] = n_feature(c, key, out)
    for field, ov in overrides.get(doc["id"], {}).items():
        if isinstance(ov, dict):
            out[field] = res(ov["value"], "confirmed", ov.get("note", "负责人确认"))
        else:
            out[field] = res(ov, "confirmed", "负责人确认")
    uncertainties = []
    for f in FIELDS:
        n = out[f]
        if n["status"] == "needs_review" and n["value"] in ("", []):
            n["status"] = "unknown"
            uncertainties.append({"field": f, "label": FIELD_LABELS[f], "note": uncertainty_note(n["basis"])})
    norm = {f: out[f] for f in FIELDS}
    tax = paper_taxonomy(c)
    if tax:
        norm["paper_taxonomy"] = tax
    return norm, uncertainties


def uncertainty_note(basis):
    """把规则的判断依据改写成给人看的一句话。"""
    b = basis.strip()
    if re.search(r"原文未识别：（空）$", b):
        return "说明文档没有写"
    m = re.search(r"原文未识别：(.+)$", b)
    if m:
        text = "；".join(dict.fromkeys(x for x in m.group(1).split("；") if x))
        return f"文档写的是“{text}”，归不进固定选项"
    return b


# ---------------- 待审核清单 ----------------

def fmt(value):
    return ", ".join(value) if isinstance(value, list) else str(value)


def original_text(doc, field):
    info = {k: v["value"] for k, v in doc["info"].items()}
    x = doc["raw"].get("记忆项目总表") or {}
    src = {"access": [info.get("access"), x.get("接入方式")], "compatible_clients": [info.get("compatible_clients")],
           "runs_on": [info.get("runs_on")], "difficulty": [info.get("difficulty")],
           "accounts_needed": [info.get("accounts_needed")], "cost": [info.get("accounts_needed")],
           "memory_subject": [info.get("memory_subject")], "write_mode": [x.get("记忆由谁写入"), x.get("人在哪一步介入")],
           "forgetting": [x.get("遗忘怎么发生")], "license_category": [info.get("license")]}.get(field, [])
    return "；".join(str(s) for s in dict.fromkeys(src) if s) or "—"


def write_review(docs):
    items = []
    stats = {f: Counter() for f in FIELDS}
    for d in docs:
        for f in FIELDS:
            n = d["normalized"][f]
            stats[f][n["status"]] += 1
            if n["status"] in ("needs_review", "unknown"):
                items.append((f, d, n))

    lines = [
        "# 阶段 1 规范化结果与待补充清单",
        "",
        "> 由 `scripts/normalize.py` 生成，不要手改本文件。要补充或修改，请在 `docs/review-normalization.xlsx`「待补充」页的「负责人确认值」一列填写，",
        "> 然后运行 `python -X utf8 scripts/normalize.py --apply-review`。确认值存入 `data/normalization_overrides.json`，以后重新生成也会保留。",
        "> 填写方式：同意建议值就填「同意」；要改就填英文代码（多个用逗号分隔，如 `mcp, gateway`）；留空表示暂不处理。",
        "",
        "所有判断都来自说明文档（README）和原表，**没有实际安装验证**。",
        "",
        f"负责人 {DECIDED_ON} 决定：有建议值的待审核项一律采用建议值（状态记为“已确认”）；没有建议值的记为“文档未说明”（unknown），"
        "并写进项目 JSON 的 `uncertainties` 备注，网站上会如实显示“文档未说明”。",
        "",
        "## 每个字段的处理情况",
        "",
        "| 字段 | 含义与可选值 | 规则判定 | 已确认 | 文档未说明 | 待审核 |",
        "|---|---|---|---|---|---|",
    ]
    for f in FIELDS:
        opts = "；".join(f"`{k}` {v}" for k, v in ENUMS[f].items())
        if f in FR.FEATURES:
            opts = f"**{FR.FEATURES[f][0]}**：{FR.FEATURES[f][1]}。" + opts
        lines.append(f"| `{f}` | {opts} | {stats[f]['auto']} | {stats[f]['confirmed']} | {stats[f]['unknown']} | {stats[f]['needs_review']} |")
    n_unknown = sum(st["unknown"] for st in stats.values())
    n_review = sum(st["needs_review"] for st in stats.values())
    lines += ["", f"共 {len(docs)} 个项目：文档未说明 {n_unknown} 处，待审核 {n_review} 处。另有 `paper_taxonomy`（论文分类）直接沿用原表，只有原表 50 个项目有。", "",
              "说明：", "",
              "- 多选字段（如 `access`、`compatible_clients`）可以有多个值，用英文逗号分隔。",
              "- `os`：README 没写明但用 npx、pip、Docker 等跨平台方式安装的，按 Windows/macOS/Linux 都能用处理（理由里会注明“推断”）。",
              "- `data_passes_through` 只看记忆服务本身存在哪里；用云端大模型时，对话还会发给模型提供方，网站上会统一说明。",
              "- `difficulty` 原文是区间（如“低到中”）时取较高一档。", ""]
    lines += ["## 用户在意的特性一览", "",
              "判定为“有”的项目。依据是原表、说明和 README；README 里的命中已由 Claude 逐条核对，误判记在 `scripts/feature_rules.py`。"
              "“未提及”只表示文档没写，不等于没有。要更正某一项，同样在 xlsx 里填写（xlsx 另有“特性”页列出全部判定）。", ""]
    for key, (name, desc) in FR.FEATURES.items():
        yes = [d["name"] for d in docs if d["normalized"][key]["value"] == "yes"]
        lines += [f"- **{name}**（{len(yes)} 个）：{desc}。", f"  {'、'.join(yes) or '—'}"]
    lines.append("")
    for f in FIELDS:
        rows = [(d, n) for ff, d, n in items if ff == f]
        if not rows:
            continue
        lines += [f"## `{f}` {FIELD_LABELS[f]}（{len(rows)} 处）", "", "| 项目 | 状态 | 原文 | 建议值 | 不确定的地方 |", "|---|---|---|---|---|"]
        for d, n in rows:
            cell = lambda s: str(s).replace("|", "／").replace("\n", " ")
            status = "文档未说明" if n["status"] == "unknown" else "待审核"
            lines.append(f"| {d['name']}（`{d['id']}`） | {status} | {cell(original_text(d, f))} | {cell(fmt(n['value'])) or '—'} | {cell(uncertainty_note(n['basis']))} |")
        lines.append("")
    REVIEW_MD.parent.mkdir(parents=True, exist_ok=True)
    REVIEW_MD.write_text("\n".join(lines), encoding="utf-8")

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "待补充"
    header = ["项目 id", "项目名", "字段", "状态", "可选值", "原文", "建议值", "不确定的地方", "负责人确认值"]
    ws.append(header)
    for f, d, n in items:
        status = "文档未说明" if n["status"] == "unknown" else "待审核"
        ws.append([d["id"], d["name"], f, status, "、".join(ENUMS[f]), original_text(d, f), fmt(n["value"]),
                   uncertainty_note(n["basis"]), ""])
    for cell in ws[1]:
        cell.font = Font(bold=True)
        cell.fill = PatternFill("solid", fgColor="DDE6F0")
    for col, w in zip("ABCDEFGHI", [22, 22, 18, 10, 36, 36, 18, 56, 20]):
        ws.column_dimensions[col].width = w
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(wrap_text=True, vertical="top")
        row[8].fill = PatternFill("solid", fgColor="FFF4D6")
    ws.freeze_panes = "C2"
    ws.auto_filter.ref = ws.dimensions

    # 特性页：全部判定，便于负责人抽查；要更正就把该行复制到“待补充”页再填确认值
    ws2 = wb.create_sheet("特性")
    ws2.append(["项目 id", "项目名", "特性", "判定", "依据"])
    for d in docs:
        for key, (name, _) in FR.FEATURES.items():
            n = d["normalized"][key]
            ws2.append([d["id"], d["name"], f"{name}（{key}）", ENUMS[key][n["value"]], n["basis"]])
    for cell in ws2[1]:
        cell.font = Font(bold=True)
        cell.fill = PatternFill("solid", fgColor="DDE6F0")
    for col, w in zip("ABCDE", [22, 22, 24, 8, 90]):
        ws2.column_dimensions[col].width = w
    ws2.freeze_panes = "C2"
    ws2.auto_filter.ref = ws2.dimensions
    try:
        wb.save(REVIEW_XLSX)
    except PermissionError:
        print(f"注意：{REVIEW_XLSX.relative_to(ROOT)} 正在被 Excel 打开，没有更新；关掉后重新运行本脚本即可。")
    return n_unknown, n_review


def parse_value(field, text):
    text = str(text).strip()
    multi = field in MULTI
    values = [v.strip() for v in re.split(r"[,，、;；\s]+", text) if v.strip()] if multi else [text]
    bad = [v for v in values if v not in ENUMS[field]]
    if bad:
        raise ValueError(f"{field} 的值 {bad} 不在可选值里：{list(ENUMS[field])}")
    return values if multi else values[0]


AGREE = {"同意", "ok", "OK", "√", "✓", "y", "Y"}


def apply_review():
    overrides = json.loads(OVERRIDES.read_text(encoding="utf-8")) if OVERRIDES.exists() else {}
    wb = openpyxl.load_workbook(REVIEW_XLSX)
    ws = wb["待补充"] if "待补充" in wb.sheetnames else wb["待审核"]
    rows = list(ws.iter_rows(values_only=True))
    col = {h: i for i, h in enumerate(rows[0])}
    n = 0
    for r in rows[1:]:
        pid, field, suggested, confirmed = r[col["项目 id"]], r[col["字段"]], r[col["建议值"]], r[col["负责人确认值"]]
        if confirmed in (None, ""):
            continue
        if str(confirmed).strip() in AGREE:
            if suggested in (None, ""):
                raise ValueError(f"{pid} 的 {field} 没有建议值，不能填“同意”，请直接填值")
            confirmed = suggested
        overrides.setdefault(pid, {})[field] = parse_value(field, confirmed)
        n += 1
    OVERRIDES.write_text(json.dumps(overrides, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"读入 {n} 条负责人确认值")


def accept_suggestions():
    """把当前所有待审核项的建议值记为负责人确认，保留原依据。"""
    overrides = json.loads(OVERRIDES.read_text(encoding="utf-8")) if OVERRIDES.exists() else {}
    n = 0
    for path in sorted(PROJECTS.glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        norm, _ = normalize(doc, overrides)
        for f in FIELDS:
            item = norm[f]
            if item["status"] == "needs_review" and item["value"] not in ("", []):
                overrides.setdefault(doc["id"], {})[f] = {
                    "value": item["value"],
                    "note": f"负责人同意采用建议值（{DECIDED_ON}）；原依据：{item['basis']}"}
                n += 1
    OVERRIDES.write_text(json.dumps(overrides, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"采用建议值 {n} 处")


def main():
    if "--apply-review" in sys.argv:
        apply_review()
    if "--accept-suggestions" in sys.argv:
        accept_suggestions()
    overrides = json.loads(OVERRIDES.read_text(encoding="utf-8")) if OVERRIDES.exists() else {}
    docs = []
    for path in sorted(PROJECTS.glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        doc["normalized"], doc["uncertainties"] = normalize(doc, overrides)
        path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        docs.append(doc)
    n_unknown, n_review = write_review(docs)
    print(f"已规范化 {len(docs)} 个项目；文档未说明 {n_unknown} 处，待审核 {n_review} 处，见 {REVIEW_MD.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
