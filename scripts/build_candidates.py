"""生成《个人记忆库候选表.xlsx》。

输入：
  记忆框架开源情况.xlsx                       原始整理表（记忆项目总表、框架开源情况）
  sources/snapshots/*.md                      三个来源清单的 README 快照（2026-10-10）
  data/candidates/repo_meta.json              各仓库最后提交日期、Star、许可证文件开头
  scripts/candidate_review.py                 人工筛选结论
输出：
  data/candidates/个人记忆库候选表.xlsx

用法（在仓库根目录）：python -X utf8 scripts/build_candidates.py
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


def main():
    meta = json.loads((ROOT / "data/candidates/repo_meta.json").read_text(encoding="utf-8"))["repos"]
    wb_in = openpyxl.load_workbook(ROOT / "记忆框架开源情况.xlsx", data_only=True)
    new = {k.lower(): v for k, v in R.NEW.items()}
    desc_only = {k.lower(): v for k, v in R.DESC_ONLY.items()}

    rows = {}  # 键：仓库（小写）或非 GitHub 项目的名称

    def m(key, field):
        return (meta.get(key) or {}).get(field)

    # 1) 原表「记忆项目总表」
    for r in wb_in["记忆项目总表"].iter_rows(min_row=2, values_only=True):
        no, name, url = r[0], r[1], r[15]
        v, code, note = R.XLSX[no]
        key = repo_key(url) or f"name:{name}"
        diff_note = r[30] or ""
        rows[key] = dict(
            name=name, v=v, c=code, desc=r[10] or "", subj=r[6] or "", acc=r[24] or "",
            cli=R.XLSX_CLIENTS.get(no, ""), run=r[25] or "", diff=r[27] or "", need=r[26] or "",
            lic=r[17] or "", date=str(r[16] or ""), stars=m(key, "stars"), url=url,
            src=[f"{SRC_ATLAS}（原表第 {no} 项，{r[4][:1]}类）"], note="；".join(x for x in [note, diff_note] if x))

    # 2) 原表「框架开源情况」（论文表 9）
    paper_rows = {r[1]: r for r in wb_in["框架开源情况"].iter_rows(min_row=2, values_only=True)}
    for fname, (v, code, note, repo) in R.PAPER.items():
        key = repo.lower()
        if key in rows:
            rows[key]["src"].append(f"{SRC_PAPER}（{fname}）")
            continue
        pr = paper_rows[fname]
        e = new.get(key, {})
        rows[key] = dict(
            name=e.get("name", fname), v=v, c=code, desc=e.get("desc", pr[6] or ""), subj=e.get("subj", ""),
            acc=e.get("acc", ""), cli=e.get("cli", ""), run=e.get("run", ""), diff=e.get("diff", ""),
            need=e.get("need", ""), lic=pr[3] or "", date=str(m(key, "last_commit") or pr[5] or ""),
            stars=m(key, "stars"), url=f"https://github.com/{repo}", src=[f"{SRC_PAPER}（{fname}）"],
            note="；".join(x for x in [note, e.get("note", ""), pr[6] if e else ""] if x))

    # 3) 两个 awesome 清单
    for it in parse_teleai(ROOT / "sources/snapshots/TeleAI-UAGI_Awesome-Agent-Memory.md") + \
            parse_mcp(ROOT / "sources/snapshots/punkpeye_awesome-mcp-servers.md"):
        key = repo_key(it["url"]) or f"name:{it['name']}"
        if key in rows:
            if it["src"] not in " ".join(rows[key]["src"]):
                rows[key]["src"].append(it["src"])
            continue
        if key in new:
            e = new[key]
            v, code = e["v"], e["c"]
        elif key in desc_only:
            e, v, code = {}, "排除", desc_only[key]
        else:
            e, v, code = {}, "排除", desc_rule(it["desc"])
        rows[key] = dict(
            name=e.get("name", it["name"]), v=v, c=code, desc=e.get("desc", ""), subj=e.get("subj", ""),
            acc=e.get("acc", ""), cli=e.get("cli", ""), run=e.get("run", ""), diff=e.get("diff", ""),
            need=e.get("need", ""), lic=license_label(m(key, "license_head")) if m(key, "repo") else "",
            date=m(key, "last_commit") or "", stars=m(key, "stars"), url=it["url"], src=[it["src"]],
            note=e.get("note", ""), list_desc=it["desc"], judged=bool(e))

    write_xlsx(rows)


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
    cand = sorted((r for r in rows.values() if r["v"] in order),
                  key=lambda r: (order[r["v"]], r["c"], -(r["stars"] or 0)))
    excl = sorted((r for r in rows.values() if r["v"] == "排除"), key=lambda r: (r["c"], r["name"].lower()))

    n_in = sum(r["v"] == "纳入" for r in cand)
    n_pend = len(cand) - n_in
    intro = [
        ["个人记忆库候选表", ""],
        ["用途", "从已知项目和三个公开清单中，筛出“普通个人用户能直接用、或配合自己已有的 agent 就能用、以文字交流为主”的记忆库项目，供后续建站导入。"],
        ["读取日期", f"{READ_DATE}。所有判断据各仓库 README 与清单简介，未实际安装验证。"],
        ["结论统计", f"纳入 {n_in} 个，待定 {n_pend} 个，排除 {len(excl)} 个（含重复合并前的全部条目）。"],
        ["", ""],
        ["筛选标准（纳入需同时满足）", "① 代码开源，可自己部署（托管服务只作可选项）；"],
        ["", "② 不用自己写代码：有现成接法——MCP 服务、网关／代理、宿主插件（OpenClaw、Hermes、AstrBot、Claude Code 等），或可直接安装的应用；按说明文档几条命令或点选能装好；"],
        ["", "③ 能接到用户已有的助手上，而不是只能在它自带的界面里用；"],
        ["", "④ 场景以文字对话为主（排除屏幕录制、多模态生活日志、代码库索引、企业文档检索）；"],
        ["", "⑤ 记的是“记忆”：用户事实与偏好、对话历史、AI 自身身份与关系、做事经验，不是单纯的笔记或文档搜索。"],
        ["结论含义", "纳入：符合全部标准。待定：有一项拿不准，按「待定分组」归类，需要负责人决定。排除：明确不符合，附原因代码。"],
        ["", ""],
        ["来源", f"{SRC_ATLAS}：原表「记忆项目总表」50 个项目（https://www.ailover-atlas.com/?filter=memory）"],
        ["", f"{SRC_PAPER}：原表「框架开源情况」24 个框架（论文 Memory in the Age of AI Agents，arXiv 2512.13564）"],
        ["", f"{SRC_TELE}：https://github.com/TeleAI-UAGI/Awesome-Agent-Memory 「Products → Open-Source」一节（含 Emerging projects），共 112 条"],
        ["", f"{SRC_MCP}：https://github.com/punkpeye/awesome-mcp-servers 「Knowledge & Memory」一节，共 337 条"],
        ["", "consolidation-draft（https://github.com/zziying/consolidation-draft）：是一份“事件整合”记忆维护的设计规格，不是项目清单；文中只顺带提到 Generative Agents、Graphiti/Zep、Mem0、MemoryBank，均已在其它来源中出现，因此没有从中新增项目。"],
        ["", ""],
        ["如何读这张表", "「候选项目」页：纳入在前（绿色），待定在后（黄色）。上手门槛、需要的账号均据 README 判断。Star 与最后提交为读取当日数据。"],
        ["", "「排除项目」页：每条附原因代码。标“据清单简介”的条目没有打开 README，只按清单里的一句话描述归类；其余条目读过 README。"],
        ["", "「代码说明」页：待定分组（P1–P7）与排除原因（A、B、C、E1、E2、F1–F8、DUP）的含义。A/B/C/E1/E2 与路线图阶段 3 的排除代码一致。"],
        ["重要局限", "① 未实际安装，门槛和兼容性可能与说明文档不符；② 只按简介排除的条目可能有误判；③ 许可证据 LICENSE 文件开头自动识别，商用前请看原文；④ 原表 50 个项目沿用原表字段，未重新读 README。"],
    ]
    ws = sheet(wb, "说明", ["项", "内容"], intro[1:], [22, 120])
    ws["A1"].value, ws["B1"].value = intro[0][0], "（生成脚本：scripts/build_candidates.py）"

    header = ["序号", "项目名", "筛选结论", "待定分组", "分组说明", "一句话说明", "主要记住什么", "接入方式",
              "能配合的助手/客户端", "运行位置", "上手门槛（据 README，未实测）", "需要的账号/密钥", "许可证",
              "最后提交", "Star", "仓库链接", "来源", "备注"]
    data = [[i, r["name"], r["v"], r["c"], R.CODES.get(r["c"], ""), r["desc"], r["subj"], r["acc"], r["cli"],
             r["run"], r["diff"], r["need"], r["lic"], r["date"], r["stars"], r["url"], "；".join(r["src"]),
             r["note"]] for i, r in enumerate(cand, 1)]
    ws = sheet(wb, "候选项目", header, data, [5, 22, 8, 7, 24, 40, 16, 20, 30, 22, 18, 20, 14, 11, 8, 36, 26, 36])
    for row in ws.iter_rows(min_row=2):
        fill = FILLS.get(row[2].value)
        for c in row[:3]:
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
    for s in [SRC_ATLAS, SRC_PAPER, SRC_TELE, SRC_MCP]:
        rs = [r for r in rows.values() if any(x.startswith(s) for x in r["src"])]
        stat.append([s, src_count[s], sum(r["v"] == "纳入" for r in rs), sum(r["v"] == "待定" for r in rs),
                     sum(r["v"] == "排除" for r in rs)])
    stat.append(["合计（去重后）", len(rows), n_in, n_pend, len(excl)])
    sheet(wb, "来源统计", ["来源", "条目数", "纳入", "待定", "排除"], stat, [24, 10, 8, 8, 8])

    out = ROOT / "data/candidates/个人记忆库候选表.xlsx"
    wb.save(out)
    print(f"已生成 {out.relative_to(ROOT)}：纳入 {n_in}，待定 {n_pend}，排除 {len(excl)}，去重后共 {len(rows)}")


if __name__ == "__main__":
    main()
