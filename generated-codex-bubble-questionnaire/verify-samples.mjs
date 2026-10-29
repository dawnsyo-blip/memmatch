// Codex 生成 · 手机样张：精简文案、按需信息、戳气泡及整行拖拽。
import {spawn} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const dir=path.dirname(fileURLToPath(import.meta.url));
const artifacts=path.join(dir,'artifacts');await mkdir(artifacts,{recursive:true});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-sync','--remote-debugging-port=9337',`--user-data-dir=${path.join(dir,'.preview-profile-samples')}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let ws;const checks=[],errors=[];
const check=(ok,message)=>{assert.ok(ok,message);checks.push(message);};
try{
  let targets;
  for(let i=0;i<40;i++){try{targets=await(await fetch('http://127.0.0.1:9337/json/list',{signal:AbortSignal.timeout(500)})).json();if(targets.some(t=>t.type==='page'))break;}catch{}await delay(100);}
  const target=targets?.find(t=>t.type==='page');assert.ok(target,'Edge debugger available');
  ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let nextId=0;const pending=new Map();
  ws.onmessage=event=>{const data=JSON.parse(event.data);if(data.id){const p=pending.get(data.id);pending.delete(data.id);data.error?p?.reject(new Error(JSON.stringify(data.error))):p?.resolve(data.result);}else if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails);};
  const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const wait=async expression=>{for(let i=0;i<120;i++){if(await evaluate(expression))return;await delay(50);}throw new Error('Timeout: '+expression);};
  const navigate=async file=>{const [name,query]=file.split('?');const url=pathToFileURL(path.join(dir,name));if(query)url.search=query;await cdp('Page.navigate',{url:url.href});await wait('document.readyState === "complete" && !!window.MemoryUI');await delay(50);};
  const click=async selector=>{await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);await delay(40);};
  const screenshot=async name=>{await delay(240);const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(path.join(artifacts,name+'.png'),Buffer.from(shot.data,'base64'));};
  const viewport=async(width,height)=>{await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});await cdp('Emulation.setTouchEmulationEnabled',{enabled:width<600,maxTouchPoints:1});};
  const noOverflow=async name=>check(await evaluate('document.documentElement.scrollWidth <= innerWidth'),name+' without horizontal overflow');
  const rankOrder=()=>evaluate('Array.from(document.querySelectorAll("[data-rank]")).map(el=>el.dataset.rank)');
  const drag=async(sourceIndex,targetIndex,touch=false)=>{
    const rects=await evaluate('Array.from(document.querySelectorAll("[data-rank]")).map(el=>{const r=el.getBoundingClientRect();return {x:r.left+r.width*.45,y:r.top+r.height/2}})');
    const source=rects[sourceIndex],end=rects[targetIndex].y+(sourceIndex<targetIndex?12:-12);
    if(touch){
      await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:source.x,y:source.y,id:1}]});
      for(let i=1;i<=12;i++){await cdp('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:source.x,y:source.y+(end-source.y)*i/12,id:1}]});await delay(12);}
      await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }else{
      await cdp('Input.dispatchMouseEvent',{type:'mousePressed',x:source.x,y:source.y,button:'left',buttons:1,clickCount:1});
      for(let i=1;i<=12;i++){await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:source.x,y:source.y+(end-source.y)*i/12,button:'left',buttons:1});await delay(12);}
      await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:source.x,y:end,button:'left',buttons:0,clickCount:1});
    }
    await delay(100);
  };
  await cdp('Runtime.enable');await cdp('Page.enable');await viewport(1440,1000);
  await navigate('index.html');await evaluate('localStorage.clear()');await navigate('index.html');
  check(await evaluate('getComputedStyle(document.documentElement).colorScheme === "light" && !document.querySelector(".theme-toggle")'),'One light theme only');
  check(await evaluate('document.body.getBoundingClientRect().width<=440'),'Desktop preview retains phone width');
  check(await evaluate('!document.querySelector(".journey,.hero-description,.brand-caption,.privacy-line")'),'Redundant home copy is removed from markup');
  await screenshot('home-desktop-light');await noOverflow('Desktop homepage');
  await viewport(390,844);await screenshot('home-mobile-light');
  check(await evaluate('document.getElementById("start-link").getBoundingClientRect().bottom<=innerHeight'),'Home primary action fits on a phone screen');
  await click('[popovertarget="info-general"]');await wait('document.getElementById("info-general").matches(":popover-open")');
  check(await evaluate('document.querySelector("[popovertarget=info-general]").getAttribute("aria-expanded")==="true"'),'Info toggle exposes expanded state');
  check(await evaluate('document.getElementById("info-general").getBoundingClientRect().right<=innerWidth'),'Information popup stays inside phone viewport');
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
  await wait('!document.getElementById("info-general").matches(":popover-open")');
  check(true,'Information popup dismisses with Escape');
  await navigate('quiz.html');
  check(await evaluate('getComputedStyle(document.querySelector(".question-heading")).textAlign==="left"&&getComputedStyle(document.querySelector(".question-heading")).letterSpacing==="normal"'),'Title uses uniform natural spacing without justification');
  check(await evaluate('getComputedStyle(document.querySelector(".question-heading")).fontSize==="32px"&&getComputedStyle(document.querySelector(".question-heading")).lineHeight==="48px"'),'Title follows project 32px / 48px typography');
  check(await evaluate('getComputedStyle(document.querySelector(".quiz-layout")).paddingLeft==="16px"'),'Phone page uses project 16px side margins');
  check(await evaluate('document.querySelectorAll(".option-bubble").length===7'),'Each device option is a circular bubble');
  check(await evaluate('getComputedStyle(document.querySelector(".option-bubble")).width==="44px"'),'Option bubble is reduced to 44px');
  check(await evaluate('Array.from(document.querySelectorAll(".option-wrap")).every((el,i,items)=>!i||el.getBoundingClientRect().top>=items[i-1].getBoundingClientRect().bottom)'),'Choices form one vertical list');
  check(await evaluate('Array.from(document.querySelectorAll(".option-label")).every(el=>el.querySelector(".option-bubble").getBoundingClientRect().right<el.querySelector(".option-copy").getBoundingClientRect().left)'),'Each bubble sits to the left of its label');
  const before=await evaluate('getComputedStyle(document.querySelector(".option-bubble")).boxShadow');
  await click('#option-iphone');await click('#option-windows');
  check(await evaluate('document.querySelectorAll(".option-label input:checked").length===2'),'Poking bubbles selects multiple choices');
  check(await evaluate('getComputedStyle(document.querySelector("#option-iphone + .option-bubble")).boxShadow.includes("inset")'),'Selected bubble stays recessed');
  check(before!==await evaluate('getComputedStyle(document.querySelector("#option-iphone + .option-bubble")).boxShadow'),'Selection changes the actual bubble surface');
  await click('#option-iphone');check(!(await evaluate('document.getElementById("option-iphone").checked')),'Poking selected multi bubble again releases it');await click('#option-iphone');
  await screenshot('quiz-desktop-light');await noOverflow('Desktop bubble question');
  await viewport(390,844);await screenshot('quiz-mobile-light');await noOverflow('390px bubble question');
  check(await evaluate('document.getElementById("next").getBoundingClientRect().bottom<=innerHeight'),'Next action stays visible at phone bottom');
  check(await evaluate('!document.querySelector(".question-reassurance,.question-subtitle,.question-help,.sidebar-note")'),'Question explanations are not permanently displayed');
  const tree=await cdp('Accessibility.getFullAXTree');
  check(tree.nodes.some(n=>n.role?.value==='checkbox'&&n.name?.value==='iPhone 或 iPad'),'Native choice retains a concise accessible name');
  check(await evaluate('!document.getElementById("info-question")'),'No empty question-info button after removing generic instructions');
  for(const width of [320,375,430]){await viewport(width,844);await noOverflow(width+'px phone');}
  await viewport(375,812);await noOverflow('375px bubble question');
  await click('#next');await click('#option-anthropic');await click('#next');
  await click('[popovertarget="info-option-official"]');await wait('document.getElementById("info-option-official").matches(":popover-open")');
  check(await evaluate('!document.getElementById("option-official").checked'),'Option info can open without selecting the option');
  check(await evaluate('document.getElementById("info-option-official").textContent.includes("ChatGPT")'),'Option explanation remains available on demand');
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
  await click('#option-none_yet');await click('#next');await click('.option-label input');await click('#next');
  await click('[popovertarget="info-question"]');await wait('document.getElementById("info-question").matches(":popover-open")');
  await delay(300);check(await evaluate('document.getElementById("info-question").matches(":popover-open")'),'Information remains open until dismissed');
  check(await evaluate('document.getElementById("info-question").textContent.includes("大多数记忆库")&&!document.getElementById("info-question").textContent.includes("可选择多项")'),'Question-specific explanation remains without generic opening sentence');
  await screenshot('question-info-mobile');await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
  await navigate('quiz.html?q=q1');
  const savedBefore=await evaluate('localStorage.getItem("codex-memory-between-quiz-v6")');
  await viewport(1440,1000);await navigate('ranking-sample.html');
  check((await rankOrder()).join(',')==='companion,work','Rank sample opens with selected items at top');
  check(await evaluate('document.querySelector(".rank-selected").getBoundingClientRect().top < document.querySelector(".options").getBoundingClientRect().top'),'Selected items appear above unselected bubbles');
  check(await evaluate('(()=>{const a=document.querySelector(".rank-bubble").getBoundingClientRect(),b=document.querySelector(".option-bubble").getBoundingClientRect();return Math.abs(a.left+a.width/2-b.left-b.width/2)<1})()'),'Selected and unselected bubbles share a vertical center line');
  check(await evaluate('Math.abs(document.querySelector(".rank-row-copy").getBoundingClientRect().left-document.querySelector(".option-copy").getBoundingClientRect().left)<1'),'Selected and unselected option labels share a left edge');
  await click('#option-coding');
  check((await rankOrder()).join(',')==='companion,work,coding','Poked option moves into selected list');
  check(await evaluate('!document.getElementById("option-coding")'),'Selected option leaves unselected bubble grid');
  await screenshot('ranking-desktop-light');await noOverflow('Desktop ranking sample');
  await drag(0,2);
  check((await rankOrder()).join(',')==='work,coding,companion','Whole row mouse drag changes order');
  check(await evaluate('!document.body.classList.contains("rank-drag-active")'),'Mouse drag cleans up drag state');
  await viewport(390,844);await evaluate('window.scrollTo(0,0)');await drag(2,0,true);
  check((await rankOrder()).join(',')==='companion,work,coding','Whole row touch drag changes order');
  await screenshot('ranking-mobile-light');await noOverflow('Mobile ranking sample');
  await click('[data-rank-menu="coding"]');await click('[data-shift="-1"]');check((await rankOrder())[1]==='coding','Rank menu provides a non-drag alternative');
  await evaluate('document.querySelector("[data-rank=coding]").focus()');
  await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowUp',code:'ArrowUp'});
  check((await rankOrder())[0]==='coding','Keyboard arrow reorders the focused row');
  await click('[data-remove-rank="coding"]');check(await evaluate('!!document.getElementById("option-coding")'),'Poking selected rank bubble returns item to unselected grid');
  check(savedBefore===await evaluate('localStorage.getItem("codex-memory-between-quiz-v6")'),'Ranking sample does not overwrite saved answers');
  await navigate('ranking-sample.html');check((await rankOrder()).join(',')==='companion,work','Refresh restores ranking sample');
  await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  check(await evaluate('getComputedStyle(document.querySelector(".option-bubble")).transitionDuration === "0s"'),'Reduced-motion preference disables animations');
  await viewport(375,812);await navigate('index.html');await noOverflow('375px homepage');
  await click('#restart-home');check(await evaluate('document.querySelector("dialog").textContent.includes("无法恢复")'),'Reset keeps an explicit irreversible consequence warning');await click('#keep-progress');
  check(errors.length===0,'No uncaught browser exceptions');
  await writeFile(path.join(artifacts,'qa-samples-report.json'),JSON.stringify({passed:checks.length,checks,errors},null,2));
  console.log(JSON.stringify({passed:checks.length,artifacts},null,2));await cdp('Browser.close').catch(()=>{});
}catch(error){await writeFile(path.join(artifacts,'qa-samples-report.json'),JSON.stringify({passed:checks.length,checks,errors,error:error.stack},null,2));console.error(error.stack);process.exitCode=1;}
finally{ws?.close();browser.kill();}
