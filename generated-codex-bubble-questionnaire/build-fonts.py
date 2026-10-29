"""Codex 生成：下载官方字体，按本样张实际文字生成本地中文子集。"""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from pathlib import Path
import json
import os
import time
import urllib.request

from fontTools import subset
from fontTools.ttLib import TTFont

HERE = Path(__file__).resolve().parent
CACHE = HERE / ".font-sources"
OUTPUT = HERE / "assets" / "fonts"
CACHE.mkdir(exist_ok=True)
OUTPUT.mkdir(parents=True, exist_ok=True)
SOURCES = {
    "SourceHanSansCN-Light.otf": "https://raw.githubusercontent.com/adobe-fonts/source-han-sans/release/SubsetOTF/CN/SourceHanSansCN-Light.otf",
    "SourceHanSansCN-Regular.otf": "https://raw.githubusercontent.com/adobe-fonts/source-han-sans/release/SubsetOTF/CN/SourceHanSansCN-Regular.otf",
    "InterVariable.woff2": "https://raw.githubusercontent.com/rsms/inter/master/docs/font-files/InterVariable.woff2",
    "SourceHanSans-OFL.txt": "https://raw.githubusercontent.com/adobe-fonts/source-han-sans/master/LICENSE.txt",
    "Inter-OFL.txt": "https://raw.githubusercontent.com/rsms/inter/master/LICENSE.txt",
}
proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY")
opener = urllib.request.build_opener(urllib.request.ProxyHandler({"https": proxy, "http": proxy})) if proxy else urllib.request.build_opener()


def download(item):
    name, url = item
    target = CACHE / name
    if target.is_file() and target.stat().st_size:
        return name, target
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "MemoryQuestionnaireFontBuilder/1.0"})
            with opener.open(request, timeout=45) as response:
                data = response.read()
            if not data:
                raise ValueError("Empty font download")
            target.write_bytes(data)
            print(f"Downloaded {name}: {len(data):,} bytes", flush=True)
            return name, target
        except Exception:
            if attempt == 2:
                raise
            time.sleep(attempt + 1)


with ThreadPoolExecutor(max_workers=2) as pool:
    local = dict(pool.map(download, SOURCES.items()))

# 包括首页、所有动态题目、项目目录及推荐文案，避免只覆盖首屏。
content_files = list(HERE.glob("*.html")) + list((HERE / "assets").glob("*.js"))
corpus = "".join(file.read_text(encoding="utf-8") for file in content_files)
corpus += "".join(chr(code) for code in range(32, 127))
characters = set(corpus)
manifest = {"sources": SOURCES, "corpus_characters": len(characters), "fonts": []}

for weight in ("Light", "Regular"):
    source = local[f"SourceHanSansCN-{weight}.otf"]
    font = TTFont(source)
    available = set(font.getBestCmap())
    # 修改字体后改名，原始版权与 OFL 许可记录保持原样。
    rename_ids = {1, 2, 3, 4, 6, 16, 17, 21, 22}
    font["name"].names = [record for record in font["name"].names if record.nameID not in rename_ids]
    names = {1: "Memory Han Sans", 2: weight, 3: f"MemoryHanSans-{weight}-Subset-1",
             4: f"Memory Han Sans {weight}", 6: f"MemoryHanSans-{weight}",
             16: "Memory Han Sans", 17: weight}
    for name_id, value in names.items():
        font["name"].setName(value, name_id, 3, 1, 0x409)
        font["name"].setName(value, name_id, 1, 0, 0)
    if "CFF " in font:
        cff = font["CFF "].cff
        cff.fontNames = [f"MemoryHanSans-{weight}"]
        cff.topDictIndex[0].FamilyName = "Memory Han Sans"
        cff.topDictIndex[0].FullName = f"Memory Han Sans {weight}"
    options = subset.Options()
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.name_legacy = True
    options.recalc_timestamp = False
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=corpus)
    subsetter.subset(font)
    font.flavor = "woff2"
    target = OUTPUT / f"memory-han-sans-{weight.lower()}.woff2"
    font.save(target)
    loaded = TTFont(target)
    assert set(loaded.getBestCmap()) >= ({ord(char) for char in characters} & available)
    data = target.read_bytes()
    manifest["fonts"].append({"file": target.name, "weight": loaded["OS/2"].usWeightClass,
                               "bytes": len(data), "sha256": sha256(data).hexdigest(),
                               "source_sha256": sha256(source.read_bytes()).hexdigest(),
                               "characters": len(loaded.getBestCmap())})
    print(f"Generated {target.name}: {len(data):,} bytes", flush=True)

for source_name, output_name in [("InterVariable.woff2", "inter-variable.woff2"),
                                 ("SourceHanSans-OFL.txt", "SourceHanSans-OFL.txt"),
                                 ("Inter-OFL.txt", "Inter-OFL.txt")]:
    (OUTPUT / output_name).write_bytes(local[source_name].read_bytes())
inter = TTFont(OUTPUT / "inter-variable.woff2")
assert any(axis.axisTag == "wght" for axis in inter["fvar"].axes)
manifest["fonts"].append({"file": "inter-variable.woff2", "bytes": (OUTPUT / "inter-variable.woff2").stat().st_size,
                           "sha256": sha256((OUTPUT / "inter-variable.woff2").read_bytes()).hexdigest()})
(OUTPUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Local font assets ready. Original project materials were read-only.", flush=True)
