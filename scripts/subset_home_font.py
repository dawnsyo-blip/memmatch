"""首页中文子集字体：只含首页用到的汉字和标点，几十 KB。

用法：python -X utf8 scripts/subset_home_font.py [页面路径，默认 demos/home.html]
从页面 <body> 里（不含脚本）收集汉字，向 Google Fonts 要 Noto Serif SC（即思源宋体）的子集 woff2，
存为页面旁边的 fonts/home-zh-400.woff2、home-zh-600.woff2。改了首页的中文后重跑一次。
"""
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
page = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "demos" / "home.html"
out_dir = page.parent / "fonts"
out_dir.mkdir(exist_ok=True)

# 代理只设了 HTTP_PROXY 时，https 也走它
if os.environ.get("HTTP_PROXY") and not os.environ.get("HTTPS_PROXY"):
    os.environ["HTTPS_PROXY"] = os.environ["HTTP_PROXY"]

html = page.read_text(encoding="utf8")
body = html.split("<body>", 1)[1]
body = re.sub(r"<script[\s\S]*?</script>", "", body)
text = re.sub(r"<[^>]+>", "", body)
chars = "".join(dict.fromkeys(c for c in text if ord(c) > 0x2E80)) + "，。、：；“”"
chars = "".join(dict.fromkeys(chars))
print(f"{len(chars)} 个字符")

# 新版浏览器的 UA 才会拿到 woff2
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


for weight in (400, 600):
    css_url = ("https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@%d&text=%s"
               % (weight, urllib.parse.quote(chars)))
    css = get(css_url).decode("utf8")
    urls = re.findall(r"url\((https://[^)]+)\)", css)
    assert len(urls) == 1, css
    data = get(urls[0])
    dest = out_dir / f"home-zh-{weight}.woff2"
    dest.write_bytes(data)
    print(f"{dest.relative_to(ROOT)}  {len(data) // 1024} KB")
