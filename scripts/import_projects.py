"""阶段 0：把候选表中“纳入”的项目导入为 data/projects/<id>.json。

与 build_candidates.py 共用同一套合并与筛选逻辑（collect_rows），所以两边结论一致。
可重复运行：会覆盖 source 为 initial 的文件，并删除已不在纳入名单里的 initial 文件；
访客推荐（source 为 community）的文件不会被动到。

用法（在仓库根目录）：python -X utf8 scripts/import_projects.py
"""
import json
import re
import sys
from pathlib import Path

import jsonschema

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_candidates as B  # noqa: E402
import candidate_review as R  # noqa: E402

ROOT = B.ROOT
OUT = ROOT / "data/projects"
SCHEMA = json.loads((ROOT / "data/schema/project.schema.json").read_text(encoding="utf-8"))
DECIDED_ON = "2026-10-10"

# 行字段 -> JSON info 字段
FIELD_MAP = [("desc", "summary"), ("subj", "memory_subject"), ("acc", "access"), ("cli", "compatible_clients"),
             ("run", "runs_on"), ("diff", "difficulty"), ("need", "accounts_needed"), ("lic", "license"),
             ("note", "notes")]


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def make_ids(rows):
    """优先用仓库名；重名时加上所有者；非 GitHub 项目用项目名。"""
    def base(key, r):
        if key.startswith("name:"):
            return slug(r["name"]) or "project"
        return slug(key.split("/", 1)[1])

    bases = {k: base(k, r) for k, r in rows.items()}
    counts = {}
    for b in bases.values():
        counts[b] = counts.get(b, 0) + 1
    ids = {}
    for k, b in bases.items():
        ids[k] = slug(k.replace("/", "-")) if counts[b] > 1 and not k.startswith("name:") else b
    assert len(set(ids.values())) == len(ids), "项目 id 重复"
    return ids


def to_json(pid, r):
    info = {}
    for src_field, dst in FIELD_MAP:
        value = str(r.get(src_field) or "").strip()
        if value:
            info[dst] = {"value": value, "source": r["prov"][src_field], "read_date": B.READ_DATE}
    meta = r["meta"]
    return {
        "id": pid,
        "name": r["name"],
        "repo_url": r["url"],
        "source": "initial",
        "review_status": "reviewed",
        "candidate": {"category": r["cat"], "group_code": r["c"], "group_meaning": R.CODES.get(r["c"], ""),
                      "decided_on": DECIDED_ON},
        "origins": r["src"],
        "info": info,
        "repo_health": {
            "last_commit": r["date"] or None,
            "stars": r["stars"],
            "archived": meta.get("archived"),
            "source": B.PROV_META if meta else "无法自动读取（不在 GitHub 上或仓库无法访问）",
            "read_date": B.READ_DATE,
        },
        "raw": r["raw"],
    }


def main():
    rows = {k: r for k, r in B.collect_rows().items() if r["v"] == "纳入"}
    ids = make_ids(rows)
    OUT.mkdir(parents=True, exist_ok=True)

    written = set()
    for key, r in rows.items():
        doc = json.loads(json.dumps(to_json(ids[key], r), ensure_ascii=False, default=str))
        jsonschema.validate(doc, SCHEMA)
        path = OUT / f"{doc['id']}.json"
        path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        written.add(path.name)

    removed = []
    for path in OUT.glob("*.json"):
        if path.name in written:
            continue
        if json.loads(path.read_text(encoding="utf-8")).get("source") == "initial":
            path.unlink()
            removed.append(path.name)

    print(f"已导入 {len(written)} 个项目到 {OUT.relative_to(ROOT)}" + (f"；删除过期文件 {removed}" if removed else ""))


if __name__ == "__main__":
    main()
