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
  await freeze(1.70);
  assert.equal((await ink()).total,0,'no name before the jaws meet');
  assert.equal(await page.locator('#home').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
  await freeze(3.25);
  const airborne=await ink(); assert.ok(airborne.color>150 && airborne.total>airborne.color);
  await page.screenshot({path:out+'/chapter-transfer.png'});
  await freeze(5.2);
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
  await page.screenshot({path:out+'/chapter-turn.png'});
  for(let i=0;i<8;i++){await page.mouse.wheel(0,22);await page.waitForTimeout(30);}
  await page.waitForFunction(()=>!document.documentElement.dataset.turn);
  assert.equal(await current(),'about','one gesture turns exactly one sheet');
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
  console.log('PASS contact-synchronised ink, four-colour hover and release, white cover, chapter turns, native reading, backward landing, fragments, keyboard, touch and reduced motion');
} finally {await browser.close();}
