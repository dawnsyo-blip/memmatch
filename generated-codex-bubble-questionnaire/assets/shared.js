// Codex 生成 · 图标、独立本地存储和弹窗。
(() => {
  'use strict';
  const paths = {
    arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>', back:'<path d="M20 12H5m6-6-6 6 6 6"/>',
    diagonal:'<path d="M6 18 18 6M7 6h11v11"/>',check:'<path d="m5 12 4 4L19 6"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.3 9a2.8 2.8 0 1 1 4.1 2.5c-1 .5-1.4 1.1-1.4 2.5m0 3h.01"/>',
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
    document.body.style.overflow='hidden';el.showModal();setup?.(el);return el;
  }
  function confirmReset() {
    dialog('从头认识一次？','<p>这会清除这份设计稿中已保存的答卷。您可以先下载答卷，或保留当前进度。</p><div class="dialog-actions"><button class="secondary-button" id="keep-progress">保留进度</button><button class="primary-button" id="confirm-reset">重新开始</button></div>',el=>{
      el.querySelector('#keep-progress').onclick=()=>el.close();
      el.querySelector('#confirm-reset').onclick=()=>{writeState(emptyState());location.href='quiz.html';};
    });
  }
  const browsable = projects.filter(p=>['included','flagged'].includes(p.inclusion?.status));
  function repoLink(url) {try {const u=new URL(url);return ['https:','http:'].includes(u.protocol)?escape(u.href):null;} catch{return null;}}
  function openCatalog() {
    dialog('浏览记忆项目',`<p>按项目名称或简介搜索，了解每一种记忆方式。</p><label for="catalog-search" class="sr-only">搜索项目名称或简介</label><input class="search-field" id="catalog-search" name="project-search" autocomplete="off" placeholder="搜索名称、入口或记忆方式…" style="margin-top:24px"><p class="catalog-meta" id="catalog-count" aria-live="polite"></p><div class="catalog-list" id="catalog-list"></div>`,el=>{
      const draw=(query='')=>{
        const list=browsable.filter(p=>(p.name+' '+(p.info?.summary?.value||'')).toLowerCase().includes(query.toLowerCase().trim()));
        el.querySelector('#catalog-count').textContent=`${list.length} 个项目 · 依据文档整理，未经实际安装验证`;
        el.querySelector('#catalog-list').innerHTML=list.length?list.map(p=>{const url=repoLink(p.repo_url);return `<article class="catalog-item">${url?`<a href="${url}" target="_blank" rel="noopener noreferrer">${escape(p.name)}${icon('diagonal')}</a>`:`<strong>${escape(p.name)}</strong>`}<p>${escape(p.info?.summary?.value||'项目说明尚待补充。')}</p><span class="catalog-status">${p.review_status==='reviewed'?'已审核资料':'社区推荐 · 未审核'}${p.inclusion?.status==='flagged'?' · 请留意使用风险':''}</span></article>`;}).join(''):'<p>暂时没有匹配的项目，试试更短的关键词。</p>';
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
  paintIcons();
  window.MemoryUI={icon,escape,readState,writeState,emptyState,toast,dialog,confirmReset,download,repoLink,browsable,paintIcons,get storageAvailable(){return storageAvailable;}};
})();
