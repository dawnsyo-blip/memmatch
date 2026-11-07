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

export function drawReceipt(root) {
  const box = root.getBoundingClientRect();
  const W = box.width + MARGIN * 2, H = box.height + MARGIN * 2 + TEETH;
  const scale = Math.min(Math.max(2, window.devicePixelRatio || 1), 3, Math.sqrt(MAX_PIXELS / (W * H)), MAX_SIDE / H, MAX_SIDE / W);
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
  const url = drawReceipt(root).toDataURL("image/png");
  const tool = window.xhs && window.xhs.miniTool;
  if (!tool || typeof tool.saveImageToPhotosAlbum !== "function") return preview(url);
  try {
    let filePath = url;
    if (typeof tool.writeTempFile === "function") filePath = (await tool.writeTempFile({ data: url })).filePath || url;
    await tool.saveImageToPhotosAlbum({ filePath });
    window.alert("小票已保存到相册。");
  } catch (e) {
    window.alert("没能保存到相册。请在系统设置里允许小红书访问相册后再试。");
  }
}

function preview(url) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:fixed;top:0;right:0;bottom:0;left:0;z-index:99;background:rgba(0,0,0,.6);overflow:auto;text-align:center;padding:16px 0";
  const img = new Image();
  img.src = url;
  img.alt = "推荐结果小票";
  img.style.cssText = "width:372px;max-width:100%;";
  wrap.appendChild(img);
  wrap.addEventListener("click", () => wrap.remove());
  document.body.appendChild(wrap);
}
