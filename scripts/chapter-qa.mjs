import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const base = process.env.SITE_URL || 'http://127.0.0.1:8782/';
const out = fileURLToPath(new URL('../output/playwright/', import.meta.url));
await mkdir(out,{recursive:true});
const browser = await chromium.launch({channel:'msedge'});
const errors = [];
try {
  const page = await browser.newPage({viewport:{width:1440,height:920}});
  page.on('pageerror', e=>errors.push(e.message));
  await page.goto(base);
  const film = page.locator('.flight-film');
  await page.waitForFunction(()=>document.querySelector('.flight-film').currentTime > .15);
  async function freeze(time) {
    await film.evaluate(async (v,t) => {
      v.pause();
      if (Math.abs(v.currentTime-t)>.001) await new Promise(resolve=>{
        v.addEventListener('seeked',resolve,{once:true}); v.currentTime=t;
      });
    },time);
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  }
  const canvas=page.locator('#flight-lettering');
  async function ink() {
    return canvas.evaluate(c=>{
      const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      let total=0,color=0;
      for(let i=0;i<p.length;i+=4) if(p[i+3]>45) {
        total++;
        if(Math.max(p[i],p[i+1],p[i+2])-Math.min(p[i],p[i+1],p[i+2])>32) color++;
      }
      return {total,color};
    });
  }
  const timing=await film.evaluate(async video=>
    fetch(video.dataset.inkMap).then(response=>response.json()));
  assert.ok(timing.release-timing.assembled>=.25,'the complete arm holds before releasing the name');
  await freeze(timing.assembled+.10);
  assert.equal((await ink()).total,0,'the exploded assembly can finish before the name appears');
  assert.equal(await page.locator('#home').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
  await freeze(timing.release+1.00);
  const airborne=await ink(); assert.ok(airborne.color>150 && airborne.total>airborne.color);
  await page.screenshot({path:out+'/chapter-transfer.png'});
  await freeze(timing.settled+.03);
  const rest=await ink(); assert.ok(rest.total>3000 && rest.color===0);
  await page.screenshot({path:out+'/chapter-cover.png'});
  const rect=await canvas.boundingBox();
  await page.mouse.move(rect.x+rect.width*.22,rect.y+rect.height*.48);
  await page.waitForTimeout(320);
  assert.ok((await ink()).color>40,'local hover must release colour');
  await page.mouse.move(20,20); await page.waitForTimeout(1450);
  assert.equal((await ink()).color,0,'colour settles back to ink');
  const current=()=>page.evaluate(()=>window.chapterReader.current().id);
  const click=async(label)=>{await page.locator(label).click();await page.waitForFunction(()=>!document.documentElement.dataset.turn);};
  await page.mouse.move(rect.x+50,rect.y+50);
  await page.mouse.wheel(0,200);
  await page.waitForFunction(()=>document.documentElement.dataset.turn==='down');
  await page.waitForTimeout(120);
  assert.equal(await page.locator('html').getAttribute('data-turn-style'),'contour');
  assert.ok(await page.locator('.chapter-contour').evaluate(seam=>{
    const lines=seam.querySelectorAll('path:not(.contour-stock)');
    const ink=seam.querySelector('.contour-stock').getBoundingClientRect();
    const viewport=seam.getBoundingClientRect();
    return lines.length>3 && ink.width>=viewport.width-1 && ink.height>3 &&
      ink.height<viewport.height*.28 && ink.top<viewport.bottom && ink.bottom>viewport.top;
  }),'the engraved band spans the reading area and stays narrow during a turn');
  await page.screenshot({path:out+'/chapter-turn.png'});
  for(let i=0;i<8;i++){await page.mouse.wheel(0,22);await page.waitForTimeout(30);}
  await page.waitForFunction(()=>!document.documentElement.dataset.turn);
  assert.equal(await current(),'about','one gesture turns exactly one sheet');
  const gallery=page.locator('.campus-gallery');
  assert.equal(await gallery.locator('img').count(),3);
  await gallery.locator('.campus-next').click();
  await page.waitForFunction(()=>{const t=document.querySelector('.campus-track');return Math.abs(t.scrollLeft-t.clientWidth)<2;});
  await gallery.locator('.campus-track').focus();await page.keyboard.press('ArrowRight');
  assert.equal(await gallery.locator('.campus-count').textContent(),'3 / 3');
  await page.keyboard.press('ArrowLeft');
  await gallery.screenshot({path:out+'/campus-gallery.png'});
  for(const [button,kind] of [['.theme-toggle','theme'],['.language-toggle','language']]) {
    await page.locator(button).click();
    await page.waitForFunction(kind=>document.documentElement.dataset.preferenceMotion===kind &&
      document.getAnimations().some(a=>a.animationName===(kind==='theme'?'preference-ink-out':'translation-out')),kind);
    await page.waitForFunction(()=>!document.documentElement.dataset.preferenceMotion);
    assert.equal(await current(),'about');
  }
  assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');
  assert.equal(await gallery.locator('figure:not([inert]) strong').textContent(),'本部大楼庭院');
  await page.locator('.theme-toggle').click();await page.waitForFunction(()=>!document.documentElement.dataset.preferenceMotion);
  await page.locator('.language-toggle').click();await page.waitForFunction(()=>!document.documentElement.dataset.preferenceMotion);
  // A small, real wheel delta starts a turn. Opposite input unwinds the
  // same contours and restores the chapter that was being read.
  await page.mouse.move(280,240);await page.mouse.wheel(0,-9);
  await page.waitForFunction(()=>document.documentElement.dataset.turn==='up');
  await page.mouse.wheel(0,140);
  await page.waitForFunction(()=>!document.documentElement.dataset.turn);
  assert.equal(await current(),'about');
  await click('.chapter-next'); assert.equal(await current(),'research');
  const sheet=page.locator('.chapter-sheet:has(> #research)');
  await page.mouse.move(600,475); await page.mouse.wheel(0,280); await page.waitForTimeout(250);
  assert.ok(await sheet.evaluate(s=>s.scrollTop>40)); assert.equal(await current(),'research');
  await sheet.evaluate(s=>s.scrollTop=s.scrollHeight);
  await page.keyboard.press('PageDown'); assert.equal(await current(),'projects');
  await page.keyboard.press('PageUp'); assert.equal(await current(),'research');
  assert.ok(await sheet.evaluate(s=>s.scrollHeight-s.clientHeight-s.scrollTop<2),'backward wheel/key re-enters at the reading edge');
  await page.goto(new URL('#paper-cabin-interaction',base).href);
  await page.waitForFunction(()=>window.chapterReader.current().id==='publications');
  assert.ok(await page.locator('#paper-cabin-interaction').evaluate(el=>{
    const r=el.getBoundingClientRect();return r.top<innerHeight-60 && r.bottom>80;
  }));
  await page.keyboard.press('End');assert.equal(await current(),'contact');
  assert.ok(await page.locator('.chapter-next').isDisabled());
  await page.keyboard.press('Home');assert.equal(await current(),'home');
  const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const phone=await touch.newPage();await phone.goto(base);await phone.evaluate(()=>document.fonts.ready);
  await phone.screenshot({path:out+'/chapter-phone.png'});
  const cdp=await touch.newCDPSession(phone);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:200,y:600}]});
  for(const y of [560,500,440,365,300]) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:200,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await phone.waitForFunction(()=>window.chapterReader.current().id==='about');
  assert.ok(await phone.evaluate(()=>!document.documentElement.dataset.turn));
  const track=phone.locator('.campus-track'); await track.scrollIntoViewIfNeeded();
  const box=await track.boundingBox(), y=box.y+box.height*.42;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.9,y}]});
  for(const fraction of [.8,.65,.45,.25,.12]) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*fraction,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await phone.waitForFunction(()=>document.querySelector('.campus-track').scrollLeft>80);
  assert.equal(await phone.evaluate(()=>window.chapterReader.current().id),'about');
  const fallback=await browser.newPage({viewport:{width:1024,height:680}});
  await fallback.addInitScript(()=>Object.defineProperty(document,'startViewTransition',{value:undefined}));
  await fallback.goto(base);
  await fallback.locator('.primary-navigation a[href="#research"]').click();
  await fallback.waitForFunction(()=>window.chapterReader.current().id==='research' && !document.documentElement.dataset.turn);
  await fallback.locator('[data-node="dataset"]').click();
  await fallback.waitForFunction(()=>window.chapterReader.current().id==='projects' && !document.documentElement.dataset.turn);
  await fallback.goBack();
  await fallback.waitForFunction(()=>location.hash==='#research' && window.chapterReader.current().id==='research');
  await fallback.goForward();
  await fallback.waitForFunction(()=>location.hash==='#project-data' && window.chapterReader.current().id==='projects');
  assert.deepEqual(errors,[]);
  console.log('PASS ink transfer, reversible wheel turn, animated language and theme, keyboard gallery and horizontal touch, native reading, fragments and reduced motion');
} finally {await browser.close();}
