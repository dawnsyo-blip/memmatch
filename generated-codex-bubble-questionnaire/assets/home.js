// Codex 生成 · 首页交互。
(() => {
  const UI=window.MemoryUI;
  const state=UI.readState();
  const answered=Object.values(state.answers).filter(a=>a.length).length;
  document.getElementById('project-count').textContent=`${UI.browsable.length} 个可浏览项目`;
  if(answered){
    document.getElementById('start-label').textContent=state.complete?'查看我的推荐':'继续问卷';
    document.getElementById('start-note').textContent=state.complete?'答卷已完成，可随时修改':`已保存 ${answered} 道回答`;
    document.getElementById('restart-home').hidden=false;
  }
  document.getElementById('restart-home').onclick=UI.confirmReset;
  const board=document.getElementById('memory-board');
  board.addEventListener('click',()=>{
    const on=board.getAttribute('aria-pressed')!=='true';board.setAttribute('aria-pressed',String(on));
    document.getElementById('object-message').textContent=on?'这一刻，被轻轻记住。':'一次了解，找到更合拍的记忆方式。';
  });
  if(!UI.storageAvailable) document.querySelector('.privacy-line').innerHTML=UI.icon('lock')+'回答留在本机；当前浏览器无法保存续答进度。';
})();
