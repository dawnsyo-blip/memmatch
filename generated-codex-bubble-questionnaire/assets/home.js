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
  const bubbles=Array.from(document.querySelectorAll('.memory-board .bubble'));
  bubbles.forEach((bubble,index)=>{
    bubble.tabIndex=index===0?0:-1;
    bubble.addEventListener('focus',()=>bubbles.forEach(item=>item.tabIndex=item===bubble?0:-1));
    bubble.addEventListener('click',()=>{
      const pressed=bubble.getAttribute('aria-pressed')!=='true';
      bubble.setAttribute('aria-pressed',String(pressed));
      bubble.getAnimations().forEach(animation=>animation.cancel());
      if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
        bubble.animate(pressed?[{transform:'scale(.94)'},{transform:'scale(.85)',offset:.4},{transform:'scale(.95)'}]:[{transform:'scale(.95)'},{transform:'scale(1.04)',offset:.6},{transform:'scale(1)'}],{duration:220,easing:'cubic-bezier(.2,.7,.2,1)'});
      }
    });
    bubble.addEventListener('keydown',event=>{
      const steps={ArrowLeft:-1,ArrowRight:1,ArrowUp:-4,ArrowDown:4};
      let next;
      if(event.key==='Home')next=0;
      else if(event.key==='End')next=bubbles.length-1;
      else if(event.key in steps)next=(index+steps[event.key]+bubbles.length)%bubbles.length;
      else return;
      event.preventDefault();bubbles[next].focus({preventScroll:true});
    });
  });
  if(!UI.storageAvailable){const warning=document.getElementById('storage-warning');warning.textContent='当前浏览器无法保存答题进度，离开后将丢失回答。';warning.hidden=false;}
})();
