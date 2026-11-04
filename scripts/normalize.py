"""阶段 1：把项目 JSON 里的自由文字整理成固定选项，写入每个文件的 normalized 字段。

依据（按优先级）：负责人确认值 > 原表结构化字段（raw.记忆项目总表）> info 里的说明 > README 关键词。
每个字段输出 {value, status, basis}：
  status = confirmed（负责人确认）| auto（规则有把握）| needs_review（拿不准，不猜，进待审核清单）
同时生成待审核清单 docs/报告/review-normalization.md 和可填写的 docs/报告/review-normalization.xlsx。

用法（在仓库根目录）：
  python -X utf8 scripts/fetch_readmes.py           先缓存 README（只需一次）
  python -X utf8 scripts/normalize.py               生成规范化结果和待审核清单
  python -X utf8 scripts/normalize.py --apply-review
      读回 docs/报告/review-normalization.xlsx「待补充」页的「负责人确认值」，存入
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
from datetime import date
from pathlib import Path

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill

sys.path.insert(0, str(Path(__file__).resolve().parent))
import dimension_rules as DR  # noqa: E402
import feature_rules as FR  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
PROJECTS = ROOT / "data/projects"
CACHE = ROOT / "cache/readmes"
OVERRIDES = ROOT / "data/normalization_overrides.json"
# Claude 逐个项目对照 README（高频推荐的还看了代码）核实的结果，优先于规则判定和负责人采用的建议值
VERIFICATION = ROOT / "data/readme_verification.json"
SAFETY_NOTES = ROOT / "data/safety_notes.json"
SPEND_REVIEW = ROOT / "data/spend_review.json"
USAGE_FORM = ROOT / "data/usage_form.json"
REVIEW_MD = ROOT / "docs/报告/review-normalization.md"
REVIEW_XLSX = ROOT / "docs/报告/review-normalization.xlsx"

# 字段 -> 可选值（中文说明）。schema 与审核清单都引用这里。
ENUMS = {
    "access": {"mcp": "MCP（让 AI 调用外部工具的通用接口）", "proxy": "转发服务（挂在聊天软件和模型接口之间，改接口地址接入）",
               "host_plugin": "宿主插件（含钩子、技能）", "library": "代码库（要写代码调用）", "standalone_app": "独立应用",
               "cli_tool": "命令行小工具（需要时自己运行）", "guide": "教程或设计文档（照着搭）"},
    "compatible_clients": {
        "claude_desktop": "Claude 桌面版", "claude_web_mobile": "Claude 网页／手机版", "claude_code": "Claude Code",
        "chatgpt": "ChatGPT", "chatgpt_gpt": "ChatGPT 自定义 GPT（Actions 调接口；个人账号已不能新建，计划 2026-12 退役）", "openai_compatible": "任意 OpenAI 兼容客户端", "any_mcp_client": "任意 MCP 客户端",
        "cursor": "Cursor", "codex": "Codex", "gemini_cli": "Gemini CLI", "opencode": "OpenCode",
        "openclaw": "OpenClaw", "hermes": "Hermes", "astrbot": "AstrBot", "sillytavern": "SillyTavern",
        "open_webui": "Open WebUI", "kelivo": "Kelivo", "deepseek_harness": "DeepSeek Harness", "telegram": "Telegram", "wechat": "微信", "feishu": "飞书", "discord": "Discord",
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
# 打分维度、情绪处理、项目定位与搭配（定义见 dimension_rules.py）
ENUMS.update(DR.ENUMS)
FIELDS = list(ENUMS)  # 输出顺序
FIELD_LABELS = {
    "access": "接入方式", "compatible_clients": "能配合的助手", "runs_on": "运行位置", "os": "支持的系统",
    "difficulty": "上手门槛", "cost": "费用", "accounts_needed": "需要的账号", "memory_subject": "主要记住什么",
    "write_mode": "记忆怎么写入", "forgetting": "怎么遗忘", "human_review": "能否查看和修改记忆", "export": "能否导出",
    "data_passes_through": "数据经过谁的服务器", "license_category": "许可证类别",
    **{k: v[0] for k, v in FR.FEATURES.items()},
    **DR.LABELS,
}
DECIDED_ON = "2026-10-11"
# 设计上搭配使用的项目（双向）：id -> [(另一个 id, 说明)]
RELATED = {}
for _a, _pairs in DR.RELATED.items():
    for _b, _note in _pairs:
        RELATED.setdefault(_a, []).append((_b, _note))
        RELATED.setdefault(_b, []).append((_a, _note))
MULTI = {"access", "compatible_clients", "runs_on", "os", "accounts_needed", "memory_subject", "write_mode",
         "forgetting", "human_review", "export", "data_passes_through",
         "ranking_signals", "scoring_stages", "emotion_handling", "lifecycle", "pairing", "customization",
         "chinese_support", "retrieval_postprocess", "recall_uses_llm", "memory_writer", "phone_access", "media_recall", "multi_agent", "spend"}


SPEND_DATA = json.loads(SPEND_REVIEW.read_text(encoding="utf-8")) if SPEND_REVIEW.exists() else {}
USAGE_DATA = json.loads(USAGE_FORM.read_text(encoding="utf-8")) if USAGE_FORM.exists() else {}
TOKEN_USAGE = ROOT / "data/token_usage.json"
TOKEN_DATA = json.loads(TOKEN_USAGE.read_text(encoding="utf-8")) if TOKEN_USAGE.exists() else {}
MOUNT = ROOT / "data/mount.json"
MOUNT_DATA = json.loads(MOUNT.read_text(encoding="utf-8")) if MOUNT.exists() else {}
HOST_MEMORY = ROOT / "data/host_memory.json"
HOST_MEMORY_DATA = json.loads(HOST_MEMORY.read_text(encoding="utf-8")) if HOST_MEMORY.exists() else {}


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
        "proxy": r"网关|代理|proxy|转发",
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
    "open_webui": r"Open ?WebUI", "kelivo": r"Kelivo", "deepseek_harness": r"DeepSeek Harness|\bdsh\b", "telegram": r"Telegram", "wechat": r"微信", "feishu": r"飞书", "discord": r"Discord",
    "developer_built": r"开发者自建|自建聊天机器人|自建聊天应用|自建网页聊天|需自己把|需自行|需自备|LangGraph 应用",
}


def n_clients(c, access):
    t = c.text("cli", "acc", "x:差异要点")
    vals = [v for v, _ in hits(t, CLIENT_PATS)]
    basis = "客户端原文：" + c.text("cli")
    if c.cat == "自带记忆的应用" or re.search(r"^自带", c.text("cli")):
        vals.append("self_contained")
    # DeepSeek Harness 是 2026-08 才出的，筛选表大多没写；README 写明了插件或接入指南的算支持
    m = re.search(r"(?i)dsh plugin|dsh-plugin|dsh-\w+ plugin|DeepSeek Harness (?:\(DSH\) )?(?:native )?(?:plugin|guide|setup)|"
                  r"(?:connect|connects) \w+ (?:to|with) DeepSeek Harness|Connect MemOS to DeepSeek Harness|for memory-aware DeepSeek Harness", c.readme)
    if m and "deepseek_harness" not in vals:
        vals.append("deepseek_harness")
        basis += f"；README 有 DeepSeek Harness 插件或指南：“{snippet(c.readme, m, 20)}”"
    if "mcp" in access and "any_mcp_client" not in vals and c.cat == "可接入已有助手":
        vals.append("any_mcp_client")
        basis += "；有 MCP 接口，按协议可接任意 MCP 客户端（推断）"
    if not vals:
        return res([], "needs_review", basis)
    return res(sorted(set(vals)), "auto", basis)


def n_runs_on(c):
    t = c.text("run", "x:运行位置")
    found = hits(t, {
        "own_computer": r"电脑|本机|本地|Mac|桌面|树莓派|小型设备|自托管|自部署|self-host",
        "own_server": r"服务器|VPS|NAS|自托管|自部署|自己部署|self-host",
        "own_cloud_account": r"Cloudflare|Render|Zeabur|Vercel|Fly\.io|Supabase|Neon|Hugging Face|R2",
        "phone": r"手机|Android|安卓|iOS|iPhone|Termux",
        "third_party_hosted": r"(?<!自)托管|memu\.so|Cloud\b|云版|mengram|Cosmos 服务|MemOS Cloud|Letta Cloud|免费云",
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


def dim_hits(c, field, table):
    """按 (中文模式, README 模式) 表找命中：先看原表和说明，再看 README；README 误判记在 DR.REJECT。"""
    t = c.text(*STRUCTURED_FOR_FEATURES)
    found = []
    for value, (zh, en) in table.items():
        if (c.doc["id"], field, value) in DR.REJECT:
            continue
        m = first_positive(zh, t)
        if m:
            found.append((value, f"说明：“{snippet(t, m, 20)}”"))
            continue
        m = first_positive(en, c.readme)
        if m:
            found.append((value, f"README：“{snippet(c.readme, m, 30)}”"))
    return found


def _dim(vals, basis, empty_basis="原表、说明和 README 都没提到（未提及不等于没有）"):
    vals = list(dict.fromkeys(vals))
    return res(vals or ["not_mentioned"], "auto", "；".join(basis) or empty_basis)


def n_dimensions(c, out, fixed=()):
    """打分维度、情绪处理、项目定位、记忆环节、搭配和可改性（规则见 dimension_rules.py）。
    fixed：已有确认值或核实值的字段（已写进 out），推导别的字段时用它们的值。"""
    pid, val = c.doc["id"], (lambda f: out[f]["value"] or [])
    d = {}

    sig = dim_hits(c, "ranking_signals", DR.SIGNAL_PATS)
    d["ranking_signals"] = _dim([v for v, _ in sig], [f"{v}：{b}" for v, b in sig])
    if "ranking_signals" in fixed:
        sig = [(v, "") for v in val("ranking_signals") if v != "not_mentioned"]
    extra = [v for v, _ in sig if v in DR.EXTRA_SIGNALS]

    stages = dim_hits(c, "scoring_stages", {"write": DR.STAGE_PATS["write"]})
    vals, basis = [v for v, _ in stages], [f"{v}：{b}" for v, b in stages]
    if extra:
        vals.append("retrieve")
        basis.append("retrieve：排序因素含 " + "、".join(extra) + "（推断召回时综合排序）")
    if "auto_decay" in val("forgetting"):
        f = dim_hits(c, "scoring_stages", {"forget": DR.STAGE_PATS["forget"]})
        if f:
            vals.append("forget")
            basis.append(f"forget：{f[0][1]}")
    d["scoring_stages"] = _dim(vals, basis)

    if not sig:
        d["multi_factor"] = res("not_mentioned", "auto", "没找到排序方式")
    else:
        d["multi_factor"] = res("multi" if len(extra) >= 2 else "single", "auto",
                                f"相似度之外的因素 {len(extra)} 个：" + ("、".join(extra) or "无"))

    emo = dim_hits(c, "emotion_handling", DR.EMOTION_PATS)
    vals, basis = [v for v, _ in emo], [f"{v}：{b}" for v, b in emo]
    if "emotion" in extra and "weighting" not in vals:
        vals.append("weighting")
        basis.append("weighting：排序因素含情感强度")
    if pid in DR.EMOTION_MANUAL:
        add, why = DR.EMOTION_MANUAL[pid]
        vals += add
        basis.append("、".join(add) + "：Claude 据说明补充：" + why)
    d["emotion_handling"] = _dim(vals, basis)

    role = DR.ROLE_OVERRIDE.get(pid)
    if role:
        d["project_role"] = res(role[0], "auto", "Claude 据说明判断：" + role[1])
    else:
        role = DR.ROLE_BY_CATEGORY.get(c.cat, "full_memory")
        d["project_role"] = res(role, "auto", f"按收录类别「{c.cat}」")
    if "project_role" in fixed:
        d["project_role"] = out["project_role"]

    steps = []
    if val("write_mode"):
        steps.append(("capture", "写入方式：" + "、".join(val("write_mode"))))
    cons = [k for k in ("dream_consolidation", "reflection") if out[k]["value"] == "yes"]
    if cons:
        steps.append(("consolidate", "有" + "、".join(FIELD_LABELS[k] for k in cons)))
    if sig or out["window_handoff"]["value"] == "yes" or d["project_role"]["value"] in ("full_memory", "companion_app"):
        steps.append(("retrieve", "有检索方式或换窗续接，或是完整记忆系统"))
    forget = [v for v in val("forgetting") if v in ("auto_decay", "archive")]
    if forget:
        steps.append(("forget", "遗忘：" + "、".join(forget)))
    if val("human_review"):
        steps.append(("review", "查看修改：" + "、".join(val("human_review"))))
    d["lifecycle"] = res([v for v, _ in steps], "auto", "；".join(b for _, b in steps) or "没有可推出的环节")
    d["lifecycle_complete"] = res("complete" if len(steps) == 5 else "partial", "auto",
                                  f"覆盖 {len(steps)}/5 个环节（由写入、整理、遗忘、查看修改等字段推出）")

    pair = dim_hits(c, "pairing", DR.PAIR_PATS)
    vals, basis = [v for v, _ in pair], [f"{v}：{b}" for v, b in pair]
    std = [a for a in val("access") if a in ("mcp", "proxy", "host_plugin")]
    if std:
        vals.append("standard_interface")
        basis.append("standard_interface：接入方式 " + "、".join(std))
    if pid in DR.PAIRS and "designed_to_pair" not in vals:
        vals.append("designed_to_pair")
        basis.append("designed_to_pair：" + DR.PAIRS[pid])
    if d["project_role"]["value"] == "state_engine" and "designed_to_pair" not in vals:
        vals.append("designed_to_pair")
        basis.append("designed_to_pair：状态引擎本身不存对话记忆，设计上和记忆库搭配使用")
    if c.cat == "自带记忆的应用":
        vals.append("self_contained")
        basis.append("self_contained：自带记忆的应用")
    if pid in DR.DEPENDS:
        vals.append("depends_on")
        basis.append("depends_on：" + DR.DEPENDS[pid])
    d["pairing"] = _dim(vals, basis)

    cus = dim_hits(c, "customization", DR.CUSTOM_PATS)
    vals, basis = [v for v, _ in cus], [f"{v}：{b}" for v, b in cus]
    if "files" in val("human_review"):
        vals.append("plain_data")
        basis.append("plain_data：记忆存成可以直接看改的文件")
    d["customization"] = _dim(vals, basis)

    # ---- 第二批（问卷 v2 用到）----
    vals, basis = [], []
    body = re.sub(r"```.*?```|<[^>]+>|https?://\S+", "", c.readme, flags=re.S)
    cjk = len(re.findall(r"[一-鿿]", body))
    ratio = cjk / max(1, len(re.sub(r"\s", "", body)))
    link = re.search(DR.ZH_DOCS_LINK, c.readme)
    if (pid, "chinese_support", "zh_docs") not in DR.REJECT and (ratio > 0.15 or link):
        vals.append("zh_docs")
        basis.append(f"zh_docs：README 汉字占 {ratio:.0%}" if ratio > 0.15 else f"zh_docs：README 有中文版链接（“{link.group(0)}”）")
    zh = dim_hits(c, "chinese_support", {"zh_retrieval": DR.ZH_RETRIEVAL})
    vals += [v for v, _ in zh]
    basis += [f"{v}：{b}" for v, b in zh]
    d["chinese_support"] = _dim(vals, basis)

    lay = dim_hits(c, "memory_layers", {"layered": DR.LAYER_PATS, "flat": DR.FLAT_PATS})
    if lay:
        v, b = lay[0]
        d["memory_layers"] = res(v, "auto", b)
    else:
        d["memory_layers"] = res("not_mentioned", "auto", "原表、说明和 README 都没提到（未提及不等于没有）")

    post = dim_hits(c, "retrieval_postprocess", DR.POST_PATS)
    d["retrieval_postprocess"] = _dim([v for v, _ in post], [f"{v}：{b}" for v, b in post])

    llm = dim_hits(c, "recall_uses_llm", {"no_llm": DR.NO_LLM_PATS, "llm": DR.LLM_RECALL_PATS})
    d["recall_uses_llm"] = _dim([v for v, _ in llm], [f"{v}：{b}" for v, b in llm])

    for field, pats in (("sensitive_suppression", DR.SUPPRESS_PATS), ("write_receipt", DR.RECEIPT_PATS)):
        hit = dim_hits(c, field, {"yes": pats})
        d[field] = res("yes", "auto", hit[0][1]) if hit else \
            res("not_mentioned", "auto", "原表、说明和 README 都没提到（未提及不等于没有）")

    who = dim_hits(c, "memory_writer", DR.WRITER_PATS)
    vals, basis = [v for v, _ in who], [f"{v}：{b}" for v, b in who]
    wm = val("write_mode")
    if "on_request" in wm and "chat_agent" not in vals:
        vals.append("chat_agent")
        basis.append("chat_agent：写入方式含“由 AI 或用户主动调用”（推断）")
    if ("auto" in wm or "review_first" in wm) and "background" not in vals:
        vals.append("background")
        basis.append("background：写入方式含自动记或先出候选（推断）")
    d["memory_writer"] = _dim(vals, basis)

    # ---- 第三批（问卷 v4 面向手机用户）----
    vals, basis = [], []
    runs, clients, acc = val("runs_on"), val("compatible_clients"), val("access")
    hosts = [h for h in DR.PHONE_HOSTS if h in clients]
    if "phone" in runs or (c.cat == "自带记忆的应用" and set(val("os")) & {"android", "ios"}):
        vals.append("native")
        basis.append("native：本身能在手机上运行")
    elif hosts and ("host_plugin" in acc or c.cat == "自带记忆的应用"):
        vals.append("native")
        basis.append("native：装在手机可用的宿主里（" + "、".join(hosts) + "）")
    web = [x for x in ("claude_web_mobile", "chatgpt") if x in clients]
    if web:
        vals.append("remote_mcp")
        basis.append("remote_mcp：能配合 " + "、".join(web))
    else:
        hit = dim_hits(c, "phone_access", {"remote_mcp": DR.REMOTE_MCP_PATS})
        if hit:
            vals.append("remote_mcp")
            basis.append(f"remote_mcp：{hit[0][1]}")
    far = [r for r in runs if r in ("own_server", "own_cloud_account", "third_party_hosted")]
    if "proxy" in acc and far:
        vals.append("http_endpoint")
        basis.append("http_endpoint：转发服务可以放在 " + "、".join(far))
    cloud = [r for r in runs if r in ("own_cloud_account", "third_party_hosted")]
    if cloud:
        vals.append("cloud")
        basis.append("cloud：运行位置含 " + "、".join(cloud))
    hit = dim_hits(c, "phone_access", {"needs_tunnel": DR.TUNNEL_PATS})
    if hit:
        vals.append("needs_tunnel")
        basis.append(f"needs_tunnel：{hit[0][1]}")
    d["phone_access"] = _dim(vals, basis)

    hit = dim_hits(c, "local_model", {"yes": DR.LOCAL_MODEL_PATS})
    accs = val("accounts_needed")
    if hit:
        d["local_model"] = res("yes", "auto", hit[0][1])
    elif out["accounts_needed"]["status"] != "unknown" and "model_api_key" not in accs \
            and out["cost"]["value"] == "free":
        d["local_model"] = res("no_model_needed", "auto", "不需要模型接口密钥，且免费（推断：本身不调用模型）")
    else:
        d["local_model"] = res("not_mentioned", "auto", "原表、说明和 README 都没提到（未提及不等于没有）")

    hit = dim_hits(c, "model_lock", {"claude_only": DR.CLAUDE_ONLY_PATS})
    if hit:
        d["model_lock"] = res("claude_only", "auto", hit[0][1])
    elif "claude_subscription" in accs:
        d["model_lock"] = res("claude_only", "auto", "需要 Claude 付费套餐")
    elif clients and set(clients) <= {"claude_desktop", "claude_web_mobile"}:
        d["model_lock"] = res("claude_only", "auto", "只写了 Claude 官方客户端（推断）")
    elif clients and set(clients) <= {"chatgpt"}:
        d["model_lock"] = res("openai_only", "auto", "只写了 ChatGPT（推断）")
    else:
        d["model_lock"] = res("not_mentioned", "auto", "没发现只能配合某一家模型的说法")

    if "native" in (out if "phone_access" in fixed else d)["phone_access"]["value"]:
        d["setup_device"] = res("phone_ok", "auto", "手机入口直接可用（推断）")
    elif runs and set(runs) <= {"own_computer"}:
        d["setup_device"] = res("needs_computer", "auto", "只能装在自己的电脑上")
    else:
        d["setup_device"] = res("not_mentioned", "auto", "部署在服务器或云上的，要看部署步骤，逐项核实时填写")
    # 多模态召回只靠逐项人工核实（readme_verification.json）；没核实到的记为未提及
    d["media_recall"] = res(["not_mentioned"], "auto", "没有发现项目自己保管并能召回图片、音频、视频原件的说明（只转成文字的不算）")
    # 多智能体共用同样只靠逐项人工核实
    d["multi_agent"] = res(["not_mentioned"], "auto", "没有发现几个 Agent 共用记忆或按 Agent 分开空间的说明")
    return d


SPEND_PHRASE = {
    "model_api": "要自备模型或向量化接口，按调用量付费",
    "subscription": "要已有的付费订阅，如 Claude Pro，约 20 美元／月起，很多人本来就在付",
    "hosting": "要另付服务器、云平台或租 GPU 的钱",
    "product_fee": "项目本身收费，不买用不了",
}


def n_spend(doc_id, out, review):
    """要额外花多少钱：先按“需要的账号”推出，人工核实过的（data/spend_review.json）以核实为准。
    返回 (spend, spend_note)；spend_note 是给用户看的一句话，含金额（README 写了才有）。"""
    rev = review.get(doc_id)
    accs = out["accounts_needed"]["value"]
    if rev:
        vals = rev["values"]
        spend = res(vals, "verified", f"Claude 核实（{rev['checked']}，{rev['by']}）：" + (rev["detail"] or "没有发现收费或需要另付的接口"))
    else:
        vals = [v for v, a in (("model_api", "model_api_key"), ("subscription", "claude_subscription")) if a in accs]
        if "model_api" not in vals and out["cost"]["value"] == "model_fees_only":  # 账号写“无”但已核实要调模型（如 AstrBot 里配置的服务）
            vals.insert(0, "model_api")
        if not vals and (not accs or out["cost"]["value"] in ("", "paid_service")):
            return (res([], "needs_review", "费用原文未识别，且没有逐项核实过：" + out["cost"]["basis"]),
                    res("", "unknown", "未核实"))
        vals = vals or ["none"]
        spend = res(vals, "auto", "按“需要的账号”和费用档推出：" + "、".join(accs or ["未知"]) + "（没有逐项核实过收费情况）")
    needs = [SPEND_PHRASE[v] for v in vals if v in SPEND_PHRASE]
    parts = []
    if needs:
        text = "需要一些额外花销来搭配这个项目：" + "；".join(needs)
        if "model_api" in vals and out["local_model"]["value"] == "yes":
            text += "；也可改用本地模型，不花钱，但对电脑配置有要求"
        parts.append(text)
    detail = rev["detail"] if rev else ""
    optional = rev.get("optional", "") if rev else ""
    if not needs:
        parts.append("不需要额外花钱")
    if detail:
        parts.append(detail)
    note = "。".join(parts)
    if optional:  # 可选花销：不付也能用，不计入 spend
        note += "。可选花销，不付也能用：" + optional
    if not note.endswith("。"):
        note += "。"
    return spend, res(note, spend["status"], spend["basis"])


def paper_taxonomy(c):
    if not c.x:
        return None
    keys = {"form": "记忆形态 Form", "function": "记忆功能 Function", "formation": "形成 Formation（据 README）",
            "evolution": "演化 Evolution（据 README）", "retrieval": "检索 Retrieval（据 README）", "dynamics_coverage": "动态覆盖类型"}
    return {k: str(c.x.get(v) or "") for k, v in keys.items()}


def normalize(doc, overrides, verification=None):
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
    ver = (verification or {}).get(doc["id"], {})
    for field, ov in ver.get("fields", {}).items():
        out[field] = res(ov["value"], "verified", f"Claude 核实（{ver['checked']}，{ver['by']}）：{ov['note']}")
    fixed = set(overrides.get(doc["id"], {})) | set(ver.get("fields", {}))
    # 打分、情绪、定位、搭配等字段部分由上面的结果推出，所以在套用确认值、核实值之后再算；有这两种值的不覆盖
    for field, item in n_dimensions(c, out, fixed).items():
        if field not in fixed:
            out[field] = item
    out["spend"], spend_note = n_spend(doc["id"], out, SPEND_DATA)
    uncertainties = []
    for f in FIELDS:
        n = out[f]
        if n["status"] == "needs_review" and n["value"] in ("", []):
            n["status"] = "unknown"
            uncertainties.append({"field": f, "label": FIELD_LABELS[f], "note": uncertainty_note(n["basis"])})
    norm = {f: out[f] for f in FIELDS}
    norm["spend_note"] = spend_note
    norm["usage_form"] = n_usage_form(doc["id"], norm)
    norm["token_inject"], norm["token_background"] = n_token(doc["id"], norm)
    norm["mount"] = n_mount(doc["id"], norm)
    norm["host_memory"] = n_host_memory(doc["id"], norm)
    rel = RELATED.get(doc["id"], [])
    norm["pairs_with"] = res([i for i, _ in rel], "auto",
                             "；".join(f"{i}：{n}" for i, n in rel) or "没有记录设计上搭配使用的项目")
    tax = paper_taxonomy(c)
    if tax:
        norm["paper_taxonomy"] = tax
    return norm, uncertainties


def n_usage_form(pid, norm):
    """使用方式（只给结果页显示和搭配方案用）：逐条核对过的在 data/usage_form.json；新项目按接入方式推出初值，标 auto。"""
    if pid in USAGE_DATA:
        return res(USAGE_DATA[pid], "verified", "逐条核对，见 data/usage_form.json")
    role, acc = norm["project_role"]["value"], norm["access"]["value"] or []
    clients = set(norm["compatible_clients"]["value"] or [])
    if role in ("guide", "method"):
        return res([role], "auto", "按项目定位")
    vals = []
    if "proxy" in acc: vals.append("proxy")
    if "host_plugin" in acc:
        vals.append("plugin_chat" if clients & {"sillytavern", "astrbot", "open_webui", "rikkahub", "kelivo"} else "plugin_agent")
    if "standalone_app" in acc or role == "companion_app": vals.append("chat_app")
    if "mcp" in acc: vals.append("service")
    if "cli_tool" in acc: vals.append("cli")
    if "library" in acc or role == "dev_framework": vals.append("library")
    return res(vals[:3] or ["service"], "auto", "按接入方式推出，未核对；核对后写进 data/usage_form.json")


def n_token(pid, norm):
    """token 用量：每轮带进对话的量会不会随记忆变多（token_inject）、后台另外调用大模型的频率（token_background）。
    核对过的在 data/token_usage.json；其余按已有字段推出，标 auto。"""
    if pid in TOKEN_DATA:
        t = TOKEN_DATA[pid]
        basis = "逐条核对，见 data/token_usage.json" + (f"：{t['note']}" if t.get("note") else "")
        return res(t["inject"], "verified", basis), res(t["background"], "verified", basis)
    v = lambda f: norm[f]["value"]
    lst = lambda f: set(v(f) or []) if isinstance(v(f), list) else {v(f)}
    role, acc, pp = v("project_role"), lst("access"), lst("retrieval_postprocess")
    writer, wm, rl = lst("memory_writer"), lst("write_mode"), lst("recall_uses_llm")
    if role in ("guide", "method"):
        inj = res("not_mentioned", "auto", "教程或做法，取决于怎么用")
    elif pp & {"budget", "threshold"}:
        inj = res("bounded", "auto", "检索后有条数或 token 上限")
    elif role == "state_engine":
        inj = res("bounded", "auto", "只带一段固定长度的状态")
    elif "mcp" in acc and "on_request" in wm:
        inj = res("bounded", "auto", "AI 按需调用检索工具，每次返回若干条")
    else:
        inj = res("not_mentioned", "auto", "没有核对")
    if "llm" in rl:
        bg = res("per_message", "auto", "召回时调用大模型")
    elif writer and writer <= {"chat_agent", "user"} and v("dream_consolidation") != "yes":
        bg = res("none", "auto", "由聊天模型或用户写入，没有另外的后台调用")
    else:
        bg = res("not_mentioned", "auto", "没有核对")
    return inj, bg


def n_mount(pid, norm):
    """挂载方式：记忆项目从哪里接进用户的工具，推荐时和问卷配置里的客户端能力表（clients）对比。
    多数按接入方式推出，标 auto；逐条核对或推不出的（转发服务用哪种接口格式、hooks、说明文件）写在 data/mount.json。"""
    if pid in MOUNT_DATA:
        m = MOUNT_DATA[pid]
        return res(m["value"], "verified", "逐条核对，见 data/mount.json" + (f"：{m['note']}" if m.get("note") else ""))
    acc = norm["access"]["value"] or []
    clients = set(norm["compatible_clients"]["value"] or [])
    vals, basis = [], []
    if "mcp" in acc:
        vals.append("mcp"); basis.append("接入方式含 MCP")
    if "proxy" in acc and clients & {"openai_compatible", "developer_built"}:
        vals.append("proxy_openai"); basis.append("转发服务，能接任意 OpenAI 兼容客户端")
    elif "proxy" in acc:
        vals.append("proxy_host"); basis.append("只给能配合的入口里那几个客户端写的转发服务")
    elif "openai_compatible" in clients and "library" not in acc and "cli_tool" not in acc:
        vals.append("proxy_openai"); basis.append("能配合任意 OpenAI 兼容客户端")
    if "host_plugin" in acc:
        vals.append("host_plugin"); basis.append("宿主插件，宿主见能配合的入口")
    if "library" in acc:
        vals.append("sdk"); basis.append("代码库，要写代码调用")
    if "standalone_app" in acc:
        vals.append("standalone"); basis.append("独立应用")
    if "cli_tool" in acc:
        vals.append("cli"); basis.append("命令行工具")
    if "guide" in acc or norm["project_role"]["value"] in ("guide", "method"):
        vals.append("manual"); basis.append("教程或做法，照着搭")
    return res(vals or ["manual"], "auto", "按接入方式推出，未核对：" + "；".join(basis))


# 自带记忆系统的宿主：记忆项目接进去以后，和宿主原有的记忆是什么关系
HOST_MEMORY_HOSTS = ("openclaw", "hermes", "astrbot")


def n_host_memory(pid, norm):
    """和宿主自带记忆的关系，值写成“宿主:关系”：replaces 替换（占用宿主的记忆插槽，原来的停用）、
    replaces_optional 默认并行、装深度插件时替换，mixed 有几个插件、有的占插槽有的不占，
    context_slot 占用 OpenClaw 的上下文引擎插槽（记忆插槽不动），supplements 并行（各存各的）、
    imports 能读入宿主原有的记忆、not_mentioned 没写。
    README 写明的在 data/host_memory.json；其余按宿主的机制推断，标 auto：
    Hermes 的外部记忆提供方和自带的 MEMORY.md、USER.md 同时生效；OpenClaw 的 MCP 工具和自带记忆并存，
    插件要看是否占用记忆插槽（plugins.slots.memory），README 没写的记 not_mentioned；AstrBot 插件在自带记忆之外再加一层。"""
    clients = set(norm["compatible_clients"]["value"] or [])
    acc = norm["access"]["value"] or []
    hosts = [h for h in HOST_MEMORY_HOSTS if h in clients]
    manual = HOST_MEMORY_DATA.get(pid, {})
    vals, basis = [], []
    for h in hosts:
        if h in manual.get("value", {}):
            rel = manual["value"][h]
            vals += [f"{h}:{r}" for r in ([rel] if isinstance(rel, str) else rel)]
            basis.append(f"{h}：README 写明" + (f"，{manual['note']}" if manual.get("note") else ""))
        elif h == "hermes":
            vals.append("hermes:supplements"); basis.append("hermes：外部记忆和自带的 MEMORY.md、USER.md 同时生效（推断）")
        elif h == "astrbot":
            vals.append("astrbot:supplements"); basis.append("astrbot：插件在自带记忆之外再加一层（推断）")
        elif "host_plugin" not in acc:
            vals.append("openclaw:supplements"); basis.append("openclaw：只接 MCP，和自带记忆并存（推断）")
        else:
            vals.append("openclaw:not_mentioned"); basis.append("openclaw：插件，README 没写是否占用记忆插槽")
    if not hosts:
        return res([], "auto", "不接自带记忆系统的宿主")
    status = "verified" if manual and all(h in manual.get("value", {}) for h in hosts) else "auto"
    return res(vals, status, "；".join(basis))


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
        "> 由 `scripts/normalize.py` 生成，不要手改本文件。要补充或修改，请在 `docs/报告/review-normalization.xlsx`「待补充」页的「负责人确认值」一列填写，",
        "> 然后运行 `python -X utf8 scripts/normalize.py --apply-review`。确认值存入 `data/normalization_overrides.json`，以后重新生成也会保留。",
        "> 填写方式：同意建议值就填「同意」；要改就填英文代码（多个用逗号分隔，如 `mcp, proxy`）；留空表示暂不处理。",
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
                    "note": f"负责人同意采用建议值（{date.today().isoformat()}）；原依据：{item['basis']}"}
                n += 1
    OVERRIDES.write_text(json.dumps(overrides, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"采用建议值 {n} 处")


def main():
    if "--apply-review" in sys.argv:
        apply_review()
    if "--accept-suggestions" in sys.argv:
        accept_suggestions()
    overrides = json.loads(OVERRIDES.read_text(encoding="utf-8")) if OVERRIDES.exists() else {}
    verification = json.loads(VERIFICATION.read_text(encoding="utf-8")) if VERIFICATION.exists() else {}
    safety = json.loads(SAFETY_NOTES.read_text(encoding="utf-8")) if SAFETY_NOTES.exists() else {}
    docs = []
    for path in sorted(PROJECTS.glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        if doc["id"] in safety:  # 安全审查备注，推荐时提醒用户
            doc["safety_note"] = safety[doc["id"]]
        else:
            doc.pop("safety_note", None)
        doc["normalized"], doc["uncertainties"] = normalize(doc, overrides, verification)
        ver = verification.get(doc["id"], {})
        if ver.get("summary"):  # 核实时顺带改写的一句话简介（原简介有的是早期内部备注）
            doc["info"]["summary"] = {"value": ver["summary"], "source": "Claude 据仓库 README 改写",
                                      "read_date": ver["checked"]}
        path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        docs.append(doc)
    n_unknown, n_review = write_review(docs)
    print(f"已规范化 {len(docs)} 个项目；文档未说明 {n_unknown} 处，待审核 {n_review} 处，见 {REVIEW_MD.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
