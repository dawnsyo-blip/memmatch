// 把小票原型打包成小红书“小工具”的上传包：dist-xhs/ 是包里的内容，dist-xhs.zip 是要上传的文件（都不进 git）。
// 用法：npm run build:xhs
//
// 小工具的规矩（据小红书的 minitool-zip-builder skill，放在 .claude/skills/minitool-zip-builder/，和在线文档
// https://miniapp-sandbox.xiaohongshu.com/minitool/doc）：只能有一个 index.html；脚本必须是包里的外部文件、不能是 module；
// 不能联网（fetch 包里的文件也不行）、不能下载文件、不能开外链；JS 和 CSS 要兼容 Chrome 61；字体只能用包里的。
// 所以这里：
// - 三页（receipt.html、result.html、catalog.html）的内嵌脚本各包成一个 run() 函数，和页面的 HTML、样式一起交给
//   scripts/xhs/runtime.js，由它在同一个页面里换内容；
// - 用 esbuild 打成一个经典脚本 app.js，语法降到 Chrome 61，location、fetch、localStorage、sessionStorage 换成运行时的替身；
// - 问卷配置、项目数据、usage_form 写进 data.js；
// - 字体只用一套，收三页全部的字（subset_receipt_font.py --xhs），不带“订购人”输入框的备用切片；
// - 下载按钮去掉（PATCHES），外链由运行时拦下。原型本身不改。
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync, crc32 } from "node:zlib";
import * as esbuild from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "dist-xhs");
const ZIP = join(ROOT, "dist-xhs.zip");
const TMP = join(ROOT, "cache", "xhs-build");
const SKILL = join(ROOT, ".claude", "skills", "minitool-zip-builder");
const slash = (p) => p.replaceAll("\\", "/");

const PAGES = ["receipt", "result", "catalog"];

// 原型里小工具用不了的地方，按原文替换。每条必须正好命中（count 次，默认 1 次），原型改了这里会报错，提醒同步
const PATCHES = {
  receipt: [
    // 调试面板只在 ?debug 时出现，里面用了剪贴板；直接去掉
    ["if (new URLSearchParams(location.search).has('debug')) {", "if (false) {"],
  ],
  result: [
    // “自助服务”的两个下载换成“保存小票图片”（存进相册，scripts/xhs/snapshot.js，点击由 runtime.js 处理），重新编号
    ['  act(1, "下载历史选择", "↓", \'type="button" id="saveAnswers"\') +\n' +
     '  act(2, "下载推荐结果", "↓", \'type="button" id="saveResults"\') +\n' +
     '  act(3, "返回修改问卷", "→", \'href="receipt.html"\') +\n' +
     '  act(4, "查看项目清单", "→", \'href="catalog.html"\') + `</div>` +',
     '  act(1, "保存小票图片", "↓", \'type="button" id="saveImage"\') +\n' +
     '  act(2, "返回修改问卷", "→", \'href="receipt.html"\') +\n' +
     '  act(3, "查看项目清单", "→", \'href="catalog.html"\') + `</div>` +'],
    [/\/\* ---------- 下载 ---------- \*\/[\s\S]*?saveText\(out, `记忆库推荐结果-\$\{now\.date\}\.txt`\);\n\}\);/, ""],
    ["历史选择只保存在您的浏览器中", "历史选择只保存在您的手机上"],
    [' target="_blank" rel="noopener"', "", 3],
  ],
  catalog: [
    // “下载项目清单”改成“保存清单图片”：名字和地址排成几张小票图存进相册（scripts/xhs/snapshot.js 的 saveList）
    ['act(2, "下载项目清单", "↓", \'type="button" id="listBtn"\')', 'act(2, "保存清单图片", "↓", \'type="button" id="listBtn"\')'],
    [/\/\/ 下载项目清单[\s\S]*?setTimeout\(\(\) => URL\.revokeObjectURL\(url\), 1000\);\n\}\);/,
     'let savingList = false;\n' +
     'document.getElementById("listBtn").addEventListener("click", () => {\n' +
     '  if (savingList) return;\n' +
     '  savingList = true;\n' +
     '  const all = [...groups.values(), other].flat();\n' +
     '  window.__MM.saveList(all.map((p) => [splitName(p.name)[0], p.repo_url]), now.date)\n' +
     '    .catch(() => window.alert("没能生成清单图片。")).then(() => { savingList = false; });\n' +
     '});'],
    [' target="_blank" rel="noopener"', "", 2],
  ],
};
// 只在本地开发时有用的提示，换成访客看得懂的话（和 build_dist.mjs 一样）
const DEV_HINT = /请在项目目录运行 npm run site[^<`'"]*|请用 npm run site 打开。?/g;

function patch(page, s) {
  for (const [from, to, count = 1] of PATCHES[page] || []) {
    const n = typeof from === "string" ? s.split(from).length - 1 : (s.match(new RegExp(from, "g")) || []).length;
    if (n !== count) throw new Error(`${page}.html 的替换没对上（应命中 ${count} 次，实际 ${n} 次）：\n${String(from).slice(0, 120)}`);
    s = typeof from === "string" ? s.replaceAll(from, to) : s.replace(from, to);
  }
  return s.replace(DEV_HINT, "请稍后重新打开小工具再试。");
}

// ---------- CSS：降到 Chrome 61 ----------
async function lowerCSS(css) {
  css = (await esbuild.transform(css, { loader: "css", target: ["chrome61"] })).code; // 会展开 inset
  // padding-block、margin-block 是 Chrome 87 才有的：前面补上下两条（原型里都只写一个值）
  css = css.replace(/(^|[;{\s])(padding|margin)-block:\s*([^;}]+);/g, (m, pre, prop, v) => {
    let flat = v.trim();
    while (/\([^()]*\)/.test(flat)) flat = flat.replace(/\([^()]*\)/g, "");
    if (/\s/.test(flat)) throw new Error(`${prop}-block 写了两个值，要手动处理：${v}`);
    return `${pre}${prop}-top: ${v}; ${prop}-bottom: ${v};`;
  });
  // 带 :focus-visible 的选择器列表在 Chrome 61 里整条规则作废：拆成两条，其它选择器照常生效
  css = css.replace(/(^|[{}])(\s*)([^{}@]*:focus-visible[^{}]*)\{([^{}]*)\}/g, (m, pre, ws, sel, body) => {
    const parts = sel.split(",").map((x) => x.trim()).filter(Boolean);
    const plain = parts.filter((x) => !x.includes(":focus-visible"));
    if (!plain.length || plain.length === parts.length) return m;
    return `${pre}${ws}${plain.join(", ")} {${body}}\n${parts.filter((x) => x.includes(":focus-visible")).join(", ")} {${body}}`;
  });
  return css;
}

// ---------- 页面拆分 ----------
function splitPage(name) {
  const html = patch(name, readFileSync(join(ROOT, "prototype", `${name}.html`), "utf8"));
  const pick = (re, what) => {
    const m = html.match(re);
    if (!m) throw new Error(`${name}.html 里找不到${what}`);
    return m[1];
  };
  const title = pick(/<title>([^<]*)<\/title>/, "标题");
  // 页面样式，去掉 @font-face（字体在 index.html 里统一声明）
  const css = pick(/<style>([\s\S]*?)<\/style>/, "样式").replace(/^@font-face[^\n]*\n/gm, "");
  const body = pick(/<body>([\s\S]*?)<script type="module">/, "页面内容");
  let script = pick(/<script type="module">([\s\S]*?)<\/script>/, "脚本");
  // 开头的 import 语句留在模块顶层，路径改成绝对路径；其余代码包进 run()
  const imports = [];
  const re = /\s*import\s+[\s\S]*?\s+from\s*["']([^"']+)["'];?/y;
  let m, end = 0;
  while ((m = re.exec(script))) {
    imports.push(m[0].replace(m[1], slash(resolve(ROOT, "prototype", m[1]))).trim());
    end = re.lastIndex;
  }
  script = script.slice(end);
  if (/^\s*import\s/m.test(script)) throw new Error(`${name}.html 的脚本中间还有 import 语句`);
  script = script.replace(/import\(\s*(['"])(\.[^'"]+)\1\s*\)/g, (_, q, p) => `import(${q}${slash(resolve(ROOT, "prototype", p))}${q})`);
  const mod = `${imports.join("\n")}\nexport default async function __mmPage() {\n${script}\n}\n`;
  return { title, css, body, mod };
}

// ---------- zip（index.html 在根目录，不套一层文件夹） ----------
function zipDir(dir, out) {
  const files = walk(dir).sort();
  const local = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(slash(relative(dir, f)), "utf8");
    const raw = readFileSync(f), data = deflateRawSync(raw, { level: 9 }), crc = crc32(raw);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x0800, 6); head.writeUInt16LE(8, 8);
    head.writeUInt32LE(0, 10); head.writeUInt32LE(crc >>> 0, 14); head.writeUInt32LE(data.length, 18);
    head.writeUInt32LE(raw.length, 22); head.writeUInt16LE(name.length, 26); head.writeUInt16LE(0, 28);
    local.push(head, name, data);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10);
    c.writeUInt32LE(0, 12); c.writeUInt32LE(crc >>> 0, 16); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(raw.length, 24);
    c.writeUInt16LE(name.length, 28); c.writeUInt32LE(offset, 42);
    central.push(c, name);
    offset += 30 + name.length + data.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  writeFileSync(out, Buffer.concat([...local, cd, end]));
}
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));

// ---------- 打包 ----------
console.log(execFileSync(process.execPath, [join(ROOT, "scripts/build_site_data.mjs")], { encoding: "utf8" }).trim());
rmSync(OUT, { recursive: true, force: true });
rmSync(TMP, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const pages = {};
for (const name of PAGES) {
  pages[name] = splitPage(name);
  writeFileSync(join(TMP, `${name}.js`), pages[name].mod);
}
let entry = `import ${JSON.stringify(slash(join(ROOT, "scripts/xhs/runtime.js")))};\n`;
for (const name of PAGES) entry += `import ${name} from "./${name}.js";\n`;
entry += "window.__MM.start({\n";
for (const name of PAGES) {
  const p = pages[name];
  entry += `  ${name}: { run: ${name}, title: ${JSON.stringify(p.title)}, html: ${JSON.stringify(p.body)}, css: ${JSON.stringify(await lowerCSS(p.css))} },\n`;
}
entry += "});\n";
writeFileSync(join(TMP, "entry.js"), entry);

await esbuild.build({
  entryPoints: [join(TMP, "entry.js")],
  outfile: join(OUT, "app.js"),
  bundle: true,
  format: "iife",
  target: ["es2017", "chrome61", "safari18"],
  minify: true,
  charset: "utf8",
  legalComments: "none",
  logLevel: "warning",
  define: {
    location: "__MM.loc",
    fetch: "__MM.getData",
    localStorage: "__MM.ls",
    sessionStorage: "__MM.ss",
    "import.meta.url": JSON.stringify("http://memmatch.local/prototype/page.js"),
  },
});

// 数据：存成 JSON 文本，用的时候再解析
const DATA = {
  "questions.json": "data/questionnaire/questions.json",
  "projects.json": "site/data/projects.json",
  "usage_form.json": "data/usage_form.json",
};
writeFileSync(join(OUT, "data.js"), "window.__MM_DATA = {\n" +
  Object.entries(DATA).map(([k, f]) => `${JSON.stringify(k)}: ${JSON.stringify(JSON.stringify(JSON.parse(readFileSync(join(ROOT, f), "utf8"))))}`).join(",\n") + "\n};\n");

// 共用样式；纸宽原来用 min()（Chrome 79 起），换成等价的媒体查询：340 + 32 = 372px 以上固定 340px
let thermal = readFileSync(join(ROOT, "prototype/thermal.css"), "utf8");
const PAPER = "--paper-w: min(340px, calc(100vw - 32px));";
if (thermal.split(PAPER).length !== 2) throw new Error("thermal.css 的纸宽写法变了，要同步 build_xhs.mjs");
thermal = thermal.replace(PAPER, "--paper-w: calc(100vw - 32px);") + "\n@media (min-width: 372px) { :root { --paper-w: 340px; } }\n";
writeFileSync(join(OUT, "thermal.css"), await lowerCSS(thermal));

// 字体
execFileSync("python", ["-X", "utf8", join(ROOT, "scripts/subset_receipt_font.py"), "--xhs", join(OUT, "fonts")], { stdio: "inherit" });

writeFileSync(join(OUT, "index.html"), `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>MemMatch</title>
<style>
@font-face { font-family: "Sarasa Mono SC"; src: url("./fonts/sarasa-400.woff2") format("woff2"); font-weight: 400; font-display: block; }
@font-face { font-family: "Sarasa Mono SC"; src: url("./fonts/sarasa-700.woff2") format("woff2"); font-weight: 700; font-display: block; }
html { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
body { -webkit-touch-callout: none; }
</style>
<link rel="stylesheet" href="./thermal.css">
<style id="page-style"></style>
<script src="./data.js" defer></script>
<script src="./app.js" defer></script>
</head>
<body></body>
</html>
`);

// ---------- 检查：小工具禁用的写法不能留在包里 ----------
const FORBID = [
  [/\bfetch\s*\(/, "fetch"], [/XMLHttpRequest|new WebSocket|EventSource|RTCPeerConnection/, "联网"],
  [/navigator\.clipboard|execCommand/, "剪贴板"], [/window\.open\s*\(|\.prompt\s*\(/, "新窗口"],
  [/target=\\?["']_blank/, "外链新窗口"], [/\bdownload\s*[:=]|createObjectURL/, "下载"],
  [/\beval\s*\(|new Function\s*\(|WebAssembly/, "动态执行"], [/import\.meta|\bimport\s*\(|^\s*(import|export)\s/m, "模块语法"],
  [/\(\?<[=!]|\\p\{/, "Chrome 61 不认的正则"], [/new Worker|serviceWorker|geolocation|requestFullscreen/, "禁用能力"],
  [/[^.\w$]location\.(href|search|replace|assign|reload)/, "直接用 location"],
];
const files = walk(OUT);
const bad = [];
for (const f of files) {
  const rel = slash(relative(OUT, f));
  if (!/\.(html|js|css)$/.test(rel)) continue;
  const s = readFileSync(f, "utf8");
  if (rel === "data.js") continue; // 只有数据
  for (const [re, what] of FORBID) if (re.test(s)) bad.push(`${rel}：${what}（${s.match(re)[0]}）`);
  if (/\.(html|css)$/.test(rel) && /(src|href)=["']?https?:|url\(["']?https?:|<script(?![^>]*\ssrc=)[^>]*>/.test(s)) bad.push(`${rel}：外部资源或内联脚本`);
}
if (bad.length) throw new Error("包里还有小工具不允许的写法：\n" + bad.join("\n"));

zipDir(OUT, ZIP);
let total = 0;
for (const f of files) total += statSync(f).size;
console.log(`已打包 ${files.length} 个文件到 dist-xhs/，共 ${(total / 1024).toFixed(0)} KB；上传包 dist-xhs.zip ${(statSync(ZIP).size / 1024).toFixed(0)} KB`);
if (existsSync(SKILL)) {
  for (const target of [OUT, ZIP]) {
    console.log(execFileSync(process.execPath, [join(SKILL, "scripts/audit_artifact.mjs"), target], { encoding: "utf8" }).trim());
  }
}
