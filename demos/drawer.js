// 样张共用：左上角按钮打开左侧抽屉；Esc、点遮罩、关闭按钮都能收起，收起后焦点回到按钮。
// 抽屉打开时页面其余部分设为 inert，Tab 只在抽屉里走。
// 有答卷时显示“清空答卷”（先确认），答完过的还显示“查看上次的结果”。
const KEY = "memsite-quiz-v3";
const $ = (id) => document.getElementById(id);
const btn = $("menuBtn"), drawer = $("drawer"), scrim = $("scrim");
const rest = [...document.body.children].filter((n) => n !== drawer && n.tagName !== "SCRIPT");

function setOpen(open) {
  drawer.classList.toggle("open", open);
  scrim.classList.toggle("open", open);
  btn.setAttribute("aria-expanded", open);
  drawer.inert = !open;
  for (const n of rest) n.inert = open;
  if (open) $("drawerClose").focus();
  else btn.focus();
}
btn.addEventListener("click", () => setOpen(true));
$("drawerClose").addEventListener("click", () => setOpen(false));
scrim.addEventListener("click", () => setOpen(false));
addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer.classList.contains("open")) setOpen(false); });

let saved = null;
try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
const hasAnswers = !!(saved && saved.answers && Object.keys(saved.answers).length);
if (hasAnswers && $("drawerActions")) {
  $("drawerActions").hidden = false;
  if (saved.done && $("lastResult")) $("lastResult").hidden = false;
}
$("resetBtn")?.addEventListener("click", () => {
  if (!confirm($("resetBtn").dataset.confirm || "清空已经填的答案，从第 1 题重新开始？")) return;
  try { localStorage.removeItem(KEY); } catch (e) {}
  location.reload();
});

export { hasAnswers };
