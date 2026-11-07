import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const base=process.env.SITE_URL||'http://127.0.0.1:8813/';
const out=fileURLToPath(new URL('../output/playwright/banner-composition/',import.meta.url));await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge'}),errors=[],report=[];
try{
  const source=await browser.newPage();
  await source.goto(new URL('scripts/arm-3d.html',base).href);await source.waitForFunction(()=>window.armFilm);
  const poses=await source.evaluate(()=>{
    const f=window.armFilm;f.render(10);const direct=f.bounds();
    for(let t=0;t<=10;t+=.05)f.render(t);
    f.render(10);const continuous=f.bounds(),views=[],sequence=[];
    for(let yaw=-Math.PI;yaw<=Math.PI;yaw+=Math.PI/12)for(const pitch of [-.12,0,.2,.43]){
      f.render(10,false,{yaw,pitch,engagement:1});views.push({yaw,pitch,...f.bounds()});
    }
    for(const t of [0,.7,1.45,1.7,2.35,2.7,3.7,4.7,5.7,6.35,6.7,7,7.3,7.8,8.6,9.2,10]){f.render(t);sequence.push({t,...f.bounds()});}
    return {direct,continuous,views,sequence};
  });
  assert.deepEqual(poses.direct,poses.continuous,'seeking and natural playback frame the same model');
  const page=await browser.newPage({viewport:{width:1440,height:920}});
  page.on('pageerror',e=>errors.push(e.message));
  // Observe actual rendered camera state in this test only; production adds no telemetry.
  await page.route('**/arm-model.js*',async route=>{
    const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('model.render(t,false,view);',
      'model.render(t,false,view);window.__armQA={view:{...view},target:{...target}};')});
  });
  await page.goto(base);await page.locator('.has-3d-model').waitFor();await page.evaluate(()=>document.fonts.ready);
  const film=page.locator('.flight-film');
  const at=async t=>{
    await film.evaluate(async(v,t)=>{v.pause();if(Math.abs(v.currentTime-t)>.001)await new Promise(r=>{v.addEventListener('seeked',r,{once:true});v.currentTime=t;});},t);
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  };
  const geometry=()=>page.evaluate(()=>{
    const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();
    const c=document.querySelector('#flight-lettering'),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data,r=c.getBoundingClientRect();
    let l=c.width,t=c.height,rr=0,b=0;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(p[(y*c.width+x)*4+3]>180){l=Math.min(l,x);rr=Math.max(rr,x);t=Math.min(t,y);b=Math.max(b,y);}
    const controls=[...document.querySelectorAll('.flight-action,.motion-toggle,.model-reset')].map(e=>e.getBoundingClientRect().toJSON()).filter(r=>r.width&&r.height);
    return {stage:rect('.print-stage'),canvas:rect('.flight-model-viewport canvas'),controls,name:{left:r.x+l/c.width*r.width,right:r.x+rr/c.width*r.width,top:r.y+t/c.height*r.height,bottom:r.y+b/c.height*r.height}};
  });
  const project=(b,r)=>({left:r.x+(b.left+1)*r.width/2,right:r.x+(b.right+1)*r.width/2,top:r.y+(1-b.top)*r.height/2,bottom:r.y+(1-b.bottom)*r.height/2});
  for(const [width,height] of [[1440,920],[1440,600],[1024,768],[768,1024],[390,844],[320,740]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(120);await at(10);
    const g=await geometry();let minGap=Infinity;
    for(const view of poses.views){
      const b=project(view,g.canvas),gap=width<=850?b.top-g.name.bottom:b.left-g.name.right;minGap=Math.min(minGap,gap);
      assert.ok(gap>=10,`${width}px: name and every inspection view stay separate (${gap.toFixed(1)}px)`);
      assert.ok(b.left>=g.stage.x+3&&b.right<=g.stage.right-3&&b.top>=g.stage.y+3&&b.bottom<=g.stage.bottom-3,
        `${width}x${height}: full arm and fixture stay inside the banner ${JSON.stringify({b,stage:g.stage,view})}`);
      assert.ok(g.controls.every(c=>b.right<c.left||b.left>c.right||b.bottom<c.top||b.top>c.bottom),`${width}x${height}: controls never cover the model ${JSON.stringify({b,controls:g.controls,view})}`);
    }
    await page.screenshot({path:out+`/final-${width}-${height}.png`});
    for(const pose of poses.sequence){
      await at(pose.t);const {stage,canvas}=await geometry(),b=project(pose,canvas);
      assert.ok(b.left>=stage.x-1&&b.right<=stage.right+1&&b.top>=stage.y-1&&b.bottom<=stage.bottom+1,
        `${width}px: no clipped parts during the film at ${pose.t}s: ${JSON.stringify({b,stage})}`);
    }
    report.push({width,height,minimumNameGap:Math.round(minGap)});
  }
  await page.setViewportSize({width:1440,height:920});await at(10);
  const viewport=page.locator('.flight-model-viewport');let point;
  const box=await viewport.boundingBox();
  for(const y of [.3,.5,.7]){for(const x of [.42,.48,.55,.62]){
    await page.mouse.move(box.x+box.width*x,box.y+box.height*y);
    if(await viewport.evaluate(v=>v.classList.contains('over-model'))){point={x:box.x+box.width*x,y:box.y+box.height*y};break;}
  }if(point)break;}
  assert.ok(point,'the model can be picked in the displayed composition');
  await page.mouse.down();
  for(let i=1;i<=8;i++){
    await page.mouse.move(point.x+i*9,point.y+i*2);
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const q=await page.evaluate(()=>window.__armQA);
    assert.ok(Math.abs(q.view.yaw-q.target.yaw)<.001&&Math.abs(q.view.pitch-q.target.pitch)<.001,'drag reaches its current target within two animation frames');
  }
  await page.mouse.up();assert.deepEqual(errors,[]);
  await writeFile(out+'/audit.json',JSON.stringify(report,null,2));
  console.log('PASS no name/model overlap across 100 views and six sizes, complete animated silhouette, deterministic framing, and immediate drag response');
}finally{await browser.close();}
