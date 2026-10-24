"""把每个项目的 README 缓存到 cache/readmes/<id>.md（目录不进仓库），供阶段 1 规范化脚本读取。

已缓存的跳过；加 --force 重新下载。只下载 README 文本，不运行仓库里的任何代码。
用法：python -X utf8 scripts/fetch_readmes.py [--force]
"""
import json
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "cache/readmes"
# 仓库里记忆服务不在根目录 README 的项目：id -> 路径
README_PATH = {"servers": "src/memory/README.md"}
CANDIDATES = ["README.md", "readme.md", "Readme.md", "README.MD", "README.rst", "README"]


def fetch(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=40) as resp:
                return resp.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
        except Exception:
            pass
        time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"网络错误：{url}")


def job(doc):
    m = re.match(r"https?://github\.com/([^/]+)/([^/#?]+)", doc["repo_url"])
    if not m:
        return doc["id"], "不在 GitHub 上，跳过"
    local = ROOT / "cache/candidate_readmes" / f"{m.group(1)}__{m.group(2)}.md"  # fetch_repo_meta.py 已读过的
    if local.exists() and doc["id"] not in README_PATH:
        (CACHE / f"{doc['id']}.md").write_text(local.read_text(encoding="utf-8"), encoding="utf-8")
        return doc["id"], "ok"
    base = f"https://raw.githubusercontent.com/{m.group(1)}/{m.group(2)}/HEAD/"
    for name in ([README_PATH[doc["id"]]] if doc["id"] in README_PATH else CANDIDATES):
        try:
            text = fetch(base + name)
        except RuntimeError as e:
            return doc["id"], str(e)
        if text:
            (CACHE / f"{doc['id']}.md").write_text(text, encoding="utf-8")
            return doc["id"], "ok"
    return doc["id"], "找不到 README"


def main():
    force = "--force" in sys.argv
    CACHE.mkdir(parents=True, exist_ok=True)
    docs = [json.loads(p.read_text(encoding="utf-8")) for p in sorted((ROOT / "data/projects").glob("*.json"))]
    todo = [d for d in docs if force or not (CACHE / f"{d['id']}.md").exists()]
    with ThreadPoolExecutor(3) as ex:
        results = list(ex.map(job, todo))
    bad = [(i, s) for i, s in results if s != "ok"]
    print(f"需下载 {len(todo)} 个，成功 {len(todo) - len(bad)} 个")
    for i, s in bad:
        print(f"  {i}: {s}")


if __name__ == "__main__":
    main()
