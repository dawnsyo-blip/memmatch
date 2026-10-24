"""补读候选仓库的元数据和 README，写进 data/candidates/repo_meta.json。

只处理 repo_meta.json 里还没有的仓库：
  python -X utf8 scripts/fetch_repo_meta.py owner/repo [owner/repo ...]   读指定仓库
  python -X utf8 scripts/fetch_repo_meta.py --missing                     读候选表里缺元数据的仓库
README 存到 cache/candidate_readmes/<owner>__<repo>.md（不进仓库），供人工筛选时阅读。
读取方法与 repo_meta.json 原有条目一致：git 浅克隆读最新提交日期和 LICENSE，仓库网页读 Star 和归档状态。
"""
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from check_health import LICENSE_FILE, fetch_page, rmtree, run  # noqa: E402

META = ROOT / "data/candidates/repo_meta.json"
CACHE = ROOT / "cache/meta_clones"
READMES = ROOT / "cache/candidate_readmes"
README_NAMES = re.compile(r"(?i)^readme(\.(md|markdown|rst|txt))?$")

# 本机代理只设了 HTTP_PROXY 时，https 请求（urllib、git）不会走代理
if os.environ.get("HTTP_PROXY") and not os.environ.get("HTTPS_PROXY"):
    os.environ["HTTPS_PROXY"] = os.environ["HTTP_PROXY"]


def read_repo(repo):
    owner, name = repo.split("/")
    dest = CACHE / f"{owner}__{name}"
    err = None
    for attempt in range(3):
        rmtree(dest)
        p = run(["git", "clone", "-q", "--depth=1", "--filter=blob:none", "--no-checkout",
                 f"https://github.com/{repo}", str(dest)], timeout=300)
        if p.returncode == 0:
            break
        err = p.stderr.strip()[-120:]
        if re.search(r"not found|could not read Username|Authentication failed", p.stderr):
            return repo, None, "仓库无法访问"
        time.sleep(5 * (attempt + 1))
    else:
        return repo, None, f"克隆失败：{err}"

    files = run(["git", "ls-tree", "--name-only", "HEAD"], dest).stdout.split("\n")
    lic = next((f for f in files if LICENSE_FILE.match(f)), None)
    readme = next((f for f in files if README_NAMES.match(f)), None)
    lic_text = run(["git", "show", f"HEAD:{lic}"], dest).stdout if lic else ""
    readme_text = run(["git", "show", f"HEAD:{readme}"], dest).stdout if readme else ""
    if (lic and not lic_text.strip()) or (readme and not readme_text.strip()):
        rmtree(dest)
        return repo, None, "文件内容读取失败（网络问题），请重试"
    last = run(["git", "log", "-1", "--format=%cI"], dest).stdout.strip()[:10]
    rmtree(dest)

    html, _ = fetch_page(owner, name)
    s = html and re.search(r'"stargazerCount":(\d+)', html)
    a = html and re.search(r'"isArchived":(true|false)', html)
    if readme_text:
        READMES.mkdir(parents=True, exist_ok=True)
        (READMES / f"{owner}__{name}.md").write_text(readme_text, encoding="utf-8")
    return repo, {"repo": repo, "last_commit": last or None, "stars": int(s.group(1)) if s else None,
                  "archived": (a.group(1) == "true") if a else None, "license_head": lic_text[:300],
                  "has_readme": bool(readme_text), "read_date": date.today().isoformat()}, None


def missing_repos():
    import build_candidates as B
    meta = json.loads(META.read_text(encoding="utf-8"))["repos"]
    keys = {B.repo_key(r["url"]) for r in B.collect_rows().values() if r.get("url")}
    return sorted(k for k in keys if k and k not in meta and "/tree/" not in k)


def main():
    data = json.loads(META.read_text(encoding="utf-8"))
    have = {k.lower() for k in data["repos"]}
    repos = missing_repos() if sys.argv[1:] == ["--missing"] else sys.argv[1:]
    todo = [r for r in dict.fromkeys(repos) if r.lower() not in have]
    print(f"待读取 {len(todo)} 个仓库")
    failed = []
    with ThreadPoolExecutor(3) as ex:
        for repo, meta, err in ex.map(read_repo, todo):
            if err:
                failed.append(f"{repo}：{err}")
                continue
            data["repos"][repo.lower()] = meta
            print(f"  {repo}  {meta['last_commit']}  ★{meta['stars']}")
    META.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    if failed:
        print("失败（可重跑）：\n  " + "\n  ".join(failed))


if __name__ == "__main__":
    main()
