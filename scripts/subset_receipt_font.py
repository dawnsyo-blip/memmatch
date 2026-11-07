"""小票原型的字体子集：更纱黑体等宽版 Sarasa Mono SC，常规和粗体两种字重。

用法：python -X utf8 scripts/subset_receipt_font.py
生成两套，放在 prototype/fonts/：
- sarasa-mono-*.woff2 给答题页 receipt.html：页面和共用脚本的全文、问卷配置、项目名（小票上会显示前 3 名）
- sarasa-result-*.woff2 给完整结果页 result.html 和项目库 catalog.html：再加上全部项目数据、引擎和结果页文字规则里的字
都另收 ASCII 可打印字符。改了页面、问卷或项目数据后重跑一次。

另外生成结果页“订购人”输入框的备用字体（负责人 2026-11-04 要）：访客填的名字事先不知道，
把 GB2312 的 6763 个常用字（常规字重）按码位切成每片 80 个字，放在 prototype/fonts/input/，
prototype/fonts/input.css 给每片声明 unicode-range，字体名“Sarasa Input”。输入框的字体写成
“Sarasa Mono SC”, “Sarasa Input”：子集里有的字照常显示，没有的字浏览器才去下载包含它的那一片（每片约 14 KB）。
这些切片和页面内容无关，只在换源字体版本时需要重新生成，加 --input 参数才生成。
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


# 订购人输入框的备用字体：GB2312 的常用字按码位排序后每 80 个字一片
INPUT_SLICE = 80


def gb2312_chars():
    chars = []
    for hi in range(0xB0, 0xF8):
        for lo in range(0xA1, 0xFF):
            try:
                chars.append(bytes([hi, lo]).decode("gb2312"))
            except UnicodeDecodeError:
                pass
    return sorted(set(chars), key=ord)


def ranges(chars):
    """码位列表写成 unicode-range：连续的合并成 U+4E00-4E05。"""
    cps, out, i = [ord(c) for c in chars], [], 0
    while i < len(cps):
        j = i
        while j + 1 < len(cps) and cps[j + 1] == cps[j] + 1:
            j += 1
        out.append(f"U+{cps[i]:X}" if i == j else f"U+{cps[i]:X}-{cps[j]:X}")
        i = j + 1
    return ", ".join(out)


def build_input_slices():
    chars = gb2312_chars()
    folder = OUT / "input"
    folder.mkdir(parents=True, exist_ok=True)
    for old in folder.glob("*.woff2"):
        old.unlink()
    css = ["/* 结果页“订购人”输入框的备用字体，由 scripts/subset_receipt_font.py --input 生成：",
           "   GB2312 常用字按码位每 80 个字一片，浏览器只下载输入框里用到的字所在的那几片 */"]
    total = 0
    for k in range(0, len(chars), INPUT_SLICE):
        part = chars[k:k + INPUT_SLICE]
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["*"]
        font = subset.load_font(str(SRC / "SarasaMonoSC-Regular.ttf"), opts)
        sub = subset.Subsetter(opts)
        sub.populate(text="".join(part))
        sub.subset(font)
        name = f"sarasa-input-{k // INPUT_SLICE:03d}.woff2"
        subset.save_font(font, str(folder / name), opts)
        total += (folder / name).stat().st_size
        css.append(f'@font-face {{ font-family: "Sarasa Input"; src: url("input/{name}") format("woff2"); '
                   f'font-weight: 400; font-display: swap; unicode-range: {ranges(part)}; }}')
    (OUT / "input.css").write_text("\n".join(css) + "\n", encoding="utf8", newline="\n")
    n = (len(chars) + INPUT_SLICE - 1) // INPUT_SLICE
    print(f"订购人输入框的备用字体：{len(chars)} 个常用字，{n} 片，共 {total // 1024} KB，每片约 {total // n // 1024} KB")


def main():
    ensure_source()
    if "--input" in os.sys.argv:
        build_input_slices()
    data = ROOT / "site" / "data" / "projects.json"
    if not data.exists():
        raise SystemExit("没有 site/data/projects.json，先跑 node scripts/build_site_data.mjs")
    projects = data.read_text(encoding="utf8")
    names = "".join(p["name"] for p in json.loads(projects)["projects"])
    common = read("prototype/thermal.js", "data/questionnaire/questions.json")
    result = read("prototype/result.html", "prototype/catalog.html", "prototype/sample.js", "data/usage_form.json",
                  "site/assets/result-text.js", "engine/rule-engine.js", "engine/index.js") + projects
    sets = {
        "sarasa-mono": common + read("prototype/receipt.html") + names,
        "sarasa-result": common + result,
    }
    out_dir = OUT
    # 小红书小工具版（scripts/build_xhs.mjs 调用）：三页合成一页，只用一套字体，收全部的字，
    # 再加上打包脚本里替换进页面的文字。用法：--xhs 输出目录
    if "--xhs" in os.sys.argv:
        out_dir = Path(os.sys.argv[os.sys.argv.index("--xhs") + 1])
        sets = {"sarasa": common + result + read("prototype/receipt.html", "scripts/build_xhs.mjs", "scripts/xhs/runtime.js")}
    out_dir.mkdir(parents=True, exist_ok=True)
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
            out = out_dir / f"{stem}-{weight}.woff2"
            subset.save_font(font, str(out), opts)
            print(" ", out, f"{out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
