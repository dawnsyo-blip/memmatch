# Codex 生成 · 本地字体资源

页面不请求第三方字体服务，直接打开本地 HTML 也能加载。

| 文件 | 来源与处理 | 用途 |
|---|---|---|
| `memory-han-sans-light.woff2` | 思源黑体 CN Light，按当前样张全部文字制作子集，重命名为 Memory Han Sans | 中文标题，300 字重 |
| `memory-han-sans-regular.woff2` | 思源黑体 CN Regular，同样制作子集并重命名 | 中文正文与控件，400 字重 |
| `inter-variable.woff2` | Inter 官方可变字体，未经修改 | 英文与数字，标题 300，正文 400，少量强调 500 |

思源黑体来自 [Adobe 官方仓库](https://github.com/adobe-fonts/source-han-sans)，Inter 来自 [作者官方仓库](https://github.com/rsms/inter)。两个字体均保留原始 OFL 许可证，见 `SourceHanSans-OFL.txt`、`Inter-OFL.txt`。

中文子集修改了名称记录及 CFF 字体名，保留原始版权与许可证记录，未沿用原字体的保留名称作为子集字体名。字体仅用于本样张，不代表原作者认可或参与本项目。

从生成目录运行 `python -X utf8 build-fonts.py` 可重新下载、生成子集；需 fontTools 与 WOFF2 压缩支持。原始大字体下载到忽略的 `.font-sources/`，仅子集、Inter 和许可证进入版本控制。

源地址、文件哈希、大小、字重及字符数记录在 `manifest.json`。当前中文两份子集各约 196 KB，全部字体资源约 744 KB。修改问卷或项目文字后应重新生成子集，用户临时输入中未收录的字使用系统字体回退。
