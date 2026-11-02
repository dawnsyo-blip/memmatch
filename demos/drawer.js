// 样张共用：左上角按钮打开左侧抽屉；Esc、点遮罩、关闭按钮都能收起，收起后焦点回到按钮。
// 抽屉打开时页面其余部分设为 inert，Tab 键只在抽屉里走。
(function () {
  const btn = document.getElementById("menuBtn");
  const drawer = document.getElementById("drawer");
  const scrim = document.getElementById("scrim");
  if (!btn || !drawer) return;
  const others = () => [...document.body.children].filter((n) => n !== drawer && n.tagName !== "SCRIPT");

  function setOpen(open) {
    drawer.classList.toggle("open", open);
    scrim.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open);
    drawer.inert = !open;
    for (const n of others()) n.inert = open;
    if (open) document.getElementById("drawerClose").focus();
    else btn.focus();
  }
  btn.addEventListener("click", () => setOpen(true));
  document.getElementById("drawerClose").addEventListener("click", () => setOpen(false));
  scrim.addEventListener("click", () => setOpen(false));
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("open")) setOpen(false);
  });
})();
