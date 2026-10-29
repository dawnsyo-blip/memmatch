// Codex 生成 · 图标、独立本地存储和弹窗。
(() => {
  'use strict';
  const paths = {
    arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>', back:'<path d="M20 12H5m6-6-6 6 6 6"/>',
    diagonal:'<path d="M6 18 18 6M7 6h11v11"/>',check:'<path d="m5 12 4 4L19 6"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-10h.01"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    spark:'<path d="M12 3c0 6-3 9-9 9 6 0 9 3 9 9 0-6 3-9 9-9-6 0-9-3-9-9Z"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',up:'<path d="m6 14 6-6 6 6"/>',down:'<path d="m6 10 6 6 6-6"/>',grip:'<path d="M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01" stroke-width="3"/>',
    phone:'<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10 5h4m-3 13.5h2"/>',
    android:'<rect x="5" y="8" width="14" height="12" rx="3"/><path d="M8 8V6a4 4 0 0 1 8 0v2M7 3 5.5 1.5M17 3l1.5-1.5M9 12h.01M15 12h.01"/>',
    monitor:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M12 17v4m-5 0h10M3 13h18"/>',
    laptop:'<rect x="5" y="3" width="14" height="13" rx="2"/><path d="m5 16-3 4h20l-3-4M10 7h4"/>',
    terminal:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 9 3 3-3 3m6 0h4"/>',
    server:'<rect x="4" y="3" width="16" height="7" rx="2"/><rect x="4" y="14" width="16" height="7" rx="2"/><path d="M8 6.5h.01M8 17.5h.01M12 6.5h4m-4 11h4"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4"/>'
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const key = 'codex-memory-between-quiz-v6';
  const {questionnaire, projects} = window.MemoryData;
  let storageAvailable = true;
  try { localStorage.setItem('codex-memory-between-probe','1'); localStorage.removeItem('codex-memory-between-probe'); } catch { storageAvailable = false; }
  const emptyState = () => ({version:questionnaire.version,answers:{},free:{},seen:{},current:questionnaire.questions[0].id,complete:false});
  function readState() {
    const clean = emptyState();
    try {
      const s = JSON.parse(localStorage.getItem(key));
      if (!s || s.version !== questionnaire.version) return clean;
      for (const q of questionnaire.questions) {
        const ids = Array.isArray(s.answers?.[q.id]) ? s.answers[q.id] : [];
        const known = [...new Set(ids.filter(id => q.options.some(o => o.id === id)))];
        const exclusive = known.find(id => q.options.find(o => o.id === id).exclusive);
        clean.answers[q.id] = exclusive ? [exclusive] : q.type === 'single' ? known.slice(0,1) : known;
        if (s.seen?.[q.id] === true) clean.seen[q.id] = true;
        for (const opt of q.options.filter(o => o.free_text)) {
          const value = s.free?.[`${q.id}.${opt.id}`];
          if (typeof value === 'string') clean.free[`${q.id}.${opt.id}`] = value.slice(0,300);
        }
      }
      if (questionnaire.questions.some(q => q.id === s.current)) clean.current = s.current;
      clean.complete = s.complete === true;
      return clean;
    } catch {return clean;}
  }
  function writeState(state) {
    try { localStorage.setItem(key,JSON.stringify(state)); return true; }
    catch {storageAvailable = false;return false;}
  }
  let toastTimer;
  function toast(message) {
    const el = document.getElementById('toast');
    el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,3600);
  }
  function paintIcons(root=document) {root.querySelectorAll('[data-icon]').forEach(el => el.innerHTML=icon(el.dataset.icon));}
  function infoButton(id,title,content,className='') {
    return `<span class="info-slot ${className}"><button class="info-trigger" type="button" popovertarget="info-${escape(id)}" aria-label="${escape(title)}" aria-controls="info-${escape(id)}" aria-expanded="false">${icon('info')}</button><span class="info-popover" id="info-${escape(id)}" popover="auto" role="tooltip"><strong>${escape(title)}</strong>${escape(content)}</span></span>`;
  }
  function bindInfo(root=document) {
    root.querySelectorAll('.info-popover').forEach(popover=>{
      if(popover.dataset.bound)return;popover.dataset.bound='true';
      const trigger=root.querySelector(`[popovertarget="${popover.id}"]`);
      popover.addEventListener('toggle',event=>{
        const open=event.newState==='open';trigger?.setAttribute('aria-expanded',String(open));
        if(!open||!trigger)return;
        const body=document.body.getBoundingClientRect(),anchor=trigger.getBoundingClientRect();
        const width=Math.min(330,body.width-32);popover.style.width=width+'px';
        const height=popover.getBoundingClientRect().height;
        const viewport=window.visualViewport;
        const viewTop=viewport?.offsetTop||0,viewBottom=viewTop+(viewport?.height||innerHeight);
        const left=Math.max(body.left+16,Math.min(anchor.left+anchor.width/2-width/2,body.right-width-16));
        const below=anchor.bottom+8;
        const top=Math.max(viewTop+12,Math.min(below+height<viewBottom-12?below:anchor.top-height-8,viewBottom-height-12));
        popover.style.left=left+'px';popover.style.top=top+'px';
      });
    });
  }
  let priorFocus;
  function dialog(title, content, setup) {
    document.getElementById('app-dialog')?.close();
    const root=document.getElementById('modal-root');
    priorFocus=document.activeElement;
    root.innerHTML=`<dialog class="dialog" id="app-dialog" aria-labelledby="dialog-title"><div class="dialog-top"><h2 id="dialog-title">${escape(title)}</h2><button class="round-button close-dialog" aria-label="关闭弹窗">${icon('close')}</button></div>${content}</dialog>`;
    const el=root.firstElementChild;
    el.querySelector('.close-dialog').onclick=()=>el.close();
    el.addEventListener('click',event=> {if(event.target===el){const rect=el.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)el.close();}});
    el.addEventListener('close',()=>{document.body.style.overflow='';priorFocus?.focus();});
    document.body.style.overflow='hidden';el.showModal();setup?.(el);bindInfo(el);return el;
  }
  function confirmReset() {
    dialog('重新开始？','<p>将清除此浏览器中已保存的答卷，无法恢复。</p><div class="dialog-actions"><button class="secondary-button" id="keep-progress">取消</button><button class="primary-button" id="confirm-reset">清除并重新开始</button></div>',el=>{
      el.querySelector('#keep-progress').onclick=()=>el.close();
      el.querySelector('#confirm-reset').onclick=()=>{writeState(emptyState());location.href='quiz.html';};
    });
  }
  const browsable = projects.filter(p=>['included','flagged'].includes(p.inclusion?.status));
  function repoLink(url) {try {const u=new URL(url);return ['https:','http:'].includes(u.protocol)?escape(u.href):null;} catch{return null;}}
  function openCatalog() {
    dialog('项目',`<label for="catalog-search" class="sr-only">搜索项目名称或简介</label><input class="search-field" id="catalog-search" name="project-search" autocomplete="off" placeholder="搜索项目…"><div class="catalog-heading"><p class="catalog-meta" id="catalog-count" aria-live="polite"></p>${infoButton('catalog-source','资料来源','依据 2026 年 10 月的 README 和代码仓库整理，未经实际安装验证。')}</div><div class="catalog-list" id="catalog-list"></div>`,el=>{
      const draw=(query='')=>{
        const list=browsable.filter(p=>(p.name+' '+(p.info?.summary?.value||'')).toLowerCase().includes(query.toLowerCase().trim()));
        el.querySelector('#catalog-count').textContent=`${list.length} 个项目`;
        el.querySelector('#catalog-list').innerHTML=list.length?list.map(p=>{const url=repoLink(p.repo_url);return `<article class="catalog-item">${url?`<a href="${url}" target="_blank" rel="noopener noreferrer">${escape(p.name)}${icon('diagonal')}</a>`:`<strong>${escape(p.name)}</strong>`}<p>${escape(p.info?.summary?.value||'项目说明尚待补充。')}</p>${p.review_status!=='reviewed'||p.inclusion?.status==='flagged'?`<span class="catalog-status">${p.review_status!=='reviewed'?'社区推荐 · 未审核':''}${p.inclusion?.status==='flagged'?' 请留意使用风险':''}</span>`:''}</article>`;}).join(''):'<p>没有匹配的项目。</p>';
      };
      draw();el.querySelector('#catalog-search').addEventListener('input',e=>draw(e.target.value));
    });
  }
  function about() {
    dialog('在对话之间，留住重要的事',`<p>这份问卷帮助已经使用个人 AI 助手的人，找到能接入现有助手、装得起来，也符合自己习惯的开源记忆项目。</p><h3>先看能不能用，再看合不合适</h3><p>根据设备、入口与安装条件筛选，再按您对记忆录入、整理、遗忘和检索的偏好排序。每个推荐附上理由和使用提醒。</p><h3>您的答卷，留在您的浏览器</h3><p>无需登录。回答与推荐计算都在本机完成，不向服务器提交答卷。本地保存成功时，可以离开后继续；清除浏览器数据也会清除进度。</p><h3>如实说明资料的边界</h3><p>项目信息依据 README 和代码仓库整理，未经实际安装验证。页面使用 2026 年 10 月的项目资料快照，项目能力、维护情况与费用可能变化，请以项目最新说明为准。</p><h3>20 道主问题，按情况追加追问</h3><p>单选、多选和排序题会说明答题方式；涉及您的使用入口时，仅展示相关追问。您可以随时返回修改。</p>`);
  }
  function download(name,value) {
    const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
  }
  document.querySelectorAll('[data-open]').forEach(el=>el.addEventListener('click',()=>el.dataset.open==='catalog'?openCatalog():about()));
  document.querySelectorAll('[data-general-info]').forEach(el=>el.innerHTML=infoButton('general','关于问卷',document.body.dataset.sample==='rank'?'排序交互样张，不保存答卷。\n戳选后拖动条目排序，刷新恢复示例。':'20 道主问题，约 5–8 分钟。\n答卷仅保存在本机，无需登录。\n资料依据 README 整理，未经实际安装验证。'));
  paintIcons();bindInfo();
  document.addEventListener('keydown',event=>{
    const open=document.querySelector('.info-popover:popover-open');
    if(event.key==='Escape'&&open){event.preventDefault();open.hidePopover();document.querySelector(`[popovertarget="${open.id}"]`)?.focus({preventScroll:true});}
  });
  window.MemoryUI={icon,escape,readState,writeState,emptyState,toast,dialog,confirmReset,download,repoLink,browsable,paintIcons,infoButton,bindInfo,get storageAvailable(){return storageAvailable;}};
})();
