// 小红书小工具版：把结果页的小票画成一张图，存进相册（负责人 2026-11-06 要）。
// 小工具里不能用 iframe，html2canvas 这类截图库都要克隆页面到 iframe，用不了；SVG foreignObject 在 iOS 上会让 canvas 不能导出。
// 小票本来就是等宽字符的网格，这里照页面上每个字的实际位置直接画到 canvas 上：
// 背景色（反白）、边框（订购人的下划线）、文字（字号、字重、颜色、透明度照计算样式）、下划线、SVG 里的 rect 和 path（条形码、外链箭头）。
// 只画当前看得见的部分：收起的部分不画。纸的纹理不画，底边画成锯齿。只写 ES2017。

const FONT = '"Sarasa Mono SC"';
const MAX_PIXELS = 16e6;  // iOS 的 canvas 面积上限约 1677 万像素
const MAX_SIDE = 16000;
const MARGIN = 14;        // 纸四周留的墙色
const TEETH = 8;          // 底边锯齿的宽度

const clear = (c) => !c || c === "transparent" || /rgba\([^)]*,\s*0\)$/.test(c);

function opacityOf(el, root) {
  let o = 1;
  for (let e = el; e && e !== root.parentElement; e = e.parentElement) o *= Number(getComputedStyle(e).opacity) || 0;
  return o;
}
function underlined(el, root) {
  for (let e = el; e && e !== root; e = e.parentElement) {
    const s = getComputedStyle(e);
    if (/underline/.test(s.textDecorationLine || s.textDecoration)) return true;
    if (s.display === "block") return false;
  }
  return false;
}

export function drawReceipt(root, fixedScale) {
  const box = root.getBoundingClientRect();
  const W = box.width + MARGIN * 2, H = box.height + MARGIN * 2 + TEETH;
  const scale = fixedScale || Math.min(Math.max(2, window.devicePixelRatio || 1), 3, Math.sqrt(MAX_PIXELS / (W * H)), MAX_SIDE / H, MAX_SIDE / W);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  const css = getComputedStyle(document.documentElement);
  const wall = css.getPropertyValue("--wall").trim() || "#d9d9d6";
  const paper = css.getPropertyValue("--paper").trim() || "#f6f4ee";
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, H);
  // 纸：底边是锯齿
  const x0 = MARGIN, y0 = MARGIN, x1 = MARGIN + box.width, y1 = MARGIN + box.height;
  ctx.fillStyle = paper;
  ctx.beginPath();
  ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y1);
  const n = Math.max(1, Math.round(box.width / TEETH)), step = box.width / n;
  for (let i = n; i > 0; i--) { ctx.lineTo(x0 + (i - 0.5) * step, y1 + TEETH * 0.6); ctx.lineTo(x0 + (i - 1) * step, y1); }
  ctx.closePath();
  ctx.fill();

  const ox = MARGIN - box.left, oy = MARGIN - box.top;
  const rects = (node) => Array.prototype.slice.call(node.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
  const walk = (el) => {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden") return;
    const rs = rects(el);
    if (!rs.length && el !== root) return;
    const alpha = opacityOf(el, root);
    if (!alpha) return;
    ctx.globalAlpha = alpha;
    if (!clear(s.backgroundColor) && el !== root) {
      ctx.fillStyle = s.backgroundColor;
      for (const r of rs) ctx.fillRect(r.left + ox, r.top + oy, r.width, r.height);
    }
    for (const side of ["Top", "Right", "Bottom", "Left"]) {
      const w = parseFloat(s[`border${side}Width`]);
      if (!w || s[`border${side}Style`] === "none" || clear(s[`border${side}Color`])) continue;
      ctx.fillStyle = s[`border${side}Color`];
      const r = el.getBoundingClientRect();
      if (side === "Top") ctx.fillRect(r.left + ox, r.top + oy, r.width, w);
      if (side === "Bottom") ctx.fillRect(r.left + ox, r.bottom - w + oy, r.width, w);
      if (side === "Left") ctx.fillRect(r.left + ox, r.top + oy, w, r.height);
      if (side === "Right") ctx.fillRect(r.right - w + ox, r.top + oy, w, r.height);
    }
    if (el.tagName.toLowerCase() === "svg") return drawSVG(el, s.color);
    if (el.tagName === "INPUT") {
      const r = el.getBoundingClientRect();
      setFont(s);
      ctx.fillStyle = s.color;
      ctx.textAlign = s.textAlign === "center" ? "center" : "left";
      ctx.textBaseline = "middle";
      ctx.fillText(el.value, (s.textAlign === "center" ? (r.left + r.right) / 2 : r.left) + ox, (r.top + r.bottom) / 2 + oy);
      return;
    }
    // 收起的 details 只画标题行：新内核里收起的内容仍然量得到位置，不跳过会叠在一起画出来
    const closed = el.tagName === "DETAILS" && !el.open;
    for (let c = el.firstChild; c; c = c.nextSibling) {
      if (closed && !(c.nodeType === 1 && c.tagName === "SUMMARY")) continue;
      if (c.nodeType === 1) walk(c);
      else if (c.nodeType === 3 && c.data.trim()) { ctx.globalAlpha = alpha; drawText(c, s, underlined(el, root)); }
    }
  };
  const setFont = (s) => { ctx.font = `${s.fontWeight} ${s.fontSize} ${FONT}`; };
  function drawText(node, s, line) {
    setFont(s);
    ctx.fillStyle = s.color;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const fs = parseFloat(s.fontSize), range = document.createRange(), text = node.data;
    for (let i = 0; i < text.length;) {
      const cp = text.codePointAt(i), len = cp > 0xffff ? 2 : 1, ch = text.slice(i, i + len);
      range.setStart(node, i); range.setEnd(node, i + len);
      i += len;
      const r = range.getBoundingClientRect();
      if (!r.width) continue;
      const cy = (r.top + r.bottom) / 2 + oy;
      if (ch.trim()) ctx.fillText(ch, r.left + ox, cy);
      // 下划线：CSS 写的是粗 .1em、离基线 .2em；基线约在字框中线下 .38em
      if (line) ctx.fillRect(r.left + ox, cy + fs * 0.58, r.width, Math.max(1, fs * 0.1));
    }
  }
  function drawSVG(svg, color) {
    const r = svg.getBoundingClientRect(), vb = svg.viewBox && svg.viewBox.baseVal;
    if (!vb || !vb.width || !vb.height) return;
    const sx = r.width / vb.width, sy = r.height / vb.height;
    ctx.save();
    ctx.translate(r.left + ox, r.top + oy);
    ctx.scale(sx, sy);
    ctx.translate(-vb.x, -vb.y);
    const paint = (v) => (!v || v === "currentColor" ? color : v);
    for (const shape of svg.querySelectorAll("rect, path")) {
      const fill = shape.getAttribute("fill") || svg.getAttribute("fill"), stroke = shape.getAttribute("stroke");
      if (shape.tagName.toLowerCase() === "rect") {
        const a = (k, d) => parseFloat(shape.getAttribute(k) || d);
        ctx.fillStyle = paint(fill);
        ctx.fillRect(a("x", 0), a("y", 0), a("width", vb.width), a("height", vb.height));
        continue;
      }
      const p = new Path2D(shape.getAttribute("d"));
      if (stroke && stroke !== "none") {
        ctx.strokeStyle = paint(stroke);
        ctx.lineWidth = parseFloat(shape.getAttribute("stroke-width") || 1);
        ctx.lineCap = shape.getAttribute("stroke-linecap") || "butt";
        ctx.lineJoin = shape.getAttribute("stroke-linejoin") || "miter";
        ctx.stroke(p);
      }
      if (fill !== "none" && (fill || !stroke)) { ctx.fillStyle = paint(fill); ctx.fill(p); }
    }
    ctx.restore();
  }
  walk(root);
  return canvas;
}

// 存进相册：先写成临时文件（大图建议这样），再保存。不在小红书里（电脑浏览器预览）时，在页面上盖一层显示这张图
export async function saveReceipt(root) {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  await saveImages([drawReceipt(root).toDataURL("image/png")], "小票已保存到相册。");
}

async function saveImages(urls, done) {
  const tool = window.xhs && window.xhs.miniTool;
  if (!tool || typeof tool.saveImageToPhotosAlbum !== "function") return preview(urls);
  try {
    for (const url of urls) {
      let filePath = url;
      if (typeof tool.writeTempFile === "function") filePath = (await tool.writeTempFile({ data: url })).filePath || url;
      await tool.saveImageToPhotosAlbum({ filePath });
    }
    window.alert(done);
  } catch (e) {
    window.alert("没能保存到相册。请在系统设置里允许小红书访问相册后再试。");
  }
}

// 项目清单（负责人 2026-11-06 要，网站上是下载文本）：照页面的分组和顺序，存成 4 张 3 : 4 的图（1242×1656），
// 每张两栏；读者可能把图发给 AI 识别，长图会被缩得看不清，所以不做长图（负责人定 4 张）。
// 每个项目一条：编号、名字（粗）、地址（去掉 https:// 和 www.，只在“/”后面折行），折行缩进到名字下面。
// 页码：每张顶上写“第 N/4 张”和这张的编号范围，右下角再印“N / 4”。
// 字号从 13px 往下试（画出来是 2 倍），取第一个排得下的；最小 9px 还排不下时多分一张。在页面外面排好版再画，画完就删掉
const LIST_PAGES = 4;
const PAGE_W = 621 - MARGIN * 2, PAGE_H = 828 - MARGIN * 2 - TEETH;  // 画出来 ×2 正好 1242×1656
const escHTML = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const shortURL = (u) => String(u || "").replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
const no = (k) => String(k).padStart(3, "0");
function listPage(part, from, total, page, pages, date) {
  const box = document.createElement("div");
  box.style.cssText = `position:absolute;left:-10000px;top:0;width:${PAGE_W}px;height:${PAGE_H}px;padding:20px 22px 14px;` +
    "box-sizing:border-box;display:flex;flex-direction:column;font-family:var(--font);color:var(--ink);font-weight:400";
  box.innerHTML =
    `<p style="text-align:center;font-weight:700;font-size:18px;line-height:26px">MemMatch 项目收录清单</p>` +
    `<p style="text-align:center;font-size:12px;line-height:18px">第 ${page}/${pages} 张　第 ${no(from + 1)}–${no(from + part.length)} 个，共 ${total} 个　${escHTML(date)}</p>` +
    `<div style="height:3px;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);margin:8px 0 10px"></div>` +
    `<div class="cols" style="flex:1;min-height:0;overflow:hidden;column-count:2;column-gap:18px;column-fill:auto;-webkit-column-count:2;-webkit-column-gap:18px">` +
    part.map(([name, url], k) => `<p style="break-inside:avoid;-webkit-column-break-inside:avoid;padding-left:4ch;text-indent:-4ch;` +
      `overflow-wrap:break-word;word-wrap:break-word;margin:0 0 .3em">${no(from + k + 1)} <b>${escHTML(name)}</b> ` +
      `${escHTML(shortURL(url)).replace(/\//g, "/<wbr>")}</p>`).join("") + `</div>` +
    `<div style="height:1px;background:var(--ink);margin:8px 0 6px"></div>` +
    `<p style="text-align:right;font-weight:700;font-size:20px;line-height:24px">${page} / ${pages}</p>`;
  document.body.appendChild(box);
  // 从大往小试字号：两栏装满后多出来的会排成看不见的第三栏，scrollWidth 就会变大
  const cols = box.querySelector(".cols");
  for (let fs = 13; fs >= 9; fs -= 0.5) {
    cols.style.fontSize = `${fs}px`;
    cols.style.lineHeight = `${Math.round(fs * 1.4)}px`;
    if (cols.scrollWidth <= cols.clientWidth + 1) return box;
  }
  box.remove();
  return null;
}
export async function saveList(items, date) {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  for (let n = LIST_PAGES; n <= LIST_PAGES + 4; n++) {
    const per = Math.ceil(items.length / n), urls = [];
    let ok = true;
    for (let i = 0; i < n && ok; i++) {
      const box = listPage(items.slice(i * per, (i + 1) * per), i * per, items.length, i + 1, n, date);
      if (!box) { ok = false; break; }
      try { urls.push(drawReceipt(box, 2).toDataURL("image/png")); } finally { box.remove(); }
    }
    if (ok) return saveImages(urls, `项目清单已存成 ${n} 张图片，按第 1 到第 ${n} 张的顺序保存到相册。`);
  }
  throw new Error("清单排不下");
}

function preview(urls) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:fixed;top:0;right:0;bottom:0;left:0;z-index:99;background:rgba(0,0,0,.6);overflow:auto;text-align:center;padding:16px 0";
  for (const url of urls) {
    const img = new Image();
    img.src = url;
    img.alt = "小票图片";
    img.style.cssText = "display:block;margin:0 auto 16px;width:372px;max-width:100%;";
    wrap.appendChild(img);
  }
  wrap.addEventListener("click", () => wrap.remove());
  document.body.appendChild(wrap);
}
