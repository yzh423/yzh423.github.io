import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const base=process.env.SITE_URL||'http://127.0.0.1:8782/';
const out=fileURLToPath(new URL('../output/playwright/',import.meta.url));
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge'});
try {
  const page=await browser.newPage({viewport:{width:1360,height:860}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).origin===new URL(base).origin) errors.push(r.url());});
  await page.goto(base);
  const ids=['home','about','research','projects','publications','news','experience','cv','contact'];
  async function turn(i,j) {
    await page.locator(j>i?'.chapter-next':'.chapter-prev').click();
    await page.waitForFunction(()=>document.documentElement.dataset.turnStyle==='exposure');
    await page.waitForTimeout(150);
    const f=await page.locator('.turn-front').evaluate(e=>{
      const style=getComputedStyle(e);
      return {id:e.firstElementChild.id,clip:style.clipPath};
    });
    assert.equal(f.id,ids[Math.max(i,j)]);
    assert.match(f.clip,/^ellipse\(/);
    await page.waitForFunction(()=>!document.documentElement.dataset.turn);
    assert.equal(await page.evaluate(()=>window.chapterReader.current().id),ids[j]);
    assert.equal(await page.locator('.turn-front,.turn-back,.chapter-exposure').count(),0);
  }
  for(let i=0;i<8;i++) await turn(i,i+1);
  for(let i=8;i>0;i--) await turn(i,i-1);
  await page.setViewportSize({width:390,height:844});
  for(let i=0;i<8;i++) await turn(i,i+1);
  await page.setViewportSize({width:1360,height:860});
  console.log('PASS all eight chapter exposures on desktop and mobile, including reverse travel');
  const preview=new URL('previews/background-studies/',base);
  await page.goto(preview.href);
  await page.locator('.choices').screenshot({path:out+'/background-choices.png'});
  for(const key of ['eclipse','prism','contours']) {
    await page.locator('[data-key="'+key+'"]').click();
    // The old iframe can still expose its video while the new URL is loading.
    await page.waitForFunction(k=>document.querySelector('iframe').contentWindow.location.search==='?look='+k,key);
    const player=page.frameLocator('iframe');
    await player.locator('video').evaluate(async (v,k)=>{
      const end=performance.now()+11000;
      while(!(v.currentTime>2.3 && v.currentSrc.includes(k+'.mp4'))) {
        if(performance.now()>end)throw Error('Study did not play: '+k);
        await new Promise(r=>setTimeout(r,35));
      }
    },key);
    await player.locator('.motion-toggle').click();
    assert.ok(await player.locator('video').evaluate(v=>v.paused));
    assert.ok(await player.locator('canvas').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3 && v>0)));
  }
  await page.locator('#synchronise').click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.choices video')].every(v=>v.currentTime>.25));
  const times=await page.locator('.choices video').evaluateAll(vs=>vs.map(v=>v.currentTime));
  assert.ok(Math.max(...times)-Math.min(...times)<.2);
  await page.locator('#synchronise').click();
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  assert.deepEqual(errors,[]);
  console.log('PASS three films, live name particles, pause, simultaneous comparison, and small-screen layout');
} finally {await browser.close();}
