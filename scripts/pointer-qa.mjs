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
  const target=initial.reduce((best,p)=>Math.hypot(p[0]-box.width*.32,p[1]-box.height*.49)<
    Math.hypot(best[0]-box.width*.32,best[1]-box.height*.49)?p:best);
  const selected=initial.map((p,i)=>({p,i})).filter(({p})=>Math.hypot(p[0]-target[0],p[1]-target[1])<110);
  const distant=initial.map((p,i)=>({p,i})).filter(({p})=>Math.hypot(p[0]-target[0],p[1]-target[1])>240);
  const movement=async(items=selected)=>{
    const points=await canvas.evaluate(c=>c.drawn);assert.equal(points.length,initial.length);
    const shifts=items.map(({p,i})=>Math.hypot(points[i][0]-p[0],points[i][1]-p[1]));
    return {mean:shifts.reduce((a,b)=>a+b,0)/shifts.length,max:Math.max(...shifts)};
  };
  const colours=()=>canvas.evaluate(c=>{
    const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let n=0;for(let i=0;i<p.length;i+=4)if(p[i+3]>100&&Math.max(p[i],p[i+1],p[i+2])-Math.min(p[i],p[i+1],p[i+2])>32)n++;
    return n;
  });
  await page.mouse.move(box.x+target[0],box.y+target[1],{steps:10});
  await page.waitForTimeout(800);
  const arrived=await movement();
  assert.ok(arrived.mean>16&&arrived.max>45,`hover has a clearly visible reach: ${JSON.stringify(arrived)}`);
  await page.waitForTimeout(2700);
  const held=await movement();
  assert.ok(held.mean>16&&held.mean/arrived.mean>.80,'stationary hover keeps the particles dispersed');
  assert.ok(await colours()>100,'the stationary displacement retains colour');
  assert.ok((await movement(distant)).max<.25,'letters outside the pointer field keep their shape');
  await page.screenshot({path:out+'/pointer-held.png'});
  await page.mouse.move(20,20);await page.waitForTimeout(450);
  const returning=await movement();
  assert.ok(returning.mean>1&&returning.mean<held.mean*.70,'leaving releases the field gradually');
  await page.waitForTimeout(2300);
  const settled=await movement();
  assert.ok(settled.max<.25,`grains regain their letter after pointer leave: ${JSON.stringify(settled)}`);
  assert.equal(await colours(),0);
  console.log('PASS stronger stationary hover, persistent colour, local influence and soft exit',{arrived,held,returning,settled});
  // Pause resets the interactive field even if the pointer was still on the ink.
  await page.mouse.move(box.x+target[0],box.y+target[1]);await page.waitForTimeout(700);
  await page.locator('.motion-toggle').evaluate(b=>b.click());await page.waitForTimeout(100);
  assert.ok((await movement()).max<.25,'pause restores the readable name');
  const paused=await canvas.evaluate(c=>c.toDataURL());
  await page.mouse.move(box.x+target[0]+30,box.y+target[1]);await page.waitForTimeout(300);
  assert.equal(await canvas.evaluate(c=>c.toDataURL()),paused,'paused ink ignores pointer motion');
  assert.deepEqual(errors,[]);
} finally {await browser.close();}
