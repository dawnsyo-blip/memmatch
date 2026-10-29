// Codex 生成 · 完整 v6 配置驱动答题流程；不使用原站前端代码。
(() => {
  'use strict';
  const {questionnaire:config,projects,settings}=window.MemoryData;
  const {checkCondition,createRuleEngine,findConflicts}=window.MemoryEngine;
  const UI=window.MemoryUI, esc=UI.escape, icon=UI.icon;
  const sampleMode=document.body.dataset.sample==='rank';
  const state=sampleMode?UI.emptyState():UI.readState();
  const byId=Object.fromEntries(config.questions.map(q=>[q.id,q]));
  const order=config.parts.flatMap(p=>p.questions);
  if(sampleMode){
    for(const id of order.slice(0,order.indexOf('q7'))){const q=byId[id];if(!q.show_if)state.answers[id]=[q.options.find(o=>!o.free_text).id];}
    state.current='q7';state.answers.q7=['companion','work'];
  }
  const form=document.getElementById('question-form');
  const content=document.getElementById('question-content');
  let lastResult=null;
  const visible=()=>order.map(id=>byId[id]).filter(q=>!q.show_if||checkCondition(q.show_if,state.answers));
  const selected=q=>state.answers[q.id]||[];
  const complete=q=>selected(q).length>0&&q.options.filter(o=>o.free_text&&selected(q).includes(o.id)).every(o=>(state.free[`${q.id}.${o.id}`]||'').trim().length>0);
  const partOf=q=>config.parts.findIndex(p=>p.questions.includes(q.id));
  const firstIncomplete=()=>visible().find(q=>!complete(q));
  function save(){
    if(sampleMode){document.getElementById('save-label').textContent='交互样张，不保存答卷';return true;}
    const ok=UI.writeState(state);
    document.getElementById('save-label').textContent=ok?'已保存到本机':'当前浏览器无法保存进度';
    if(!ok){
      document.getElementById('exit-label').textContent='退出问卷';
      document.querySelector('.exit-link').setAttribute('aria-label','退出问卷，进度尚未保存');
      const warning=document.getElementById('storage-warning');warning.textContent='当前浏览器无法保存进度，离开后将丢失回答。';warning.hidden=false;
    }
    return ok;
  }
  function pruneHidden(){
    for(const q of config.questions)if(q.show_if&&!checkCondition(q.show_if,state.answers)){
      delete state.answers[q.id];delete state.seen[q.id];
      for(const o of q.options)delete state.free[`${q.id}.${o.id}`];
    }
  }
  function setURL(id){const url=new URL(location.href);url.searchParams.set('q',id);history.replaceState(null,'',url);}
  function renderRail(q,done=false){
    const list=visible(),pi=partOf(q),answered=list.filter(complete).length;
    const value=Math.round(answered/list.length*100);
    document.getElementById('progress-fill').style.width=value+'%';
    document.getElementById('progress-track').setAttribute('aria-valuenow',String(value));
    document.getElementById('progress-track').setAttribute('aria-valuetext',`已回答 ${answered} 道，共 ${list.length} 道`);
    document.getElementById('part-label').textContent=done?'问卷已完成':`${config.parts[pi].label} · ${config.parts[pi].title}`;
    const index=list.findIndex(x=>x.id===q.id)+1;
    document.getElementById('question-count').innerHTML=done?'已完成':`<b>${String(index).padStart(2,'0')}</b> / ${list.length}`;
  }
  function renderRank(q){
    if(q.type!=='rank'||!selected(q).length)return '';
    return `<div class="rank-selected"><p class="sr-only" id="rank-feedback" role="status"></p><ol class="rank-selected-list" aria-label="已选项目的优先顺序">${selected(q).map((id,i)=>{
      const o=q.options.find(o=>o.id===id);
      return `<li class="rank-row" data-rank="${esc(id)}" tabindex="0" aria-label="第 ${i+1} 位，${esc(o.label)}" aria-describedby="rank-keyboard-help"><button class="rank-bubble" type="button" data-remove-rank="${esc(id)}" aria-label="取消选择${esc(o.label)}">${i+1}</button><span class="rank-row-copy"><strong>${esc(o.label)}</strong>${o.help?UI.infoButton('rank-'+id,o.label,o.help):''}</span><button class="icon-button rank-menu" type="button" data-rank-menu="${esc(id)}" aria-label="调整${esc(o.label)}的顺序">${icon('grip')}</button>${o.free_text?`<div class="free-field rank-free"><label for="free-${esc(id)}">请补充说明</label><input id="free-${esc(id)}" name="free-${esc(q.id)}-${esc(id)}" data-free="${esc(id)}" autocomplete="off" maxlength="300" value="${esc(state.free[`${q.id}.${id}`]||'')}" placeholder="请填写名称或简要说明…" aria-required="true"></div>`:''}</li>`;
    }).join('')}</ol><p class="sr-only" id="rank-keyboard-help">可拖动整个条目排序，或使用上下移动按钮。聚焦条目后，也可按上下方向键移动。点击条目前方的气泡可以取消选择。</p></div>`;
  }
  function render({focus=false,animate=false}={}){
    const q=byId[state.current];
    form.hidden=false;document.getElementById('completion').hidden=true;
    let appliedDefault=false;
    if(!state.seen[q.id]){
      const defaults=q.options.filter(o=>o.default_if&&checkCondition(o.default_if,state.answers)).map(o=>o.id);
      if(defaults.length&&!selected(q).length){state.answers[q.id]=q.type==='single'?defaults.slice(0,1):defaults;appliedDefault=true;}
      state.seen[q.id]=true;
    }
    const typeText=q.type==='single'?'单选':q.type==='rank'?'排序':'多选';
    const guidance=q.type==='single'?'选择一项。':q.type==='rank'?'戳选后，拖动上方条目调整顺序。点击条目前方的气泡可取消选择，也可通过右侧菜单上移或下移。':'可选择多项。再次点击气泡可取消选择。';
    const details=[q.help,appliedDefault?'已根据前面的回答预选，您可以修改。':''].filter(Boolean).join('\n');
    content.innerHTML=`<h1 class="question-heading" id="question-title" tabindex="-1">${esc(q.text)}</h1><div class="question-meta"><span class="question-type">${typeText}</span>${details?UI.infoButton('question','题目说明',details):''}</div><p class="sr-only" id="question-description">${esc(guidance)}</p>${q.help?`<p class="sr-only" id="question-help">${esc(q.help)}</p>`:''}${renderRank(q)}<fieldset class="options ${q.id==='q1'?'device-options':''}" aria-describedby="question-description${q.help?' question-help':''}"><legend>${esc(q.text)}</legend>${q.options.map(o=>{
      const checked=selected(q).includes(o.id);
      if(q.type==='rank'&&checked)return '';
      return `<div class="option-wrap"><label class="option-label" for="option-${esc(o.id)}"><input type="${q.type==='single'?'radio':'checkbox'}" name="${esc(q.id)}" id="option-${esc(o.id)}" value="${esc(o.id)}" ${checked?'checked':''} ${o.help?`aria-describedby="help-${esc(o.id)}"`:''}><span class="option-bubble" aria-hidden="true"></span><span class="option-copy"><strong>${esc(o.label)}</strong></span></label>${o.help?`<span class="sr-only" id="help-${esc(o.id)}">${esc(o.help)}</span>${UI.infoButton('option-'+o.id,o.label,o.help,'option-info')}`:''}${o.free_text&&checked?`<div class="free-field"><label for="free-${esc(o.id)}">${o.id==='other'?'请补充说明':'请填写项目名称'}</label><input id="free-${esc(o.id)}" name="free-${esc(q.id)}-${esc(o.id)}" data-free="${esc(o.id)}" autocomplete="off" maxlength="300" value="${esc(state.free[`${q.id}.${o.id}`]||'')}" placeholder="${q.id==='q1'?'例如：鸿蒙平板…':'请填写名称或简要说明…'}" aria-required="true"></div>`:''}</div>`;
    }).join('')}</fieldset>`;
    document.title=`第 ${q.number||q.id.slice(1)} 题 · 记忆之间`;
    renderRail(q);updateControls(q);document.getElementById('form-error').hidden=true;
    content.querySelectorAll('input[name="'+q.id+'"]').forEach(el=>el.addEventListener('change',()=>choose(q,el.value,el.checked)));
    content.querySelectorAll('[data-free]').forEach(el=>el.addEventListener('input',()=>{
      state.free[`${q.id}.${el.dataset.free}`]=el.value;state.complete=false;save();updateControls(q);renderRail(q);document.getElementById('form-error').hidden=true;el.removeAttribute('aria-invalid');el.removeAttribute('aria-describedby');
    }));
    content.querySelectorAll('[data-rank-menu]').forEach(el=>el.onclick=()=>openRankMenu(q,el.dataset.rankMenu));
    content.querySelectorAll('[data-remove-rank]').forEach(el=>el.onclick=()=>choose(q,el.dataset.removeRank,false));
    if(q.type==='rank')bindRankDrag(q);
    UI.bindInfo(content);save();setURL(q.id);
    if(animate){content.classList.remove('question-enter');requestAnimationFrame(()=>content.classList.add('question-enter'));}
    if(focus)document.getElementById('question-title').focus({preventScroll:true});
  }
  function choose(q,id,checked){
    const option=q.options.find(o=>o.id===id);let values=[...selected(q)];
    if(q.type==='single'||option.exclusive) values=checked?[id]:[];
    else if(checked)values=[...values.filter(v=>!q.options.find(o=>o.id===v)?.exclusive),id];
    else values=values.filter(v=>v!==id);
    state.answers[q.id]=values;state.complete=false;pruneHidden();save();render();
    const bubble=content.querySelector(`#option-${id}`)?.closest('.option-label').querySelector('.option-bubble')||content.querySelector(`[data-rank="${id}"] .rank-bubble`);
    if(bubble&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      bubble.animate(checked?[{transform:'scale(.94)'},{transform:'scale(.86)',offset:.4},{transform:'scale(.96)'}]:[{transform:'scale(.96)'},{transform:'scale(1.04)',offset:.6},{transform:'scale(1)'}],{duration:220,easing:'cubic-bezier(.2,.7,.2,1)'});
    }
    const free=content.querySelector(`[data-free="${id}"]`);
    if(checked&&free)free.focus();else (content.querySelector(`#option-${id}`)||content.querySelector(`[data-rank="${id}"]`))?.focus({preventScroll:true});
  }
  function announceRank(q,id){
    const index=selected(q).indexOf(id),name=q.options.find(o=>o.id===id).label;
    const el=document.getElementById('rank-feedback');if(el)el.textContent=`${name}已移至第 ${index+1} 位`;
    content.querySelector(`[data-rank="${id}"]`)?.focus({preventScroll:true});
  }
  function moveRank(q,id,direction){
    const values=[...selected(q)],i=values.indexOf(id),j=i+direction;
    if(j<0||j>=values.length)return;
    [values[i],values[j]]=[values[j],values[i]];state.answers[q.id]=values;state.complete=false;save();render();announceRank(q,id);
  }
  function openRankMenu(q,id){
    const i=selected(q).indexOf(id),name=q.options.find(o=>o.id===id).label;
    UI.dialog(name,`<div class="rank-menu-list"><button type="button" data-shift="-1" ${i===0?'disabled':''}>${icon('up')}上移</button><button type="button" data-shift="1" ${i===selected(q).length-1?'disabled':''}>${icon('down')}下移</button><button type="button" data-cancel-rank>${icon('close')}取消选择</button></div>`,el=>{
      el.querySelectorAll('[data-shift]').forEach(button=>button.onclick=()=>{el.close();moveRank(q,id,Number(button.dataset.shift));});
      el.querySelector('[data-cancel-rank]').onclick=()=>{el.close();choose(q,id,false);};
    });
  }
  function bindRankDrag(q){
    let drag=null;
    const rows=Array.from(content.querySelectorAll('[data-rank]'));
    for(const row of rows){
      row.addEventListener('keydown',event=>{
        if(event.target!==row)return;
        if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();moveRank(q,row.dataset.rank,event.key==='ArrowUp'?-1:1);}
      });
      row.addEventListener('pointerdown',event=>{
        if(event.button!==0||event.target.closest('button,input,a'))return;
        const rects=rows.map(el=>({el,id:el.dataset.rank,rect:el.getBoundingClientRect()}));
        const source=rects.find(x=>x.el===row),index=rects.indexOf(source);
        drag={row,id:row.dataset.rank,pointer:event.pointerId,startY:event.clientY,rects,source,index,target:index,active:false};
        row.setPointerCapture(event.pointerId);
      });
      row.addEventListener('pointermove',event=>{
        if(!drag||drag.pointer!==event.pointerId)return;
        const delta=event.clientY-drag.startY;
        if(!drag.active&&Math.abs(delta)<6)return;
        event.preventDefault();drag.active=true;drag.row.classList.add('dragging');
        document.body.classList.add('rank-drag-active');
        const center=drag.source.rect.top+drag.source.rect.height/2+delta;
        drag.target=drag.rects.filter(x=>x.id!==drag.id&&center>x.rect.top+x.rect.height/2).length;
        const shift=drag.source.rect.height+12;
        for(let i=0;i<drag.rects.length;i++){
          const item=drag.rects[i];
          const offset=item.id===drag.id?delta:drag.target<drag.index&&i>=drag.target&&i<drag.index?shift:drag.target>drag.index&&i>drag.index&&i<=drag.target?-shift:0;
          item.el.style.transform=`translateY(${offset}px)`;
        }
      });
      const stop=(event,cancel=false)=>{
        if(!drag||drag.pointer!==event.pointerId)return;
        const finished=drag;drag=null;
        document.body.classList.remove('rank-drag-active');
        finished.rects.forEach(x=>{x.el.style.transform='';x.el.classList.remove('dragging');});
        if(row.hasPointerCapture(event.pointerId))row.releasePointerCapture(event.pointerId);
        if(!cancel&&finished.active&&finished.target!==finished.index){
          const values=selected(q).filter(id=>id!==finished.id);values.splice(finished.target,0,finished.id);
          state.answers[q.id]=values;state.complete=false;save();render();announceRank(q,finished.id);
        }
      };
      row.addEventListener('pointerup',event=>stop(event));row.addEventListener('pointercancel',event=>stop(event,true));
    }
  }
  function updateControls(q){
    if(sampleMode){document.getElementById('next-label').textContent='确认顺序';return;}
    const list=visible(),i=list.findIndex(x=>x.id===q.id);
    document.getElementById('previous').disabled=i===0;
    document.getElementById('previous').hidden=i===0;
    // 按钮保持可用，提交时在题目旁提供具体的纠正提示。
    document.getElementById('next-label').textContent=i===list.length-1?'查看推荐':'下一题';
    document.getElementById('next').setAttribute('data-ready',String(complete(q)));
  }
  function go(q){if(!q)return;state.current=q.id;state.complete=false;render({focus:true,animate:true});if(window.scrollY>150)window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  function validate(q){
    if(complete(q))return true;
    const el=document.getElementById('form-error');
    el.textContent=selected(q).length?'请填写已选选项的补充内容，再继续。':'请至少选择一个符合您情况的选项，再继续。';el.hidden=false;
    const missing=q.options.find(o=>o.free_text&&selected(q).includes(o.id)&&!(state.free[`${q.id}.${o.id}`]||'').trim());
    if(missing){const input=content.querySelector(`[data-free="${missing.id}"]`);input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby','form-error');input.focus();}
    else content.querySelector('input')?.focus();return false;
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();const q=byId[state.current];if(!validate(q))return;
    if(sampleMode){UI.toast('已确认');return;}
    const list=visible(),i=list.findIndex(x=>x.id===q.id);
    if(i<list.length-1)go(list[i+1]);else{const missing=firstIncomplete();if(missing)go(missing);else finish();}
  });
  document.getElementById('previous').onclick=()=>{const list=visible(),i=list.findIndex(q=>q.id===state.current);if(i>0)go(list[i-1]);};
  document.querySelector('.exit-link').addEventListener('click',event=>{
    if(!save()){
      event.preventDefault();
      UI.dialog('进度尚未保存','<p>当前浏览器禁止本地存储。离开页面后，这次填写的答案可能丢失，您可以先下载答卷。</p><div class="dialog-actions"><button class="secondary-button" id="exit-download">下载答卷</button><a class="secondary-button" href="index.html">仍然退出</a><button class="primary-button" id="continue-answer">继续填写</button></div>',el=>{
        el.querySelector('#exit-download').onclick=downloadAnswers;el.querySelector('#continue-answer').onclick=()=>el.close();
      });
    }
  });
  function answerExport(){return {version:config.version,answers:state.answers,free:state.free,readable:visible().map(q=>({question:q.text,answer:selected(q).map(id=>q.options.find(o=>o.id===id).label),notes:q.options.filter(o=>o.free_text&&selected(q).includes(o.id)).map(o=>state.free[`${q.id}.${o.id}`])}))};}
  function downloadAnswers(){UI.download('记忆之间-我的答卷.json',answerExport());}
  function review(){UI.dialog('回看您的回答',visible().map(q=>`<article class="review-answer"><button data-review="${esc(q.id)}">${esc(q.text)}${icon('diagonal')}</button><p>${selected(q).map(id=>esc(q.options.find(o=>o.id===id).label)).join('、')}</p></article>`).join(''),el=>el.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>{el.close();go(byId[b.dataset.review]);}));}
  function finish(){
    const missing=firstIncomplete();if(missing){go(missing);return;}
    const conflicts=findConflicts(config,state.answers);
    lastResult=createRuleEngine({questionnaire:config,settings}).recommend(state.answers,projects,{free:state.free});
    state.complete=true;save();form.hidden=true;
    renderRail(byId[state.current],true);setURL('done');document.title='为您找到的记忆库 · 记忆之间';
    const out=document.getElementById('completion');out.hidden=false;
    out.innerHTML=`<div class="completion-orb">${icon('check')}</div><h1 class="question-heading" id="completion-title" tabindex="-1">${lastResult.results.length?'让记忆，从这里延续。':'再调整一点，找到更多可能。'}</h1><p class="completion-intro">${lastResult.results.length?`为您挑出 ${lastResult.results.length} 个记忆项目。每一个选择，都有依据。`:'当前条件下，没有匹配的记忆项目。您可以回看回答，尝试调整入口、部署方式或预算。'}</p>${conflicts.length?`<h2 style="font-size:16px;font-weight:500">这些回答之间需要再确认</h2><ul class="conflict-list">${conflicts.map(c=>`<li>${esc(c.message)}</li>`).join('')}</ul>`:''}${lastResult.notices.length?`<details class="review-hint"><summary>关于您的使用入口，有 ${lastResult.notices.length} 项提醒</summary>${lastResult.notices.map(n=>`<p>${esc(n)}</p>`).join('')}</details>`:''}<div class="completion-actions"><button class="primary-button" id="review-answers">回看与修改${icon('back')}</button><button class="secondary-button" id="download-answers">${icon('download')}下载答卷</button><button class="secondary-button" id="download-results">下载推荐</button></div>${lastResult.results.map(r=>{const url=UI.repoLink(r.repo_url);return `<article class="result-card"><h2>${esc(r.name)}${url?`<a href="${url}" target="_blank" rel="noopener noreferrer">查看项目${icon('diagonal')}</a>`:''}</h2><p>${esc(r.summary)}</p>${r.reasons.length?`<ul>${r.reasons.map(reason=>`<li>${esc(reason)}</li>`).join('')}</ul>`:''}${r.cautions.length||r.unknowns.length?`<details><summary>使用门槛与注意事项</summary><ul>${[...r.cautions,...r.unknowns.map(x=>'需要自行确认：'+x)].map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>`:''}</article>`;}).join('')}${lastResult.relax.length?`<details class="review-hint"><summary>调整哪些条件，可以多一些选择？</summary><ul>${lastResult.relax.map(r=>`<li>${esc(r.label)} · ${r.count} 个可能匹配的项目</li>`).join('')}</ul></details>`:''}<details class="review-hint"><summary>查看被筛去的项目及原因 · ${lastResult.excluded.length} 个</summary>${lastResult.excluded.map(r=>`<p>${esc(r.name)}：${esc(r.reason)}</p>`).join('')}</details><p class="review-hint">资料来自 2026 年 10 月的 README 与代码仓库，未经实际安装验证。项目能力与费用请以最新官方说明为准。</p>`;
    out.querySelector('#review-answers').onclick=review;out.querySelector('#download-answers').onclick=downloadAnswers;
    out.querySelector('#download-results').onclick=()=>UI.download('记忆之间-推荐结果.json',lastResult);
    document.getElementById('completion-title').focus({preventScroll:true});window.scrollTo(0,0);
  }
  if(sampleMode){render();return;}
  pruneHidden();
  const requested=new URL(location.href).searchParams.get('q');
  const list=visible(),boundary=list.findIndex(q=>!complete(q));
  if(requested&&byId[requested]){
    const idx=list.findIndex(q=>q.id===requested);if(idx>=0&&(boundary<0||idx<=boundary))state.current=requested;
  }
  if(!list.some(q=>q.id===state.current))state.current=firstIncomplete()?.id||list[0].id;
  // 任何过期或手工改动的本地状态，都必须从第一道未完成题继续。
  if(boundary>=0&&list.findIndex(q=>q.id===state.current)>boundary)state.current=list[boundary].id;
  if(state.complete&&!firstIncomplete()&&(!requested||requested==='done'))finish();else render();
})();
