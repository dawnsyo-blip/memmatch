/* 左上角菜单打开的侧边导航（结果页等用；答题页的同一段逻辑在 quiz.js 里） */
(() => {
  const $ = (id) => document.getElementById(id);
  const btn = $("menuBtn"), drawer = $("drawer"), scrim = $("scrim");
  if (!btn || !drawer) return;
  function setMenu(open) {
    drawer.classList.toggle("open", open); scrim.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open); drawer.inert = !open;
    if (open) drawer.querySelector("a").focus(); else btn.focus();
  }
  btn.addEventListener("click", () => setMenu(true));
  $("drawerClose").addEventListener("click", () => setMenu(false));
  scrim.addEventListener("click", () => setMenu(false));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer.classList.contains("open")) setMenu(false); });
})();
