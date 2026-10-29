// Codex 生成 · 首页交互。
(() => {
  const UI=window.MemoryUI;
  const state=UI.readState();
  const answered=Object.values(state.answers).filter(a=>a.length).length;
  if(answered){
    document.getElementById('start-label').textContent=state.complete?'查看我的推荐':'继续问卷';
    document.getElementById('restart-home').hidden=false;
  }
  document.getElementById('restart-home').onclick=UI.confirmReset;
  if(!UI.storageAvailable){const warning=document.getElementById('storage-warning');warning.textContent='当前浏览器无法保存答题进度，离开后将丢失回答。';warning.hidden=false;}
})();
