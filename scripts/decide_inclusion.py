"""阶段 3：按标准决定每个项目的收录状态，写回项目 JSON 的 inclusion 字段，并生成 docs/inclusion-report.md。

状态：included（收录）/ flagged（收录但加风险提示）/ excluded（排除，附原因代码）/ pending（证据不足，待定）。
所有判断基于说明文档、仓库内容和阶段 2 的检查结果，没有实际安装。

与路线图的差异（负责人 2026-10-10 的决定）：A（需写代码）、E1（应用自带记忆）、E2（存的不是记忆）
不再排除，改为收录并用“收录类别”区分（见 candidate.category）。

用法（在仓库根目录，先跑完 check_health.py）：python -X utf8 scripts/decide_inclusion.py
"""
import json
from collections import Counter
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SETTINGS = json.loads((ROOT / "data/settings.json").read_text(encoding="utf-8"))
PROJECTS = ROOT / "data/projects"
REPORT = ROOT / "docs/inclusion-report.md"
TODAY = date.today().isoformat()

EXCLUSION_CODES = {
    "B": "核心闭源，只能用对方的托管服务",
    "C": "停更且有证据表明已经跑不通（已归档）",
    "D": "数据格式不开放，也没有导出功能",
    "N": "无法获取代码：仓库无法访问，或代码不在代码托管网站上",
}
STATUS_LABELS = {"included": "收录", "flagged": "收录但加风险提示", "excluded": "排除", "pending": "待定（证据不足）"}


def decide(doc):
    h = doc.get("health") or {}
    n = doc["normalized"]
    reasons, flags = [], []

    # 无法获取代码：负责人 2026-10-11 决定直接排除（settings.exclude_unreachable）；关掉开关则归为待定
    if h.get("status") in ("not_github", "unreachable"):
        if SETTINGS.get("exclude_unreachable"):
            return {"status": "excluded", "exclusion_code": "N", "flags": [],
                    "reasons": [h.get("note", "无法自动检查")], "decided_on": TODAY}
        return {"status": "pending", "exclusion_code": None, "flags": [],
                "reasons": [h.get("note", "无法自动检查")], "decided_on": TODAY}

    # C：已归档
    if h.get("archived"):
        return {"status": "excluded", "exclusion_code": "C", "flags": [],
                "reasons": ["仓库已被作者归档（标记为不再维护）"], "decided_on": TODAY}

    # D：明确没有导出、且数据格式不开放——目前没有项目被记为“无导出”，此条暂不触发
    if n["export"]["value"] == ["none"] and n["export"]["status"] in ("confirmed", "auto"):
        return {"status": "excluded", "exclusion_code": "D", "flags": [],
                "reasons": ["没有导出功能，数据格式不开放"], "decided_on": TODAY}

    # 风险提示（只提示不排除）
    flags += [f for f in h.get("flags", []) if f != "无法自动检查"]
    # 仓库许可证文件没体现、但原表或 README 记录了使用限制的（如含非商业约束的子模块），照样提示
    old = n["license_category"]["value"]
    if old == "noncommercial" and "许可证禁止商用" not in flags:
        flags.append("许可证禁止商用（据原表／README，部分内容）")
    if old == "source_available" and not any("限制使用" in f for f in flags):
        flags.append("许可证限制使用（据原表／README）")
    data = n["data_passes_through"]["value"] or []
    if "third_party" in data:
        if data == ["third_party"] or "默认经第三方" in doc["info"].get("notes", {}).get("value", ""):
            flags.append("对话内容默认经过第三方服务器")
        else:
            flags.append("托管模式下对话内容经过第三方服务器（也可自己部署）")
    if doc["candidate"]["category"] != "可接入已有助手":
        reasons.append(f"收录类别：{doc['candidate']['category']}")

    status = "flagged" if flags else "included"
    return {"status": status, "exclusion_code": None, "flags": flags, "reasons": reasons, "decided_on": TODAY}


def write_report(docs):
    by = {s: [d for d in docs if d["inclusion"]["status"] == s] for s in STATUS_LABELS}
    flag_count = Counter(f for d in docs for f in d["inclusion"]["flags"])
    cat_count = Counter((d["candidate"]["category"], d["inclusion"]["status"]) for d in docs)
    lines = [
        "# 阶段 3 收录状态报告", "",
        f"> 由 `scripts/decide_inclusion.py` 生成，判定日期 {TODAY}。依据说明文档、仓库内容和阶段 2 的检查结果（`docs/health-report.md`），**没有实际安装验证**。", "",
        "## 判定规则", "",
        "- **排除 C**：仓库已归档。只是长期没有提交、但没有“跑不通”的证据的，不排除，只加风险提示（仓库问题反馈没有逐个查看）。",
        "- **排除 B**（核心闭源、只能用托管）已在候选表阶段排除，此处不再出现；**排除 D**（无导出且格式不开放）目前没有项目被确认“无导出”，暂未触发。",
        "- **排除 N**：代码不在 GitHub 上或仓库无法访问（负责人 2026-10-11 决定排除；`data/settings.json` 的 `exclude_unreachable` 关掉后改为待定）。",
        "- **风险提示**（只提示、不排除）：超过停更阈值没有提交、近一年只有一人维护、没有正式发布版本、没有许可证文件、许可证禁止商用或限制使用、对话内容经过第三方服务器。",
        "- **与路线图的差异**：负责人决定收录需写代码（A）、应用自带记忆（E1）、存的不是记忆（E2）的项目，用“收录类别”区分，不排除。", "",
        "## 统计", "",
        "| 状态 | 数量 |", "|---|---|",
    ] + [f"| {STATUS_LABELS[s]} | {len(by[s])} |" for s in STATUS_LABELS] + [
        "", "| 收录类别 | 收录 | 收录但提示 | 排除 | 待定 |", "|---|---|---|---|---|",
    ]
    for cat in ["可接入已有助手", "自带记忆的应用", "需写代码（开发者向）", "边缘项（存的不是对话记忆）"]:
        lines.append(f"| {cat} | " + " | ".join(str(cat_count[(cat, s)]) for s in STATUS_LABELS) + " |")
    lines += ["", "| 风险提示 | 项目数 |", "|---|---|"] + [f"| {k} | {v} |" for k, v in flag_count.most_common()] + [""]

    for s in ["excluded", "pending", "flagged", "included"]:
        if not by[s]:
            continue
        lines += [f"## {STATUS_LABELS[s]}（{len(by[s])} 个）", ""]
        if s == "excluded":
            lines += ["| 项目 | 代码 | 原因 |", "|---|---|---|"]
            lines += [f"| {d['name']}（`{d['id']}`） | {d['inclusion']['exclusion_code']} | {'；'.join(d['inclusion']['reasons'])} |" for d in by[s]]
        elif s == "pending":
            lines += ["| 项目 | 原因 |", "|---|---|"]
            lines += [f"| {d['name']}（`{d['id']}`） | {'；'.join(d['inclusion']['reasons'])} |" for d in by[s]]
        else:
            lines += ["| 项目 | 收录类别 | 风险提示 |", "|---|---|---|"]
            lines += [f"| {d['name']}（`{d['id']}`） | {d['candidate']['category']} | {'、'.join(d['inclusion']['flags']) or '—'} |"
                      for d in sorted(by[s], key=lambda d: (d['candidate']['category'], d['name'].lower()))]
        lines.append("")
    REPORT.write_text("\n".join(lines), encoding="utf-8")


def main():
    docs = []
    for path in sorted(PROJECTS.glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        if "health" not in doc:
            raise SystemExit(f"{doc['id']} 还没有阶段 2 的检查结果，请先运行 check_health.py")
        doc["inclusion"] = decide(doc)
        path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        docs.append(doc)
    write_report(docs)
    c = Counter(d["inclusion"]["status"] for d in docs)
    print("；".join(f"{STATUS_LABELS[k]} {c[k]}" for k in STATUS_LABELS) + f"，报告见 {REPORT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
