import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const base=process.env.SITE_URL||'http://127.0.0.1:8782/';
const out=new URL('../output/playwright/arm3d-qa/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge'}),errors=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:920}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('scripts/arm-3d.html',base).href);await page.waitForFunction(()=>window.armFilm);
  const audit=await page.evaluate(async()=>{
    const {motion,timing}=await import('./arm-3d.js'),film=window.armFilm;
    const before=motion(timing.contact),pickup=motion(timing.pickup_end),turnStart=motion(timing.orbit_start),turnEnd=motion(timing.orbit_end);
    let clipped=0;
    for(let t=0;t<=10;t+=.1){film.render(t);const b=film.bounds();if(b.left<-1||b.right>1||b.top>1||b.bottom<-1)clipped++;}
    const shared=[];
    for(const t of [6.4,6.7,7.0]){
      const s=motion(t);film.render(t);
      shared.push(film.pieces.map(p=>{
        const actual=p.mesh.position.clone();p.place(p.mesh,s);
        return actual.sub(p.mesh.position).length()/p.offset.length();
      }));
    }
    const matrices=[],angles=[];
    for(let i=0;i<=4;i++){
      const t=timing.orbit_start+(timing.orbit_end-timing.orbit_start)*i/4;
      film.render(t);matrices.push(film.camera.matrixWorld.elements.slice());angles.push(motion(t).orbit);
    }
    return {clipped,pieces:film.pieces.length,lift:pickup.part.y-before.part.y,gap:pickup.gap,
      beforeOpen:pickup.opened,turnOpen:[turnStart.opened,turnEnd.opened],angle:turnEnd.orbit-turnStart.orbit,
      expectedAngle:timing.camera_sweep_degrees*Math.PI/180,shared,matrices,angles};
  });
  assert.equal(audit.clipped,0,'all rigid parts remain in frame at every sampled angle');
  assert.ok(audit.pieces>60);assert.equal(audit.beforeOpen,0);assert.equal(audit.gap,.26);assert.ok(audit.lift>.4);
  assert.deepEqual(audit.turnOpen,[1,0]);assert.ok(Math.abs(audit.angle-audit.expectedAngle)<1e-8);
  for(const ratios of audit.shared)assert.ok(Math.max(...ratios)-Math.min(...ratios)<1e-8,'all parts reassemble together');
  assert.ok(audit.angles.slice(1).every((angle,i)=>angle<audit.angles[i]),'the camera arc never reverses direction');
  assert.ok(new Set(audit.matrices.slice(0,4).map(m=>JSON.stringify(m))).size===4);
  for(const t of [1.45,2.8,3.65,4.5,5.35,6.9]){
    const r=await page.evaluate(t=>window.armFilm.render(t,true),t);
    await writeFile(new URL(`angle-${t}.png`,out),Buffer.from(r.image.split(',')[1],'base64'));
  }
  await page.goto(base);await page.locator('.has-3d-model').waitFor();
  const film=page.locator('.flight-film');
  await film.evaluate(async v=>{v.pause();await new Promise(r=>{v.addEventListener('seeked',r,{once:true});v.currentTime=4.5;});});
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.flight-model-viewport canvas').count(),1);
  assert.equal(await film.evaluate(v=>getComputedStyle(v).visibility),'hidden');
  for(const [width,height] of [[1440,920],[1440,600],[1024,768],[768,1024],[390,844],[320,740]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(120);
    const geometry=await page.evaluate(()=>{
      const v=document.querySelector('.flight-film').getBoundingClientRect(),m=document.querySelector('.flight-model-viewport').getBoundingClientRect();
      return {delta:Math.max(Math.abs(v.x-m.x),Math.abs(v.y-m.y),Math.abs(v.width-m.width),Math.abs(v.height-m.height)),overflow:document.documentElement.scrollWidth-innerWidth};
    });
    assert.ok(geometry.delta<1,'the 3D viewport matches the video projection on every screen');assert.ok(geometry.overflow<=1);
    await page.screenshot({path:new URL(`orbit-${width}-${height}.png`,out).pathname.slice(1)});
  }
  await page.locator('.theme-toggle').click();await page.waitForTimeout(750);
  await page.screenshot({path:new URL('dark-mobile.png',out).pathname.slice(1)});
  // Context loss must restore the independently rendered 3D video.
  await page.locator('.flight-model-viewport canvas').evaluate(c=>c.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  assert.equal(await page.locator('.has-3d-model').count(),0);
  assert.equal(await film.evaluate(v=>getComputedStyle(v).visibility),'visible');
  const reduced=await browser.newPage({reducedMotion:'reduce',viewport:{width:390,height:844}});
  await reduced.goto(base);await reduced.locator('.has-3d-model').waitFor();await reduced.waitForTimeout(150);
  assert.equal(await reduced.locator('video[data-preview]').evaluate(v=>v.paused),true);
  assert.equal(await reduced.locator('.motion-toggle').isDisabled(),true);
  assert.deepEqual(errors,[]);
  await writeFile(new URL('audit.json',out),JSON.stringify(audit,null,2));
  console.log('PASS continuous camera arc, full pickup, simultaneous assembly, 101 framing samples, six viewports, dark mode, reduced motion and WebGL fallback');
}finally{await browser.close();}
