// Codex 生成 · 只验证本轮样张：浅色、戳气泡、已选置顶和整行拖拽。
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
  const navigate=async file=>{await cdp('Page.navigate',{url:pathToFileURL(path.join(dir,file)).href});await wait('document.readyState === "complete" && !!window.MemoryUI');await delay(50);};
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
  await screenshot('home-desktop-light');await noOverflow('Desktop homepage');
  await navigate('quiz.html');
  check(await evaluate('document.querySelectorAll(".option-bubble").length===7'),'Each device option is a circular bubble');
  const before=await evaluate('getComputedStyle(document.querySelector(".option-bubble")).boxShadow');
  await click('#option-iphone');await click('#option-windows');
  check(await evaluate('document.querySelectorAll(".option-label input:checked").length===2'),'Poking bubbles selects multiple choices');
  check(await evaluate('getComputedStyle(document.querySelector("#option-iphone + .option-bubble")).boxShadow.includes("inset")'),'Selected bubble stays recessed');
  check(before!==await evaluate('getComputedStyle(document.querySelector("#option-iphone + .option-bubble")).boxShadow'),'Selection changes the actual bubble surface');
  await click('#option-iphone');check(!(await evaluate('document.getElementById("option-iphone").checked')),'Poking selected multi bubble again releases it');await click('#option-iphone');
  await screenshot('quiz-desktop-light');await noOverflow('Desktop bubble question');
  await viewport(390,844);await screenshot('quiz-mobile-light');await noOverflow('390px bubble question');
  await viewport(375,812);await noOverflow('375px bubble question');
  const savedBefore=await evaluate('localStorage.getItem("codex-memory-between-quiz-v6")');
  await viewport(1440,1000);await navigate('ranking-sample.html');
  check((await rankOrder()).join(',')==='companion,work','Rank sample opens with selected items at top');
  check(await evaluate('document.querySelector(".rank-selected").getBoundingClientRect().top < document.querySelector(".options").getBoundingClientRect().top'),'Selected items appear above unselected bubbles');
  await click('#option-coding');
  check((await rankOrder()).join(',')==='companion,work,coding','Poked option moves into selected list');
  check(await evaluate('!document.getElementById("option-coding")'),'Selected option leaves unselected bubble grid');
  await screenshot('ranking-desktop-light');await noOverflow('Desktop ranking sample');
  await drag(0,2);
  check((await rankOrder()).join(',')==='work,coding,companion','Whole row mouse drag changes order');
  check(await evaluate('!document.body.classList.contains("rank-drag-active")'),'Mouse drag cleans up drag state');
  await viewport(390,1000);await evaluate('window.scrollTo(0,0)');await drag(2,0,true);
  check((await rankOrder()).join(',')==='companion,work,coding','Whole row touch drag changes order');
  await screenshot('ranking-mobile-light');await noOverflow('Mobile ranking sample');
  await click('[data-move="coding"][data-direction="-1"]');check((await rankOrder())[1]==='coding','Keyboard alternative remains available');
  await click('[data-remove-rank="coding"]');check(await evaluate('!!document.getElementById("option-coding")'),'Poking selected rank bubble returns item to unselected grid');
  check(savedBefore===await evaluate('localStorage.getItem("codex-memory-between-quiz-v6")'),'Ranking sample does not overwrite saved answers');
  await navigate('ranking-sample.html');check((await rankOrder()).join(',')==='companion,work','Refresh restores ranking sample');
  await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  check(await evaluate('getComputedStyle(document.querySelector(".option-bubble")).transitionDuration === "0s"'),'Reduced-motion preference disables animations');
  await viewport(375,812);await navigate('index.html');await screenshot('home-mobile-light');await noOverflow('375px homepage');
  check(errors.length===0,'No uncaught browser exceptions');
  await writeFile(path.join(artifacts,'qa-samples-report.json'),JSON.stringify({passed:checks.length,checks,errors},null,2));
  console.log(JSON.stringify({passed:checks.length,artifacts},null,2));await cdp('Browser.close').catch(()=>{});
}catch(error){await writeFile(path.join(artifacts,'qa-samples-report.json'),JSON.stringify({passed:checks.length,checks,errors,error:error.stack},null,2));console.error(error.stack);process.exitCode=1;}
finally{ws?.close();browser.kill();}
