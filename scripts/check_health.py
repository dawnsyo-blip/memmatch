"""阶段 2：检查每个项目的维护情况和许可证，写回项目 JSON 的 health 字段，并生成 docs/health-report.md。

不用 GitHub 接口（未登录每小时只有 60 次）：
  - git 克隆近一年的提交记录（不下载文件内容）→ 最后提交日期、近一年提交数、贡献人数、仓库里的许可证文件
  - 读取仓库网页里的数据 → 是否已归档、正式发布版本数、Star 数
按路线图，只在导入时运行一次；阶段 5 处理社区推荐时对新项目调用 check_repo()，不做定期刷新。
只读取提交记录和许可证文件，不运行仓库里的任何代码。

用法（在仓库根目录）：
  python -X utf8 scripts/check_health.py               检查全部项目
  python -X utf8 scripts/check_health.py --resume      只检查还没检查过的、以及上次因网络失败的项目
  python -X utf8 scripts/check_health.py --only a,b    只检查指定项目
  python -X utf8 scripts/check_health.py --refresh-license  只用已保存的结果重算许可证标签与风险提示
网络故障记为 status=error（需要重试），只有确认仓库不存在／不公开才记为 unreachable。
"""
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROJECTS = ROOT / "data/projects"
CACHE = ROOT / "cache/repos"
SETTINGS = json.loads((ROOT / "data/settings.json").read_text(encoding="utf-8"))
REPORT = ROOT / "docs/health-report.md"
TODAY = date.today()
# 只按作者邮箱判断机器人账号；不能用 “bot@” 这类宽泛写法，会误伤名字里带 bot 的真人或 agent 账号
BOT = re.compile(r"\[bot\]|^(?:noreply@github\.com|github-actions@github\.com|actions@github\.com)$|dependabot|renovate", re.I)
# 检查逻辑有改动时加 1；--resume 会重跑版本更低的结果
CHECKER_VERSION = 3
# 记忆服务只是大仓库中一部分的项目：统计数字是整个仓库的
MONOREPO_NOTE = {"servers": "统计的是整个 modelcontextprotocol/servers 合集仓库，记忆服务只是其中一个子目录"}
LICENSE_FILE = re.compile(r"(?i)^(licen[cs]e|copying|unlicense)([-._ ].*)?$")


def rmtree(path):
    """删除克隆目录。Windows 上 git 的打包文件是只读的，要先去掉只读属性才能删。"""
    def onexc(func, target, _exc):
        os.chmod(target, stat.S_IWRITE)
        func(target)
    if path.exists():
        shutil.rmtree(path, onexc=onexc)


def run(cmd, cwd=None, timeout=600):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout)


# 按“限制多的优先”识别：BUSL 正文里会提到到期后转 Apache，自定义许可里常有 MIT 式的授权句
LICENSE_SIGNS = [
    ("BUSL-1.1", r"Business Source License"),
    ("PolyForm-NC", r"PolyForm Noncommercial"),
    ("CC BY-NC", r"Attribution-NonCommercial|CC BY-NC"),
    ("源码可见（自定义许可）", r"(?i)source[- ]available"),
    ("AGPL-3.0", r"GNU AFFERO GENERAL PUBLIC LICENSE|GNU Affero General Public License"),
    ("LGPL", r"GNU LESSER GENERAL PUBLIC LICENSE"),
    ("GPL-3.0", r"GNU GENERAL PUBLIC LICENSE"),
    ("MPL-2.0", r"Mozilla Public License"),
    ("Apache-2.0", r"Apache License"),
    ("MIT", r"MIT License|Permission is hereby granted, free of charge"),
    ("BSD", r"BSD (?:2|3)-Clause|Redistribution and use in source and binary forms"),
    ("Unlicense", r"This is free and unencumbered software"),
]


def license_label(text):
    """识别许可证文件：只看开头的标题部分；全文出现禁止商用的说法时单独标出。"""
    head = text[:800]
    label = next((name for name, pat in LICENSE_SIGNS if re.search(pat, head)), None)
    if label is None:
        label = "其它（见仓库）"
    if re.search(r"(?i)non-?commercial", text) and label not in STANDARD_NO_NC_CHECK + ("PolyForm-NC", "CC BY-NC"):
        label += NC_SUFFIX
    return label


# 标准许可证正文本身就含 noncommercial 一类字样（如 GPL 的“偶尔以非商业方式分发”），不据此判禁止商用
STANDARD_NO_NC_CHECK = ("AGPL-3.0", "GPL-3.0", "LGPL", "MPL-2.0", "BUSL-1.1")
NC_SUFFIX = "（含禁止商用条款）"


def refresh_license(h):
    """用已保存的识别结果重新计算标签、类别和风险提示，不必重新克隆。"""
    if h.get("status") != "ok" or not h.get("license_label") or h["license_label"] == "无许可证文件":
        return h
    parts = []
    for part in h["license_label"].split(" ＋ "):
        base = part.removesuffix(NC_SUFFIX)
        parts.append(base if base in STANDARD_NO_NC_CHECK else part)
    h["license_label"] = " ＋ ".join(dict.fromkeys(parts))
    order = ["noncommercial", "source_available", "other", "copyleft", "permissive"]
    h["license_category"] = min((license_category(x) for x in parts), key=order.index)
    h["flags"] = flags(h)
    return h


def license_category(label):
    if "禁止商用" in label:
        return "noncommercial"
    if label in ("MIT", "Apache-2.0", "BSD", "Unlicense"):
        return "permissive"
    if label in ("AGPL-3.0", "GPL-3.0", "LGPL", "MPL-2.0"):
        return "copyleft"
    if label in ("PolyForm-NC", "CC BY-NC"):
        return "noncommercial"
    if label in ("BUSL-1.1", "源码可见（自定义许可）"):
        return "source_available"
    return "other"


def fetch_page(owner, name):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(f"https://github.com/{owner}/{name}", timeout=40) as resp:
                return resp.read().decode("utf-8", "replace"), None
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None, "仓库网页不存在或不公开（404）"
        except Exception as e:  # 网络抖动，重试
            err = str(e)
        time.sleep(4 * (attempt + 1))
    return None, f"仓库网页读取失败：{err[:80]}"


def clone(owner, name, dest):
    """克隆近一年的提交记录；一年内没有提交时退回只取最新一次提交。"""
    rmtree(dest)
    url = f"https://github.com/{owner}/{name}"
    since = (TODAY - timedelta(days=365)).isoformat()
    for attempt in range(3):
        p = run(["git", "clone", "-q", "--bare", "--filter=blob:none", f"--shallow-since={since}", url, str(dest)])
        if p.returncode == 0:
            return None
        if "shallow" in p.stderr or "no commits" in p.stderr.lower():
            rmtree(dest)
            p = run(["git", "clone", "-q", "--bare", "--filter=blob:none", "--depth=1", url, str(dest)])
            if p.returncode == 0:
                return None
        if re.search(r"not found|Repository not found|could not read Username|Authentication failed", p.stderr):
            return "仓库无法访问（已删除、改名或设为私有）"
        rmtree(dest)
        time.sleep(5 * (attempt + 1))
    return f"克隆失败：{p.stderr.strip()[-120:]}"


def check_repo(repo_url, pid):
    """检查一个仓库，返回 health 字典。供本脚本和阶段 5 的每周处理调用。"""
    base = {"checked_on": TODAY.isoformat(), "method": "git 克隆近一年提交记录＋读取仓库网页", "checker_version": CHECKER_VERSION}
    m = re.match(r"https?://github\.com/([^/]+)/([^/#?]+)", repo_url or "")
    if not m:
        return {**base, "status": "not_github", "note": "代码不在 GitHub 上，无法自动检查"}
    owner, name = m.group(1), m.group(2).removesuffix(".git")

    html, page_err = fetch_page(owner, name)
    dest = CACHE / pid
    clone_err = clone(owner, name, dest)
    if clone_err and not html:
        gone = "无法访问" in clone_err or (page_err and "404" in page_err)
        return {**base, "status": "unreachable" if gone else "error",
                "note": clone_err if "无法访问" in clone_err else (page_err or clone_err)}

    out = {**base, "status": "ok"}
    if html:
        s = re.search(r'"stargazerCount":(\d+)', html)
        a = re.search(r'"isArchived":(true|false)', html)
        rc = re.search(r'"releaseCount":(\d+)', html)
        out["stars"] = int(s.group(1)) if s else None
        out["archived"] = (a.group(1) == "true") if a else None
        out["release_count"] = int(rc.group(1)) if rc else (0 if '"releases":false' in html else None)
    else:
        out.update(stars=None, archived=None, release_count=None)
        out["note"] = page_err

    if clone_err:
        out.update(last_commit=None, commits_1y=None, contributors_1y=None, license_files=[], license_label=None,
                   license_category=None)
        out["note"] = clone_err
        return out

    last = run(["git", "log", "-1", "--format=%cI"], dest).stdout.strip()
    out["last_commit"] = last[:10] if last else None
    out["days_since_commit"] = (TODAY - datetime.fromisoformat(last).astimezone(timezone.utc).date()).days if last else None
    since = (TODAY - timedelta(days=365)).isoformat()
    log = run(["git", "log", f"--since={since}", "--format=%aE\t%aN"], dest).stdout.split("\n")
    people = {line.split("\t")[0].lower() for line in log if line.strip() and not BOT.search(line.split("\t")[0])}
    out["commits_1y"] = sum(1 for line in log if line.strip())
    out["contributors_1y"] = len(people)

    files = [f for f in run(["git", "ls-tree", "--name-only", "HEAD"], dest).stdout.split("\n") if LICENSE_FILE.match(f)]
    labels, heads = [], {}
    for f in files:
        text = run(["git", "show", f"HEAD:{f}"], dest).stdout
        if not text.strip():  # 部分克隆按需下载文件内容，网络中断时会读到空文件
            rmtree(dest)
            return {**base, "status": "error", "note": f"许可证文件 {f} 读取失败（网络问题）"}
        labels.append(license_label(text))
        heads[f] = text[:1200]  # 保存开头，以后调整识别规则时不必重新克隆
    out["license_files"] = files
    out["license_text_head"] = heads
    out["license_label"] = " ＋ ".join(dict.fromkeys(labels)) if labels else "无许可证文件"
    cats = [license_category(x) for x in labels]
    order = ["noncommercial", "source_available", "other", "copyleft", "permissive"]
    out["license_category"] = min(cats, key=order.index) if cats else "no_license"
    rmtree(dest)  # 只为读提交记录，用完即删
    if pid in MONOREPO_NOTE:
        out["note"] = MONOREPO_NOTE[pid]
    return out


def flags(h):
    """阶段 3 用到的风险提示（只提示，不排除）。"""
    f = []
    if h.get("status") == "error":
        return ["检查失败（网络问题，需重试）"]
    if h.get("status") != "ok":
        f.append("无法自动检查")
        return f
    if h.get("archived"):
        f.append("已归档")
    if (h.get("days_since_commit") or 0) > SETTINGS["stale_days"]:
        f.append(f"超过 {SETTINGS['stale_days']} 天没有提交")
    if h.get("contributors_1y") is not None and h["contributors_1y"] <= SETTINGS["single_maintainer_max"]:
        f.append("近一年只有一人维护" if h["contributors_1y"] == 1 else "近一年没有人提交")
    if h.get("release_count") == 0:
        f.append("没有正式发布版本")
    if h.get("license_category") == "no_license":
        f.append("没有许可证文件")
    if h.get("license_category") == "noncommercial":
        f.append("许可证禁止商用")
    if h.get("license_category") == "source_available":
        f.append("许可证限制使用（源码可见）")
    if h.get("license_category") == "other":
        f.append("许可证非标准，需看原文")
    return f


def write_report(docs):
    ok = [d for d in docs if d["health"]["status"] == "ok"]
    bad = [d for d in docs if d["health"]["status"] in ("not_github", "unreachable")]
    failed = [d for d in docs if d["health"]["status"] == "error"]
    from collections import Counter
    flag_count = Counter(x for d in docs for x in d["health"]["flags"])
    lines = [
        "# 阶段 2 维护情况与许可证检查报告", "",
        f"> 由 `scripts/check_health.py` 生成，检查日期 {TODAY.isoformat()}。按路线图只在导入时检查一次，网站上每个项目会显示这个“信息核实日期”。", "",
        "检查方法：git 克隆近一年的提交记录（不下载文件内容、不运行代码），统计最后提交日期、近一年提交数和贡献人数（不计机器人账号），"
        "读取仓库里的许可证文件；再从仓库网页读取是否已归档、正式发布版本数和 Star 数。", "",
        f"共 {len(docs)} 个项目，成功检查 {len(ok)} 个，无法自动检查 {len(bad)} 个，因网络问题检查失败 {len(failed)} 个（用 `--resume` 重试）。停更阈值为 {SETTINGS['stale_days']} 天（可在 `data/settings.json` 修改）。", "",
        "## 风险提示统计（只提示、不排除）", "", "| 提示 | 项目数 |", "|---|---|",
    ] + [f"| {k} | {v} |" for k, v in flag_count.most_common()] + [""]

    if bad:
        lines += ["## 无法自动检查", "", "| 项目 | 原因 |", "|---|---|"]
        lines += [f"| {d['name']}（`{d['id']}`） | {d['health'].get('note', '')} |" for d in bad] + [""]

    mismatch = [d for d in ok if d["health"]["license_category"] != (d["normalized"]["license_category"]["value"] or None)]
    if mismatch:
        lines += ["## 许可证文件与此前记录不一致", "",
                  "此前记录来自原表或 README；这里以仓库现在的许可证文件为准，阶段 3 会采用新的结果。", "",
                  "| 项目 | 此前记录 | 仓库许可证文件 |", "|---|---|---|"]
        for d in mismatch:
            old = d["info"].get("license", {}).get("value", "")
            lines.append(f"| {d['name']}（`{d['id']}`） | {old} | {d['health']['license_label']}（{', '.join(d['health']['license_files']) or '无'}） |")
        lines.append("")

    lines += ["## 全部项目", "", "| 项目 | 最后提交 | 距今天数 | 近一年提交／贡献人数 | 正式发布 | 已归档 | 许可证文件 | Star | 风险提示 |",
              "|---|---|---|---|---|---|---|---|---|"]
    for d in sorted(docs, key=lambda d: d["name"].lower()):
        h = d["health"]
        if h["status"] != "ok":
            lines.append(f"| {d['name']} | — | — | — | — | — | — | — | 无法自动检查 |")
            continue
        lines.append(f"| {d['name']} | {h.get('last_commit') or '—'} | {h.get('days_since_commit', '—')} | "
                     f"{h.get('commits_1y', '—')}／{h.get('contributors_1y', '—')} | {h.get('release_count', '—')} | "
                     f"{'是' if h.get('archived') else '否'} | {h.get('license_label') or '—'} | {h.get('stars') or '—'} | "
                     f"{'、'.join(h['flags']) or '—'} |")
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def github_reachable():
    try:
        urllib.request.urlopen("https://github.com/", timeout=20)
        return True
    except Exception:
        return False


def main():
    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
    resume = "--resume" in sys.argv
    if "--refresh-license" in sys.argv:
        docs = []
        for p in sorted(PROJECTS.glob("*.json")):
            d = json.loads(p.read_text(encoding="utf-8"))
            if "health" in d:
                d["health"] = refresh_license(d["health"])
                p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                docs.append(d)
        write_report(docs)
        print(f"已按新规则重算 {len(docs)} 个项目的许可证结果")
        return
    CACHE.mkdir(parents=True, exist_ok=True)
    paths = sorted(PROJECTS.glob("*.json"))
    docs = {p: json.loads(p.read_text(encoding="utf-8")) for p in paths}

    def needs(p):
        d = docs[p]
        if only is not None:
            return d["id"] in only
        if resume:  # 旧版本把网络故障也记成了 unreachable，带“读取失败／克隆失败”字样的一并重试
            h = d.get("health") or {}
            return (not h or h.get("status") == "error" or h.get("checker_version", 1) < CHECKER_VERSION
                    or re.search(r"读取失败|克隆失败", h.get("note", "") or ""))
        return True

    todo = [p for p in paths if needs(p)]
    if not github_reachable():
        raise SystemExit("现在连不上 github.com，稍后再试（用 --resume 继续）。")
    failures = 0

    def job(p):
        d = docs[p]
        h = check_repo(d["repo_url"], d["id"])
        h["flags"] = flags(h)
        return p, h

    with ThreadPoolExecutor(3) as ex:
        for i, (p, h) in enumerate(ex.map(job, todo), 1):
            if h["status"] == "error":
                failures += 1
                if failures >= 6 and not github_reachable():
                    print("连续网络失败，github.com 已连不上，停止本轮；稍后用 --resume 继续。", flush=True)
                    ex.shutdown(wait=False, cancel_futures=True)
                    break
            else:
                failures = 0
            docs[p]["health"] = h
            p.write_text(json.dumps(docs[p], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            if h["status"] != "ok" or i % 20 == 0:
                print(f"[{i}/{len(todo)}] {docs[p]['id']}: {h['status']} {h.get('note', '')}", flush=True)
    write_report([d for d in docs.values() if "health" in d])
    print(f"已检查 {len(todo)} 个项目，报告见 {REPORT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
