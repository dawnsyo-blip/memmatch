"""小票原型的字体子集：更纱黑体等宽版 Sarasa Mono SC，常规和粗体两种字重。

用法：python -X utf8 scripts/subset_receipt_font.py
生成两套，放在 prototype/fonts/：
- sarasa-mono-*.woff2 给答题页 receipt.html：页面和共用脚本的全文、问卷配置、项目名（小票上会显示前 3 名）
- sarasa-result-*.woff2 给完整结果页 result.html：再加上全部项目数据、引擎和结果页文字规则里的字
都另收 ASCII 可打印字符。改了页面、问卷或项目数据后重跑一次。
项目数据读打包后的 site/data/projects.json，没有时先跑 node scripts/build_site_data.mjs。

源字体放在 cache/fonts/（不进 git）；没有时从 GitHub 下载 Sarasa-Gothic 的 SarasaMonoSC 压缩包，
用 Windows 自带的 tar 解出 Regular 和 Bold。需要 fonttools 和 brotli。
"""
import json
import os
import subprocess
import urllib.request
from pathlib import Path

from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "cache" / "fonts"
OUT = ROOT / "prototype" / "fonts"
VERSION = "1.0.43"
URL = (f"https://github.com/be5invis/Sarasa-Gothic/releases/download/v{VERSION}/"
       f"SarasaMonoSC-TTF-Unhinted-{VERSION}.7z")
WEIGHTS = {400: "Regular", 700: "Bold"}

# 代理只设了 HTTP_PROXY 时，https 也走它
if os.environ.get("HTTP_PROXY") and not os.environ.get("HTTPS_PROXY"):
    os.environ["HTTPS_PROXY"] = os.environ["HTTP_PROXY"]


def ensure_source():
    SRC.mkdir(parents=True, exist_ok=True)
    need = [f"SarasaMonoSC-{w}.ttf" for w in WEIGHTS.values() if not (SRC / f"SarasaMonoSC-{w}.ttf").exists()]
    if not need:
        return
    archive = SRC / "SarasaMonoSC.7z"
    if not archive.exists():
        print("下载", URL)
        urllib.request.urlretrieve(URL, archive)
    subprocess.run(["tar", "-xf", str(archive), *need], cwd=SRC, check=True)


def read(*paths):
    return "".join((ROOT / p).read_text(encoding="utf8") for p in paths)


def chars_of(text):
    text += "".join(chr(c) for c in range(0x20, 0x7F))
    return "".join(sorted(set(c for c in text if c >= " ")))


def main():
    ensure_source()
    data = ROOT / "site" / "data" / "projects.json"
    if not data.exists():
        raise SystemExit("没有 site/data/projects.json，先跑 node scripts/build_site_data.mjs")
    projects = data.read_text(encoding="utf8")
    names = "".join(p["name"] for p in json.loads(projects)["projects"])
    common = read("prototype/thermal.js", "data/questionnaire/questions.json")
    sets = {
        "sarasa-mono": common + read("prototype/receipt.html") + names,
        "sarasa-result": common + read("prototype/result.html", "prototype/sample.js", "data/usage_form.json",
                                       "site/assets/result-text.js", "engine/rule-engine.js", "engine/index.js") + projects,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    for stem, text in sets.items():
        chars = chars_of(text)
        print(f"{stem}：{len(chars)} 个字符")
        for weight, name in WEIGHTS.items():
            opts = subset.Options()
            opts.flavor = "woff2"
            opts.layout_features = ["*"]
            opts.name_IDs = ["*"]
            font = subset.load_font(str(SRC / f"SarasaMonoSC-{name}.ttf"), opts)
            sub = subset.Subsetter(opts)
            sub.populate(text=chars)
            sub.subset(font)
            out = OUT / f"{stem}-{weight}.woff2"
            subset.save_font(font, str(out), opts)
            print(" ", out.relative_to(ROOT), f"{out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
