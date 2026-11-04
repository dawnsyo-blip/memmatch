"""把网站读的问卷配置导出成给负责人改题用的文字稿（根目录的《记忆库推荐问卷 v6 文字稿》）。
负责人在文字稿上改完，再由 Claude 同步回 data/questionnaire/questions.json 和《记忆库推荐问卷 v6》。

用法：python -X utf8 scripts/export_questionnaire_text.py [输出路径]
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "data/questionnaire/questions.json"
OUT = ROOT / "记忆库推荐问卷 v6 文字稿.md"

TYPE = {"single": "单选", "multi": "多选", "rank": "排序"}
# 显示条件写不成“第 N 题选了……”这种通用说法的，直接写
SHOW_TEXT = {
    "q8": "第 6 题选了用过某种记忆服务时显示",
    "q8n": "第 6 题选了“还没用过，但对 LLM 记忆有些了解”或“没用过，也不太了解”时显示",
    "q18t": "第 2l 题不是只选了“本地运行的开源模型”时显示",
    "q15p": "第 2 题或它的追问选了“其它”“不清楚”时显示",
}

HEADER = """# 记忆库推荐问卷 v6 · 文字稿

> 只收题目、选项和说明文字，内容取自网站读取的问卷配置 `data/questionnaire/questions.json`（与《记忆库推荐问卷 v6》一致），由 `scripts/export_questionnaire_text.py` 导出。题号后括号里是答题页显示的题型提示和显示条件；标［填空］的选项选中后会出现输入框，标（互斥）的选项不能和其它选项同时选。
> 直接在这里改文字即可，改完告诉我，我再同步到问卷 v6 和网站配置。
"""


def num(q):
    return q.get("number") or q["id"][1:]


def show_text(q, by_id):
    if q["id"] in SHOW_TEXT:
        return SHOW_TEXT[q["id"]]
    c = q.get("show_if")
    if not c:
        return ""
    t = by_id[c["question"]]
    labels = lambda ids: "”或“".join(o["label"] for o in t["options"] if o["id"] in ids)
    follow = "追问" if num(q)[-1].isalpha() else "显示"
    if "selected_any" in c:
        return f"第 {num(t)} 题选了“{labels(c['selected_any'])}”时{follow}"
    if "selected_none" in c:
        return f"第 {num(t)} 题没选“{labels(c['selected_none'])}”时显示"
    if "not_only_within" in c:
        return f"第 {num(t)} 题不是只选了“{labels(c['not_only_within'])}”时显示"
    raise ValueError(f"{q['id']} 的显示条件要写进 SHOW_TEXT")


def option_lines(o):
    tail = ("［填空］" if o.get("free_text") else "") + ("（互斥）" if o.get("exclusive") else "")
    lines = [f"- {o['label']}{tail}"]
    if o.get("help"):
        first, *rest = o["help"].split("\n")
        lines.append(f"  - 说明：{first}")
        lines += [f"    {x}" for x in rest]
    return lines


def main():
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    by_id = {q["id"]: q for q in cfg["questions"]}
    out = [HEADER]
    for part in cfg["parts"]:
        out += ["---", "", f"## {part['label']}　{part['title']}", ""]
        for qid in part["questions"]:
            q = by_id[qid]
            cond = show_text(q, by_id)
            out += [f"### 第 {num(q)} 题（{TYPE[q['type']]}{'；' + cond if cond else ''}）", "", q["text"], ""]
            if q.get("help"):
                h = q["help"].split("\n")
                out += (["说明：" + h[0]] if len(h) == 1 else ["说明：", *h]) + [""]
            for o in q["options"]:
                out += option_lines(o)
            out.append("")
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else OUT
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(out).rstrip() + "\n")
    print(f"已导出 {path}")


if __name__ == "__main__":
    main()
