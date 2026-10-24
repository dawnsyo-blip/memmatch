"""生成《个人记忆库候选表.xlsx》。

输入：
  记忆框架开源情况.xlsx                       原始整理表（记忆项目总表、框架开源情况）
  sources/snapshots/*.md                      来源清单的 README 快照（2026-10-10；2026-10-24 补充的几份）
  data/candidates/repo_meta.json              各仓库最后提交日期、Star、许可证文件开头
  scripts/candidate_review.py                 人工筛选结论
输出：
  data/candidates/个人记忆库候选表.xlsx

用法（在仓库根目录）：python -X utf8 scripts/build_candidates.py [输出路径]
"""
import json
import re
import sys
from pathlib import Path

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import candidate_review as R  # noqa: E402

READ_DATE = "2026-10-10"
SRC_ATLAS = "AI Companion Atlas"
SRC_PAPER = "论文表 9"
SRC_TELE = "Awesome-Agent-Memory"
SRC_MCP = "awesome-mcp-servers"
SRC_COMP = "awesome-ai-companion"
READ_DATE_2 = "2026-10-24"


def repo_key(url):
    m = re.match(r"https?://github\.com/([^/\s]+)/([^/#?\s)]+)", url or "")
    if not m:
        return None
    return f"{m.group(1)}/{m.group(2).removesuffix('.git')}".lower()


def parse_teleai(path):
    """TeleAI 清单「Products → Open-Source」一节（含折叠的 Emerging projects）。"""
    text = path.read_text(encoding="utf-8")
    seg = text.split("### Open-Source", 1)[1].split("### Closed-Source", 1)[0]
    items, cur = [], None
    for ln in seg.split("\n"):
        m = re.match(r"\s*(?:\d+\.|-)\s+\*\*\[(.+?)\]\((.+?)\)\*\*", ln)
        if m:
            cur = {"name": m.group(1), "url": m.group(2), "desc": "", "src": SRC_TELE}
            items.append(cur)
            continue
        if cur:
            c = re.search(r"\[\[code\]\((.+?)\)\]", ln)
            if c:
                cur["url"] = c.group(1)
            d = re.match(r"\s*_(.+)_\s*$", ln)
            if d:
                cur["desc"] = d.group(1)
    return items


def parse_mcp(path):
    """awesome-mcp-servers「Knowledge & Memory」一节。"""
    text = path.read_text(encoding="utf-8")
    seg = text.split('name="knowledge--memory"', 1)[1].split("\n### ", 1)[0]
    items = []
    for ln in seg.split("\n"):
        m = re.match(r"- \[(.+?)\]\((https?://[^)]+)\)(.*)", ln)
        if m:
            parts = re.split(r"\s[-–—]\s", m.group(3), maxsplit=1)
            items.append({"name": m.group(1), "url": m.group(2), "src": SRC_MCP,
                          "desc": parts[1].strip() if len(parts) > 1 else m.group(3).strip()})
    return items


COMPANION_FULL = ("## Background Heartbeats", "### Memory & Identity", "### Affect & Drives", "## Continuity & Data Ownership")


def parse_companion(path):
    """awesome-ai-companion：记忆、情绪、心跳、连续性四栏全部解析；其它栏目只取 COMPANION_PICK 里的。"""
    items, section = [], ""
    for ln in path.read_text(encoding="utf-8").split("\n"):
        if ln.startswith("#"):
            section = ln.strip()
            continue
        m = re.match(r"- \[(.+?)\]\((https://github\.com/[^)]+)\) - (.*)", ln)
        if not m:
            continue
        full = section.startswith(COMPANION_FULL)
        if full or repo_key(m.group(2)) in R.COMPANION_PICK:
            items.append({"name": m.group(1), "url": m.group(2), "desc": m.group(3).strip(),
                          "src": f"{SRC_COMP}（{section.lstrip('# ')}）"})
    return items


# 只凭清单简介排除时的关键词规则（按顺序匹配第一条）
DESC_RULES = [
    ("F6", r"(?i)leaderboard|benchmark|baseline"),
    ("B", r"(?i)x402|\bpaid\b|lightning|on-chain|blockchain|\bsui\b|coti|(?<!self-)hosted|saas|pinecone assistant|ragie|graphlit|biel\.ai|counsel api|marketplace"),
    ("F5", r"(?i)fleet|swarm|multi-agent|agents? (?:share|exchange|post|search and)|shared (?:knowledge base|base|research)|other agents|registry|coordinat|agent-to-agent|between agents"),
    ("F2", r"(?i)\bteams?\b|organi[sz]ation|enterprise|company|business|tribal|\borg\b"),
    ("F1", r"(?i)coding|codebase|\brepos?\b|repository|\bgit\b|claude code|codex|commit|\bcode\b|developer|engineering|\bPRs?\b|\bAST\b"),
    ("F3", r"(?i)obsidian|\bnotes?\b|\bdocs?\b|document|rag\b|wiki|zotero|mendeley|book|pdf|youtube|podcast|bookmark|knowledge base|search|ontolog|notebooklm|email|imap|notion|gist|scrivener|\.docx|transcript|archive"),
]


def desc_rule(desc):
    for code, pat in DESC_RULES:
        if re.search(pat, desc or ""):
            return code
    return "F8"


def license_label(head):
    if not head:
        return "无 LICENSE 文件"
    for label, sig in [("MIT", "MIT License"), ("Apache-2.0", "Apache License"), ("AGPL-3.0", "GNU AFFERO"),
                       ("GPL-3.0", "GNU GENERAL PUBLIC LICENSE"), ("BUSL-1.1", "Business Source"),
                       ("MPL-2.0", "Mozilla Public"), ("PolyForm-NC", "PolyForm Noncommercial"),
                       ("CC BY-NC", "Attribution-NonCommercial"), ("BSD", "BSD"), ("MIT", "Permission is hereby granted")]:
        if sig.lower() in head.lower():
            return label
    if "licensed under the MIT" in head:
        return "MIT"
    return "其它（见仓库）"


# 各字段的信息来源说明（写进项目 JSON 的 provenance）
PROV_ATLAS = "负责人原表「记忆项目总表」，据各仓库 README"
PROV_ATLAS_CLI = "Claude 据原表「接入方式」「差异要点」补写"
PROV_PAPER = "负责人原表「框架开源情况」（论文表 9）"
PROV_CLAUDE = "Claude 据仓库 README 判断"
PROV_LICENSE = "仓库 LICENSE 文件开头自动识别"
PROV_LICENSE_FIX = "Claude 人工核对仓库许可证"
PROV_META = "git 浅克隆读取默认分支最新提交；Star 读取 GitHub 仓库页面"
PROV_BENCH = "Claude 据各评测榜单与厂商公布的成绩整理（多为自报）"
INFO_FIELDS = ["desc", "subj", "acc", "cli", "run", "diff", "need", "lic", "note"]


def collect_rows():
    """合并四个来源、套用筛选结论，返回 {键: 行}。键为仓库（小写）或 name:项目名。"""
    meta = json.loads((ROOT / "data/candidates/repo_meta.json").read_text(encoding="utf-8"))["repos"]
    wb_in = openpyxl.load_workbook(ROOT / "记忆框架开源情况.xlsx", data_only=True)
    new = {k.lower(): v for k, v in R.NEW.items()}
    desc_only = {k.lower(): v for k, v in R.DESC_ONLY.items()}

    rows = {}

    def m(key, field):
        return (meta.get(key) or {}).get(field)

    def sheet_dicts(ws, header_row):
        rs = list(ws.iter_rows(min_row=header_row, values_only=True))
        hdr = rs[0]
        return [{h: v for h, v in zip(hdr, r) if h} for r in rs[1:] if any(r)]

    # 1) 原表「记忆项目总表」（及同名的「使用方式对比」行）
    usage = {d["项目名"]: d for d in sheet_dicts(wb_in["使用方式对比"], 3) if d.get("项目名")}
    for raw, r in zip(sheet_dicts(wb_in["记忆项目总表"], 1), wb_in["记忆项目总表"].iter_rows(min_row=2, values_only=True)):
        no, name, url = r[0], r[1], r[15]
        v, code, note = R.XLSX[no]
        key = repo_key(url) or f"name:{name}"
        diff_note = r[30] or ""
        rows[key] = dict(
            name=name, v=v, c=code, desc=r[10] or "", subj=r[6] or "", acc=r[24] or "",
            cli=R.XLSX_CLIENTS.get(no, ""), run=r[25] or "", diff=r[27] or "", need=r[26] or "",
            lic=r[17] or "", date=str(r[16] or ""), stars=m(key, "stars"), url=url,
            src=[f"{SRC_ATLAS}（原表第 {no} 项，{r[4][:1]}类）"], note="；".join(x for x in [note, diff_note] if x),
            prov={**{f: PROV_ATLAS for f in INFO_FIELDS}, "cli": PROV_ATLAS_CLI, "note": PROV_ATLAS},
            raw={"记忆项目总表": raw, **({"使用方式对比": usage[name]} if name in usage else {})})

    # 2) 原表「框架开源情况」（论文表 9）
    paper_raw = {d["框架"]: d for d in sheet_dicts(wb_in["框架开源情况"], 1)}
    paper_rows = {r[1]: r for r in wb_in["框架开源情况"].iter_rows(min_row=2, values_only=True)}
    for fname, (v, code, note, repo) in R.PAPER.items():
        key = repo.lower()
        if key in rows:
            rows[key]["src"].append(f"{SRC_PAPER}（{fname}）")
            rows[key]["raw"]["框架开源情况"] = paper_raw[fname]
            continue
        pr = paper_rows[fname]
        e = new.get(key, {})
        rows[key] = dict(
            name=e.get("name", fname), v=v, c=code, desc=e.get("desc", pr[6] or ""), subj=e.get("subj", ""),
            acc=e.get("acc", ""), cli=e.get("cli", ""), run=e.get("run", ""), diff=e.get("diff", ""),
            need=e.get("need", ""), lic=pr[3] or "", date=str(m(key, "last_commit") or pr[5] or ""),
            stars=m(key, "stars"), url=f"https://github.com/{repo}", src=[f"{SRC_PAPER}（{fname}）"],
            note="；".join(x for x in [note, e.get("note", ""), pr[6] if e else ""] if x),
            prov={**{f: PROV_CLAUDE if e else PROV_PAPER for f in INFO_FIELDS}, "lic": PROV_PAPER},
            raw={"框架开源情况": paper_raw[fname], **({"人工筛选": e} if e else {})})

    # 3) 三个 awesome 清单
    for it in parse_teleai(ROOT / "sources/snapshots/TeleAI-UAGI_Awesome-Agent-Memory.md") + \
            parse_mcp(ROOT / "sources/snapshots/punkpeye_awesome-mcp-servers.md") + \
            parse_companion(ROOT / "sources/snapshots/DasterProkio_awesome-ai-companion.md"):
        key = repo_key(it["url"]) or f"name:{it['name']}"
        list_raw = {"name": it["name"], "url": it["url"], "desc": it["desc"]}
        if key in rows:
            if it["src"] not in " ".join(rows[key]["src"]):
                rows[key]["src"].append(it["src"])
            rows[key]["raw"].setdefault(it["src"], list_raw)
            continue
        if key in new:
            e = new[key]
            v, code = e["v"], e["c"]
        elif key in desc_only or key in R.COMPANION_SKIP:
            e, v, code = {}, "排除", desc_only.get(key) or R.COMPANION_SKIP[key]
        else:
            e, v, code = {}, "排除", desc_rule(it["desc"])
        rows[key] = dict(
            name=e.get("name", it["name"]), v=v, c=code, desc=e.get("desc", ""), subj=e.get("subj", ""),
            acc=e.get("acc", ""), cli=e.get("cli", ""), run=e.get("run", ""), diff=e.get("diff", ""),
            need=e.get("need", ""),
            lic=R.LICENSE_OVERRIDE.get(key) or (license_label(m(key, "license_head")) if m(key, "repo") else ""),
            date=m(key, "last_commit") or "", stars=m(key, "stars"), url=it["url"], src=[it["src"]],
            note=e.get("note", ""), list_desc=it["desc"], judged=bool(e),
            prov={**{f: PROV_CLAUDE for f in INFO_FIELDS},
                  "lic": PROV_LICENSE_FIX if key in R.LICENSE_OVERRIDE else PROV_LICENSE},
            raw={it["src"]: list_raw, **({"人工筛选": e} if e else {})})

    # 4) 2026-10-24 补充的其它来源（负责人点名、上下文工程合集、酒馆插件合集、评测榜单、网络检索）
    for key, label in R.EXTRA_SOURCES.items():
        if key in rows:
            if label not in rows[key]["src"]:
                rows[key]["src"].append(label)
            continue
        e = new[key]
        url = f"https://github.com/{m(key, 'repo') or key}"
        rows[key] = dict(
            name=e["name"], v=e["v"], c=e["c"], desc=e["desc"], subj=e["subj"], acc=e["acc"], cli=e["cli"],
            run=e["run"], diff=e["diff"], need=e["need"],
            lic=R.LICENSE_OVERRIDE.get(key) or (license_label(m(key, "license_head")) if m(key, "repo") else ""),
            date=m(key, "last_commit") or "", stars=m(key, "stars"), url=url, src=[label], note=e["note"],
            prov={**{f: PROV_CLAUDE for f in INFO_FIELDS}, "lic": PROV_LICENSE},
            raw={"人工筛选": e, "来源": label})
    for name, (v, code, desc, note) in R.NAME_ONLY.items():
        rows[f"name:{name}"] = dict(
            name=name, v=v, c=code, desc=desc, subj="", acc="", cli="", run="", diff="", need="", lic="", date="",
            stars=None, url="", src=["评测榜单（LongMemEval、BEAM 等）"], note=note,
            prov={f: PROV_CLAUDE for f in INFO_FIELDS}, raw={"评测榜单": note})

    # 5) 评测成绩写进备注和 raw（多为厂商自报，只作参考）
    for key, score in R.BENCH.items():
        r = rows[key]
        if not r["note"]:
            r["prov"]["note"] = PROV_BENCH
        r["note"] = "；".join(x for x in [r["note"], f"评测：{score}"] if x)
        r["raw"]["评测榜单"] = score
        if not any(s.startswith("评测榜单") for s in r["src"]):
            r["src"].append("评测榜单（LongMemEval、BEAM 等）")

    # 6) 套用负责人对各分组的决定
    for r in rows.values():
        r["cat"] = ""
        if r["c"] in R.GROUP_POLICY:
            r["v"], r["cat"], flag = R.GROUP_POLICY[r["c"]]
            if flag and flag not in r["note"]:
                r["note"] = "；".join(x for x in [flag, r["note"]] if x)
        if r["v"] == "纳入":
            r["cat"] = R.CATEGORY_OVERRIDE.get(r["name"]) or r["cat"] or R.DEFAULT_CATEGORY
        r["meta"] = meta.get(r["url"] and repo_key(r["url"]) or "", {})
    return rows


def main():
    write_xlsx(collect_rows())


HEAD_FILL = PatternFill("solid", fgColor="DDE6F0")
FILLS = {"纳入": PatternFill("solid", fgColor="E3F1E0"), "待定": PatternFill("solid", fgColor="FFF4D6")}


def sheet(wb, title, header, data, widths):
    ws = wb.create_sheet(title)
    ws.append(header)
    for c in ws[1]:
        c.font = Font(bold=True)
        c.fill = HEAD_FILL
        c.alignment = Alignment(wrap_text=True, vertical="center")
    for row in data:
        ws.append(row)
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    for row in ws.iter_rows(min_row=2):
        for c in row:
            c.alignment = Alignment(wrap_text=True, vertical="top")
    ws.freeze_panes = "C2"
    ws.auto_filter.ref = ws.dimensions
    return ws


def write_xlsx(rows):
    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    order = {"纳入": 0, "待定": 1}
    cat_order = {R.DEFAULT_CATEGORY: 0, "自带记忆的应用": 1, "需写代码（开发者向）": 2, "教程与搭建指南": 3,
                 "边缘项（存的不是对话记忆）": 4}
    cand = sorted((r for r in rows.values() if r["v"] in order),
                  key=lambda r: (order[r["v"]], cat_order.get(r["cat"], 9), r["c"], -(r["stars"] or 0)))
    excl = sorted((r for r in rows.values() if r["v"] == "排除"), key=lambda r: (r["c"], r["name"].lower()))

    n_in = sum(r["v"] == "纳入" for r in cand)
    n_pend = len(cand) - n_in
    n_cat = {k: sum(r["cat"] == k for r in cand) for k in cat_order}
    intro = [
        ["个人记忆库候选表", ""],
        ["用途", "从已知项目和公开清单中，筛出“普通个人用户能直接用、或配合自己已有的 agent 就能用、以文字交流为主”的记忆库项目（含帮助长对话不断线的上下文、检索工具），供后续建站导入。"],
        ["读取日期", f"{READ_DATE}；补充来源 {READ_DATE_2}。所有判断据各仓库 README 与清单简介，未实际安装验证。"],
        ["结论统计", f"各来源共 {sum(len(r['src']) for r in rows.values())} 条（同一项目出现在几个来源就计几次），按仓库去重合并后 {len(rows)} 条：纳入 {n_in} 个（" + "、".join(f"{k} {v}" for k, v in n_cat.items()) + f"），待定 {n_pend} 个，排除 {len(excl)} 个。"],
        ["", ""],
        ["基本标准（所有纳入项目）", "① 代码开源，可自己部署（托管服务只作可选项）；② 场景以文字对话为主（排除屏幕录制、多模态生活日志、代码库索引、企业文档检索）；③ 记的是“记忆”：用户事实与偏好、对话历史、AI 自身身份与关系、做事经验，不是单纯的笔记或文档搜索。"],
        ["收录类别", f"{R.DEFAULT_CATEGORY}：有现成接法（MCP 服务、网关／代理、宿主插件，如 OpenClaw、Hermes、AstrBot、Claude Code），不用写代码就能接到用户已有的助手上。只支持 Claude Code 的会话记忆、偏编程的记忆（P2）、默认走托管服务的（P3）也算这一类，后两者在备注里标出。"],
        ["", "自带记忆的应用：记忆是某个应用（多为伴侣应用或完整的 agent）的一部分，不能单独接到已有助手上；用户愿意换用这个应用就能直接用。对应代码 E1、P1。"],
        ["", "需写代码（开发者向）：只提供代码库或服务，要自己写代码对接或自备前端（代码 A），或部署门槛很高（代码 P4）。"],
        ["", "教程与搭建指南：本身不是可直接安装的软件，而是教程、搭建日志或设计文档，照着做能实现记忆、换窗或伴侣功能（代码 G，2026-10-24 新增，待负责人确认）。"],
        ["", "边缘项（存的不是对话记忆）：存情绪、身体状态或模型权重，或只做一次性提示（代码 E2），原表第⑧类，按负责人要求保留，2026-10-24 补入的情绪、身体状态、梦境项目也归这一类。"],
        ["结论含义", "纳入：进入候选。待定：还需负责人决定，按「分组代码」归类。排除：不收录，附原因代码。"],
        ["负责人决定（2026-10-10）", "收录需写代码（A）、应用自带记忆（E1）和自带助手的完整应用（P1）；收录只支持 Claude Code 的会话记忆；排除 P5（证据不足）、P6（偏工作/团队）。之后又决定：收录 P2（偏编程，备注标出）、P3（默认托管，备注标风险）、P4（并入“需写代码”类别），排除 P7（人格/档案）；原表 50 个项目全部收录（E2 两项单列“边缘项”类别）；Mnemosyne OS 因核心私有排除；只支持 Claude Code 但偏编程场景的会话记忆排除。"],
        ["负责人要求（2026-10-24）", "补充 awesome-ai-companion 中记忆与上下文相关的项目（Memory, Identity & Emotion State 全部、Background Heartbeats 部分）；补入 Loci、Text2Mem、ReMe、memU、OpenViking、Hindsight（后四个已在表中）；从上下文工程、检索工程合集中筛选适合文字交流、非开发者用户的项目（如换窗召回）；补入长期对话记忆评测上表现好的项目。沿用以前的分组规则，新增 G 类。"],
        ["", ""],
        ["来源", f"{SRC_ATLAS}：原表「记忆项目总表」50 个项目（https://www.ailover-atlas.com/?filter=memory）"],
        ["", f"{SRC_PAPER}：原表「框架开源情况」24 个框架（论文 Memory in the Age of AI Agents，arXiv 2512.13564）"],
        ["", f"{SRC_TELE}：https://github.com/TeleAI-UAGI/Awesome-Agent-Memory 「Products → Open-Source」一节（含 Emerging projects），共 112 条"],
        ["", f"{SRC_MCP}：https://github.com/punkpeye/awesome-mcp-servers 「Knowledge & Memory」一节，共 337 条"],
        ["", "consolidation-draft（https://github.com/zziying/consolidation-draft）：是一份“事件整合”记忆维护的设计规格，不是项目清单；文中只顺带提到 Generative Agents、Graphiti/Zep、Mem0、MemoryBank，均已在其它来源中出现，因此没有从中新增项目。"],
        ["补充来源（2026-10-24）", f"{SRC_COMP}：https://github.com/DasterProkio/awesome-ai-companion 「Memory, Identity & Emotion State」「Background Heartbeats & Proactive Messaging」「Continuity & Data Ownership」三栏全部列入（不收录的附原因），其它栏目只取 RikkaHub Jude、Ocean 两个以上下文管理为主的客户端；其余栏目（客户端、虚拟手机、语音形象等）多为自带记忆的伴侣应用，这次没有逐个补读。"],
        ["", "负责人指定：Loci、Text2Mem、swap-tutorial（换窗召回示例）及其上游 LMC-5；ReMe、memU、OpenViking、Hindsight 已在表中。"],
        ["", "上下文工程合集：yzfly/awesome-context-engineering 的工具部分几乎都是编程 agent 的上下文工具，只记录读过的几个；Meirtz/Awesome-Context-Engineering 以论文为主，只有 2 个可用工具。"],
        ["", "检索工程合集：Danielskry/Awesome-RAG、lizhe2004/Awesome-LLM-RAG-Application 全是文档问答框架、向量库和论文，没有面向聊天用户的记忆或换窗工具，未新增条目。"],
        ["", "酒馆插件合集：Min3Mast3r4653/SillyTavern-Extensions-and-Themes 中的记忆、摘要、检索类扩展；另据网络检索补入 Smart Memory、OpenVault（仓库无法访问）和 Open WebUI 的记忆函数。酒馆、Open WebUI 正是以文字聊天为主的普通用户常用的前端。"],
        ["", "评测榜单：LongMemEval、BEAM、PersonaMem、LoCoMo 上的成绩多为厂商自报、口径不一（有的只测检索），写进备注供参考。MemBench、REALTALK、DuLeMon 是数据集论文，没有找到公开的系统排行，无法据此挑选项目。闭源托管的 past.dev、Exabase 记为排除。"],
        ["", "快照：以上合集的 README 存在 sources/snapshots/（2026-10-24）。"],
        ["", ""],
        ["如何读这张表", "「候选项目」页：纳入在前（绿色），待定在后（黄色）。上手门槛、需要的账号均据 README 判断。Star 与最后提交为读取当日数据。"],
        ["", "「排除项目」页：每条附原因代码。标“据清单简介”的条目没有打开 README，只按清单里的一句话描述归类；其余条目读过 README。"],
        ["", "「代码说明」页：分组代码（P1–P7、G）与排除原因（A、B、C、E1、E2、F1–F8、DUP）的含义。A/B/C/E1/E2 与路线图阶段 3 的排除代码一致。"],
        ["重要局限", "① 未实际安装，门槛和兼容性可能与说明文档不符；② 只按简介排除的条目可能有误判；③ 许可证据 LICENSE 文件开头自动识别，商用前请看原文；④ 原表 50 个项目沿用原表字段，未重新读 README。"],
    ]
    ws = sheet(wb, "说明", ["项", "内容"], intro[1:], [22, 120])
    ws["A1"].value, ws["B1"].value = intro[0][0], "（生成脚本：scripts/build_candidates.py）"

    header = ["序号", "项目名", "筛选结论", "收录类别", "分组代码", "代码说明", "一句话说明", "主要记住什么", "接入方式",
              "能配合的助手/客户端", "运行位置", "上手门槛（据 README，未实测）", "需要的账号/密钥", "许可证",
              "最后提交", "Star", "仓库链接", "来源", "备注"]
    data = [[i, r["name"], r["v"], r["cat"], r["c"], R.CODES.get(r["c"], ""), r["desc"], r["subj"], r["acc"], r["cli"],
             r["run"], r["diff"], r["need"], r["lic"], r["date"], r["stars"], r["url"], "；".join(r["src"]),
             r["note"]] for i, r in enumerate(cand, 1)]
    ws = sheet(wb, "候选项目", header, data, [5, 22, 8, 14, 7, 24, 40, 16, 20, 30, 22, 18, 20, 14, 11, 8, 36, 26, 36])
    for row in ws.iter_rows(min_row=2):
        fill = FILLS.get(row[2].value)
        for c in row[:4]:
            c.fill = fill

    data = [[i, r["name"], r["c"], R.CODES.get(r["c"], ""),
             "读过 README" if r.get("judged", True) else "据清单简介",
             r["desc"] or r.get("list_desc", ""), r["note"], r["date"], r["stars"], r["url"], "；".join(r["src"])]
            for i, r in enumerate(excl, 1)]
    sheet(wb, "排除项目", ["序号", "项目名", "原因代码", "原因说明", "判断依据", "简介", "备注", "最后提交", "Star",
                       "仓库链接", "来源"], data, [5, 26, 7, 30, 10, 60, 30, 11, 8, 40, 26])

    sheet(wb, "代码说明", ["代码", "含义", "候选表中条数"],
          [[k, v, sum(r["c"] == k for r in rows.values())] for k, v in R.CODES.items()], [8, 80, 12])

    from collections import Counter
    src_count = Counter(s.split("（")[0] for r in rows.values() for s in r["src"])
    stat = []
    for s in [SRC_ATLAS, SRC_PAPER, SRC_TELE, SRC_MCP, SRC_COMP, "负责人指定", "上下文工程合集", "酒馆插件合集",
              "网络检索", "评测榜单"]:
        rs = [r for r in rows.values() if any(x.startswith(s) for x in r["src"])]
        stat.append([s, src_count[s], sum(r["v"] == "纳入" for r in rs), sum(r["v"] == "待定" for r in rs),
                     sum(r["v"] == "排除" for r in rs)])
    stat.append(["合计（去重后）", len(rows), n_in, n_pend, len(excl)])
    sheet(wb, "来源统计", ["来源", "条目数", "纳入", "待定", "排除"], stat, [24, 10, 8, 8, 8])

    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "data/candidates/个人记忆库候选表.xlsx"
    try:
        wb.save(out)
    except PermissionError:
        sys.exit(f"无法写入 {out}：文件可能正在 Excel 里打开，关掉后重试。")
    print(f"已生成 {out}：纳入 {n_in}，待定 {n_pend}，排除 {len(excl)}，去重后共 {len(rows)}")


if __name__ == "__main__":
    main()
