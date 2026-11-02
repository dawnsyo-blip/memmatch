/* 深色（星空）/ 浅色（纸面）切换。默认深色；选择存在浏览器里，各页面共用。
   页面 <head> 里还有一小段内联脚本，在画面出来之前先加上 theme-dark，避免闪一下浅色。 */
(() => {
  const KEY = "memsite-theme";
  const root = document.documentElement;
  const buttons = document.querySelectorAll("[data-theme-set]");
  const sync = () => {
    const dark = root.classList.contains("theme-dark");
    buttons.forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.themeSet === "dark") === dark)));
  };
  buttons.forEach((b) => b.addEventListener("click", () => {
    root.classList.toggle("theme-dark", b.dataset.themeSet === "dark");
    try { localStorage.setItem(KEY, b.dataset.themeSet); } catch (e) {}
    sync();
    document.dispatchEvent(new Event("themechange"));
  }));
  sync();
})();
