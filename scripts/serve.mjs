// 本地预览网站：node scripts/serve.mjs [端口]，然后打开 http://localhost:5173/site/
// 网站要读取 data/ 下的问卷配置、import engine/ 的代码，直接双击 html 打开时浏览器会拦住（file:// 不能 fetch），所以需要这个小服务器。
// 以仓库根目录为网站根目录，只读文件，没有第三方依赖。
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PORT = Number(process.argv[2]) || 5173;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".webp": "image/webp", ".otf": "font/otf", ".woff2": "font/woff2", ".md": "text/markdown; charset=utf-8",
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (path === "/") { res.writeHead(302, { Location: "/site/" }); return res.end(); }
    let file = normalize(join(ROOT, path));
    if (!file.startsWith(normalize(ROOT))) { res.writeHead(403); return res.end(); }   // 不允许跳出仓库目录
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("没有这个文件");
  }
}).listen(PORT, () => console.log(`网站预览：http://localhost:${PORT}/site/`));
