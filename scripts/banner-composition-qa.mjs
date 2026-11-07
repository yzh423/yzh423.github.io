import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const base=process.env.SITE_URL||'http://127.0.0.1:8813/';
const out=fileURLToPath(new URL('../output/playwright/banner-composition/',import.meta.url));await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge'}),errors=[],requests=[],report=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:920}});
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.goto(base);await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>document.querySelector('.flight-film').currentTime>.1);
  const film=page.locator('.flight-film');
  const at=async t=>{
    await film.evaluate(async(v,t)=>{v.pause();if(Math.abs(v.currentTime-t)>.001)await new Promise(r=>{v.addEventListener('seeked',r,{once:true});v.currentTime=t;});},t);
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  };
  // Inspect visible video pixels independently of the renderer's exported bounds.
  const geometry=()=>page.evaluate(()=>{
    const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();
    const v=document.querySelector('.flight-film'),vr=v.getBoundingClientRect(),c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;
    const ctx=c.getContext('2d');ctx.drawImage(v,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;
    let l=c.width,t=c.height,r=0,b=0;
    for(let y=0;y<c.height;y+=2)for(let x=0;x<c.width;x+=2)if(255-p[(y*c.width+x)*4+1]>32){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
    const fit=getComputedStyle(v).objectFit,scale=fit==='contain'?Math.min(vr.width/c.width,vr.height/c.height):Math.max(vr.width/c.width,vr.height/c.height);
    const ox=vr.x+(vr.width-c.width*scale)/2,oy=vr.y+(vr.height-c.height*scale)/2;
    const arm={left:ox+l*scale,right:ox+r*scale,top:oy+t*scale,bottom:oy+b*scale};
    const n=document.querySelector('#flight-lettering'),nr=n.getBoundingClientRect(),px=n.getContext('2d').getImageData(0,0,n.width,n.height).data;
    l=n.width;t=n.height;r=0;b=0;
    for(let y=0;y<n.height;y++)for(let x=0;x<n.width;x++)if(px[(y*n.width+x)*4+3]>180){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
    const name={left:nr.x+l/n.width*nr.width,right:nr.x+r/n.width*nr.width,top:nr.y+t/n.height*nr.height,bottom:nr.y+b/n.height*nr.height};
    const controls=[...document.querySelectorAll('.flight-action,.motion-toggle,.flight-replay')].map(e=>e.getBoundingClientRect().toJSON());
    return {stage:rect('.print-stage'),video:vr.toJSON(),arm,name,controls,overflow:document.documentElement.scrollWidth-innerWidth};
  });
  const timing=await film.evaluate(v=>fetch(v.dataset.inkMap).then(r=>r.json()));
  const times=[0,timing.contact,timing.pickup_end,timing.explosion_start,timing.explosion_peak,
    ...Object.values(timing.assembly_stages).map(([a,b])=>(a+b)/2),timing.assembled,
    timing.release+timing.name_duration*.5,timing.settled,timing.duration-.01].sort((a,b)=>a-b);
  for(const [width,height] of [[1440,920],[1440,600],[1024,768],[768,1024],[390,844],[320,740]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(120);
    for(const t of times){
      await at(t);const g=await geometry(),b=g.arm,s=g.stage;
      assert.ok(b.left>=s.left-1&&b.right<=s.right+1&&b.top>=s.top-1&&b.bottom<=s.bottom+1,`${width}x${height} at ${t}s: complete engraved silhouette ${JSON.stringify(g)}`);
      assert.ok(b.left>=g.video.left-1&&b.right<=g.video.right+1&&b.top>=g.video.top-1&&b.bottom<=g.video.bottom+1,`${width}px: the video element itself never crops the source artwork`);
      assert.ok(g.overflow<=1,`${width}px has no horizontal overflow`);
    }
    const g=await geometry(),b=g.arm,gap=width<=850?b.top-g.name.bottom:b.left-g.name.right;
    assert.ok(gap>=10,`${width}px: name and drawing have clear separation (${gap.toFixed(1)}px)`);
    assert.ok(g.controls.every(c=>b.right<c.left||b.left>c.right||b.bottom<c.top||b.top>c.bottom),`${width}px: controls do not cover the drawing ${JSON.stringify(g)}`);
    await page.screenshot({path:out+`/final-${width}-${height}.png`});report.push({width,height,nameGap:Math.round(gap)});
  }
  assert.equal(await page.locator('.flight-model-viewport,.model-tools,script[type="importmap"]').count(),0,'no live 3D surface or rotation controls');
  assert.ok(requests.every(url=>!/(arm-model\.js|\/vendor\/three\/)/.test(url)),'no Three.js downloads');
  assert.deepEqual(errors,[]);await writeFile(out+'/audit.json',JSON.stringify(report,null,2));
  console.log('PASS complete 2D engraving across 16 moments and six sizes, separate signature, clear controls and no live 3D runtime');
}finally{await browser.close();}
