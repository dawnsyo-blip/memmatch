// 把小票原型打包成可以直接上传的静态网站，放在 dist/（不进 git，随时可以重新生成）。
// 用法：npm run build；本地预览打包结果：npm run preview，再打开 http://localhost:5174/
//
// prototype/ 里的页面从仓库各处读文件（../engine/、../site/data/、../data/），这里把它们收进 dist/，
// 并改写成 dist/ 里的路径；首页加答题 receipt.html 改名 index.html。
// 打包前先跑 build_site_data.mjs，项目数据用最新的。
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "dist");

// 源文件 → dist 里的位置
const FILES = [
  ["prototype/receipt.html", "index.html"],
  ["prototype/result.html", "result.html"],
  ["prototype/catalog.html", "catalog.html"],
  ["prototype/thermal.css", "thermal.css"],
  ["prototype/thermal.js", "thermal.js"],
  ["prototype/sample.js", "sample.js"],
  ["prototype/favicon.svg", "favicon.svg"],
  ["prototype/apple-touch-icon.png", "apple-touch-icon.png"],
  ["engine/index.js", "engine/index.js"],
  ["engine/rule-engine.js", "engine/rule-engine.js"],
  ["site/assets/result-text.js", "assets/result-text.js"],
  ["site/data/projects.json", "data/projects.json"],
  ["data/questionnaire/questions.json", "data/questions.json"],
  ["data/usage_form.json", "data/usage_form.json"],
];
const DIRS = [["prototype/fonts", "fonts"]];

// 路径改写：页面和脚本里引用仓库其它目录的地方
const REWRITE = [
  ["../site/assets/result-text.js", "./assets/result-text.js"],
  ["../site/data/projects.json", "./data/projects.json"],
  ["../data/questionnaire/questions.json", "./data/questions.json"],
  ["../data/usage_form.json", "./data/usage_form.json"],
  ["../engine/", "./engine/"],
  // result-text.js 在 assets/ 下，引擎在上一层
  ["../../engine/index.js", "../engine/index.js"],
  ["receipt.html", "./"],
];
// 只在本地开发时有用的提示，换成访客看得懂的话
const DEV_HINT = /请在项目目录运行 npm run site[^<`'"]*|请用 npm run site 打开。?/g;

console.log(execFileSync(process.execPath, [join(ROOT, "scripts/build_site_data.mjs")], { encoding: "utf8" }).trim());
rmSync(OUT, { recursive: true, force: true });

const TEXT = new Set([".html", ".js", ".css", ".json", ".svg"]);
for (const [from, to] of FILES) {
  const src = join(ROOT, from), dst = join(OUT, to);
  if (!existsSync(src)) throw new Error(`缺少 ${from}`);
  mkdirSync(dirname(dst), { recursive: true });
  if (!TEXT.has(extname(src)) || extname(src) === ".json") { cpSync(src, dst); continue; }
  let s = readFileSync(src, "utf8");
  // result-text.js 的引擎路径要先改，免得被 "../engine/" 那条先改坏
  if (from === "site/assets/result-text.js") s = s.replaceAll("../../engine/index.js", "../engine/index.js");
  else for (const [a, b] of REWRITE) s = s.replaceAll(a, b);
  s = s.replace(DEV_HINT, "请稍后刷新再试。");
  writeFileSync(dst, s);
}
for (const [from, to] of DIRS) cpSync(join(ROOT, from), join(OUT, to), { recursive: true });

// 检查：页面和脚本里不能再引用仓库里别的目录
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(OUT);
const bad = [];
for (const f of files.filter((f) => [".html", ".js", ".css"].includes(extname(f)))) {
  const s = readFileSync(f, "utf8");
  const rel = relative(OUT, f).replaceAll("\\", "/");
  for (const m of s.matchAll(/["'`(](\.\.\/[^"'`)]+)/g)) {
    if (rel === "assets/result-text.js" && m[1] === "../engine/index.js") continue;
    bad.push(`${rel}：${m[1]}`);
  }
  // 注释里提到开发用的路径没关系，只查代码和页面文字
  const code = s.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  if (/receipt\.html|prototype\/|site\/data|npm run site/.test(code)) bad.push(`${rel}：还有开发用的路径或提示`);
}
if (bad.length) throw new Error("打包后还有指向仓库其它目录的路径：\n" + bad.join("\n"));

let total = 0;
for (const f of files) total += statSync(f).size;
console.log(`已打包 ${files.length} 个文件到 dist/，共 ${(total / 1024).toFixed(0)} KB`);
