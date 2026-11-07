import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const base=process.env.SITE_URL||'http://127.0.0.1:8813/';
const out=fileURLToPath(new URL('../output/playwright/arm-interaction/',import.meta.url));await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge'}),errors=[];
const observe=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};
async function finish(page){
  await page.locator('.has-3d-model').waitFor();
  await page.waitForFunction(()=>document.querySelector('.flight-film').readyState>=2);
  await page.locator('.flight-film').evaluate(async v=>{v.pause();await new Promise(r=>{v.addEventListener('seeked',r,{once:true});v.currentTime=v.duration;});});
  if(await page.locator('html').getAttribute('data-motion')!=='paused')await page.locator('.motion-toggle').click();
  await page.locator('.is-interactive').waitFor();await page.waitForTimeout(250);
}
async function modelPoint(page){
  const box=await page.locator('.flight-model-viewport').boundingBox();
  for(const y of [.35,.55,.25,.65])for(const x of [.45,.40,.50,.55,.60,.65]){
    const p={x:box.x+box.width*x,y:box.y+box.height*y};await page.mouse.move(p.x,p.y);
    if(await page.locator('.flight-model-viewport').evaluate(v=>v.classList.contains('over-model')))return p;
  }
  throw Error('No raycast hit inside the visible model');
}
const shot=async page=>createHash('sha256').update(await page.locator('.flight-model-viewport').screenshot()).digest('hex');
try{
  const page=await browser.newPage({viewport:{width:1440,height:920}});observe(page);
  await page.goto(new URL('scripts/arm-3d.html',base).href);await page.waitForFunction(()=>window.armFilm);
  const sceneAudit=await page.evaluate(()=>{
    const film=window.armFilm,clips=[];
    for(let yaw=-Math.PI; yaw<=Math.PI; yaw+=Math.PI/12)for(const pitch of [-.12,0,.2,.43]){
      film.render(10,false,{yaw,pitch,engagement:1});const b=film.bounds();
      if(b.left<-1||b.right>1||b.top>1||b.bottom<-1)clips.push({yaw,pitch,...b});
    }
    const marks=film.inkMarks();
    film.render(8.1);const lights=film.scene.children.filter(o=>o.isPointLight).map(o=>o.intensity);
    const pads=film.pieces.filter(p=>p.name.startsWith('gripping pad')).map(p=>p.mesh.material.emissiveIntensity);
    film.render(10);const quiet=film.scene.children.filter(o=>o.isPointLight).every(o=>o.intensity<.001);
    return {clips,marks:marks.length,sourceRadius:Math.max(...marks.map(p=>Math.hypot(...p)/1000)),lights,pads,quiet};
  });
  assert.deepEqual(sceneAudit.clips,[],'manual orbit never clips the arm');
  assert.equal(sceneAudit.marks,384);assert.ok(sceneAudit.sourceRadius<2,'particles originate at the gripping pads');
  assert.ok(sceneAudit.lights.some(n=>n>1)&&sceneAudit.pads.every(n=>n>.5),'the light originates on the gripping surface');
  assert.ok(sceneAudit.quiet,'the source light settles after the name forms');
  await page.goto(base);await page.locator('.has-3d-model').waitFor();
  assert.equal(await page.locator('.model-tools').isVisible(),false,'orbit is unavailable during the authored film');
  await finish(page);
  assert.equal(await page.locator('.model-tools').isVisible(),true);
  const original=await shot(page),point=await modelPoint(page);
  await page.mouse.move(point.x,point.y);await page.mouse.down();
  await page.mouse.move(point.x+150,point.y+30,{steps:18});
  assert.equal(await page.locator('.print-stage').getAttribute('data-model-dragging'),'true');
  await page.mouse.up();await page.waitForTimeout(750);
  assert.equal(await page.locator('.print-stage').getAttribute('data-model-dragging'),null);
  assert.equal(await page.evaluate(()=>window.chapterReader.current().id),'home');
  assert.notDeepEqual(await shot(page),original,'a pointer drag changes the real perspective');
  await page.screenshot({path:out+'/drag-desktop.png'});
  await page.locator('.model-reset').click();await page.mouse.move(10,10);await page.waitForTimeout(750);
  assert.deepEqual(await shot(page),original,'reset restores the original rendered camera');
  const viewport=page.locator('.flight-model-viewport');await viewport.focus();const focusedOriginal=await shot(page);await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');await page.waitForTimeout(700);
  assert.notDeepEqual(await shot(page),focusedOriginal);assert.equal(await page.evaluate(()=>window.chapterReader.current().id),'home');
  await page.keyboard.press('Home');await page.waitForTimeout(750);
  await viewport.evaluate(v=>v.blur());
  assert.deepEqual(await shot(page),original,'Home restores the original camera without changing chapters');
  await page.locator('.language-toggle').click();await page.waitForFunction(()=>document.documentElement.lang==='zh-CN'&&!document.documentElement.dataset.preferenceMotion);
  assert.match(await viewport.getAttribute('aria-label'),/拖动/);
  assert.match(await page.locator('#model-instructions').textContent(),/拖动/);
  await page.locator('.theme-toggle').click();await page.waitForFunction(()=>!document.documentElement.dataset.preferenceMotion);
  await page.screenshot({path:out+'/dark-zh.png'});
  await page.locator('.motion-toggle').click();
  await page.locator('.flight-replay').click();await page.waitForFunction(()=>document.querySelector('.flight-film').currentTime<1);
  await page.locator('.is-interactive').waitFor({state:'detached'});
  assert.equal(await page.locator('.model-tools').isVisible(),false);
  assert.equal(await viewport.getAttribute('tabindex'),'-1');assert.equal(await page.locator('.print-stage').getAttribute('data-model-orbit'),null);
  await viewport.locator('canvas').evaluate(c=>c.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  assert.equal(await page.locator('.model-tools').isVisible(),false);
  assert.equal(await page.locator('.flight-film').evaluate(v=>getComputedStyle(v).visibility),'visible');

  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});observe(mobile);
  await mobile.goto(base);await finish(mobile);
  const mp=await modelPoint(mobile),cdp=await mobile.context().newCDPSession(mobile);
  async function swipe(dx,dy){
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:mp.x,y:mp.y}]});
    for(let i=1;i<=14;i++){
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:mp.x+dx*i/14,y:mp.y+dy*i/14}]});
      await mobile.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mobile.waitForTimeout(750);
  }
  const mobileOriginal=await shot(mobile);await mobile.screenshot({path:out+'/touch-before.png'});await swipe(90,3);
  await mobile.screenshot({path:out+'/touch-after.png'});
  assert.equal(await mobile.locator('.print-stage').getAttribute('data-model-orbit'),'true');
  assert.notDeepEqual(await shot(mobile),mobileOriginal);
  assert.equal(await mobile.evaluate(()=>window.chapterReader.current().id),'home');
  await mobile.screenshot({path:out+'/touch-mobile.png'});
  await mobile.locator('.model-reset').click();await mobile.waitForTimeout(750);
  await swipe(0,-100);
  assert.equal(await mobile.locator('.print-stage').getAttribute('data-model-orbit'),null,'vertical touch leaves the camera unchanged');
  assert.equal(await mobile.evaluate(()=>window.chapterReader.current().id),'about','vertical touch can turn the sheet');

  const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});observe(reduced);
  await reduced.goto(base);await reduced.locator('.is-interactive').waitFor();await reduced.evaluate(()=>document.fonts.ready);await reduced.waitForTimeout(200);
  const initialReduced=await shot(reduced);await reduced.locator('.flight-model-viewport').focus();await reduced.keyboard.press('ArrowRight');await reduced.waitForTimeout(120);
  assert.notDeepEqual(await shot(reduced),initialReduced,'explicit camera input remains usable with reduced motion');
  assert.equal(await reduced.locator('.flight-film').evaluate(v=>v.paused),true);
  assert.equal(await reduced.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
  const paused=await browser.newPage({viewport:{width:1440,height:920}});observe(paused);
  await paused.addInitScript(()=>localStorage.setItem('zy-motion','paused'));
  await paused.goto(base);await paused.locator('.is-interactive').waitFor();await paused.evaluate(()=>document.fonts.ready);
  assert.equal(await paused.locator('.flight-film').evaluate(v=>v.paused),true);
  await paused.locator('.flight-model-viewport').focus();await paused.keyboard.press('ArrowRight');
  await paused.waitForTimeout(300);assert.equal(await paused.locator('.print-stage').getAttribute('data-model-orbit'),'true');
  assert.deepEqual(errors,[]);await writeFile(out+'/audit.json',JSON.stringify(sceneAudit,null,2));
  console.log('PASS metal retention and gripper light, 100 manual camera views, mouse/touch rotation, reset, keyboard, replay, translation, reduced motion, fallback and native vertical navigation');
}finally{await browser.close();}
