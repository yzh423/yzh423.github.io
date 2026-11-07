import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const base=process.env.SITE_URL||'http://127.0.0.1:8782/';
const out=fileURLToPath(new URL('../output/playwright/',import.meta.url));
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:920}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);
  await page.waitForFunction(()=>document.querySelector('.flight-film').currentTime>.1);
  // Observe the actual rendered grains without exporting animation state.
  await page.locator('#flight-lettering').evaluate(c=>{
    const ctx=c.getContext('2d'),clear=ctx.clearRect.bind(ctx),fill=ctx.fillRect.bind(ctx);
    ctx.clearRect=(...args)=>{c.drawn=[];clear(...args);};
    ctx.fillRect=(x,y,w,h)=>{c.drawn.push([x+w/2,y+h/2]);fill(x,y,w,h);};
  });
  await page.locator('.flight-film').evaluate(async v=>{
    const timing=await fetch(v.dataset.inkMap).then(r=>r.json());v.pause();
    await new Promise(r=>{v.addEventListener('seeked',r,{once:true});v.currentTime=timing.settled+.03;});
  });
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const canvas=page.locator('#flight-lettering'),box=await canvas.boundingBox();
  const initial=await canvas.evaluate(c=>c.drawn);
  const selected=initial.map((p,i)=>({p,i})).filter(({p})=>p[0]>box.width*.21&&p[0]<box.width*.53);
  const movement=async()=>{
    const points=await canvas.evaluate(c=>c.drawn);assert.equal(points.length,initial.length);
    const shift=selected.map(({p,i})=>[points[i][0]-p[0],points[i][1]-p[1]]);
    return {x:shift.reduce((s,p)=>s+p[0],0)/shift.length,y:shift.reduce((s,p)=>s+p[1],0)/shift.length,
      distance:shift.reduce((s,p)=>s+Math.hypot(...p),0)/shift.length};
  };
  for(const direction of [1,-1]) {
    const from=direction===1?.17:.57,to=direction===1?.57:.17;
    await page.mouse.move(box.x+box.width*from,box.y+box.height*.49);
    for(let i=1;i<=28;i++) {
      await page.mouse.move(box.x+box.width*(from+(to-from)*i/28),box.y+box.height*.49);
      await page.waitForTimeout(12);
    }
    const carried=await movement();
    assert.ok(carried.x*direction>1.2,`ink follows the stroke: ${JSON.stringify(carried)}`);
    assert.ok(Math.abs(carried.y)<Math.abs(carried.x), 'directional drift dominates radial scattering');
    await page.screenshot({path:out+`pointer-${direction===1?'right':'left'}.png`});
    await page.waitForTimeout(450);
    const returning=await movement();assert.ok(returning.distance>.2,'return is gradual');
    await page.waitForTimeout(2300);
    const settled=await movement();assert.ok(settled.distance<.2,`grains regain their letter: ${JSON.stringify(settled)}`);
    await page.mouse.move(20,20);await page.waitForTimeout(100);
    console.log('PASS directional stroke and soft return',direction,{carried,returning,settled});
  }
  assert.deepEqual(errors,[]);
} finally {await browser.close();}
