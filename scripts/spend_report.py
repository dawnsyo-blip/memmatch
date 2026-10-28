"""生成 docs/spend-report.md：各项目要额外花多少钱（来自 normalized.spend / spend_note）。"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs/spend-report.md"
LABEL = {"none": "不需要额外花钱", "model_api": "自备模型接口（按量付费）", "subscription": "已有的付费订阅",
         "hosting": "服务器／云平台／GPU", "product_fee": "项目本身收费", "optional_paid": "另有付费托管版或高级版"}


def main():
    docs = [json.loads(p.read_text(encoding="utf-8")) for p in sorted((ROOT / "data/projects").glob("*.json"))]
    docs = [d for d in docs if d["inclusion"]["status"] != "excluded"]
    by = {}
    for d in docs:
        for v in d["normalized"]["spend"]["value"] or ["unknown"]:
            by.setdefault(v, []).append(d)
    lines = ["# 额外花费审核报告", "", "由 `scripts/spend_report.py` 生成，数据在各项目的 `normalized.spend`／`spend_note`，"
             "逐项核实的结论在 `data/spend_review.json`。参与推荐的项目共 %d 个（一个项目可属于多类）。" % len(docs), "",
             "| 类别 | 项目数 | 其中逐项核实过 |", "|---|---|---|"]
    for k in ("none", "model_api", "subscription", "hosting", "product_fee", "optional_paid", "unknown"):
        items = by.get(k, [])
        lines.append(f"| {LABEL.get(k, '未能判断')} | {len(items)} | {sum(d['normalized']['spend']['status'] == 'verified' for d in items)} |")
    lines += ["", "“自动”＝只按“需要的账号”和费用档推出，没有逐项看 README 的收费说明；“核实”＝读过 README 再定。", ""]
    for k in ("optional_paid", "subscription", "hosting", "product_fee", "unknown"):
        items = by.get(k, [])
        if not items:
            continue
        lines += [f"## {LABEL.get(k, '未能判断')}（{len(items)}）", "", "| 项目 | 状态 | 提示语 |", "|---|---|---|"]
        for d in items:
            n = d["normalized"]
            lines.append(f"| {d['name']}（`{d['id']}`） | {'核实' if n['spend']['status'] == 'verified' else '自动'} | {n['spend_note']['value'] or '未核实'} |")
        lines.append("")
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("已写入", OUT.relative_to(ROOT))


if __name__ == "__main__":
    sys.exit(main())
