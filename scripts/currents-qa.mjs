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
  await page.goto(base);await page.locator('.flight-currents').waitFor();
  await page.waitForFunction(()=>document.querySelector('.flight-film').currentTime>.1);
  const film=page.locator('.flight-film'),currents=page.locator('.flight-currents'),letters=page.locator('#flight-lettering');
  const snapshot=canvas=>canvas.evaluate(c=>c.toDataURL());
  const timing=await film.evaluate(async v=>fetch(v.dataset.inkMap).then(r=>r.json()));
  const colour=()=>currents.evaluate(c=>{
    const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    const rgb=[0,0,0];let weight=0;
    for(let y=.2;y<.81;y+=.06)for(let x=.2;x<.81;x+=.06) {
      const i=(Math.floor(y*c.height)*c.width+Math.floor(x*c.width))*4,a=pixels[i+3]/255;
      for(let channel=0;channel<3;channel++)rgb[channel]+=pixels[i+channel]*a;
      weight+=a;
    }
    return rgb.map(value=>value/weight);
  });
  const exposure=async time=>{
    await film.evaluate(async(v,t)=>{v.pause();await new Promise(r=>{v.addEventListener('seeked',r,{once:true});v.currentTime=t;});},time);
    await page.waitForTimeout(80);return colour();
  };
  const cyan=await exposure(timing.contact*.7),amber=await exposure(timing.explosion_peak+.3);
  const magenta=await exposure(timing.assembled+.12),green=await exposure(timing.settled-1.1);
  assert.ok(cyan[2]>cyan[0]+90,'opening exposure is visibly cyan');
  assert.ok(amber[0]>amber[2]+90,'exploded exposure turns amber');
  assert.ok(magenta[0]>magenta[1]+70&&magenta[2]>magenta[1]+70,'assembly exposure turns magenta');
  assert.ok(green[1]>green[0]+30&&green[1]>green[2]+30,'name transfer passes through green');
  const at=t=>timing.poses[Math.round(t*timing.fps)];
  const early=at(timing.release+timing.name_duration*.40),late=at(timing.release+timing.name_duration*.85);
  assert.ok(Math.hypot(late[0]-early[0],late[1]-early[1])>40,'the wrist travels while the name is forming');
  assert.ok(timing.movement_end>timing.release+timing.name_duration && timing.movement_end<timing.settled);
  await film.evaluate(async(v,t)=>{v.pause();await new Promise(r=>{v.addEventListener('seeked',r,{once:true});v.currentTime=t;});},timing.settled+.03);
  await page.waitForTimeout(150);
  const coverage=await currents.evaluate(c=>{
    const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let textured=0,total=0;
    for(let y=.15;y<.86;y+=.05)for(let x=.15;x<.86;x+=.05) {
      let low=255,high=0;
      const left=Math.floor(x*c.width),top=Math.floor(y*c.height);
      // Test a glyph-sized patch: a digital surface has transparent spaces
      // between strokes, unlike the former solid colour wash.
      for(let dy=0;dy<16;dy++)for(let dx=0;dx<16;dx++) {
        const alpha=data[((top+dy)*c.width+left+dx)*4+3];
        low=Math.min(low,alpha);high=Math.max(high,alpha);
      }
      total++;if(high>12 && high-low>8)textured++;
    }
    return textured/total;
  });
  assert.ok(coverage>.95,'visible digital texture fills the banner, with spaces between the glyph strokes');
  const idle=await snapshot(currents),rect=await currents.boundingBox();
  await page.mouse.move(rect.x+rect.width*.23,rect.y+rect.height*.57);
  await page.mouse.move(rect.x+rect.width*.42,rect.y+rect.height*.40,{steps:14});
  await page.waitForTimeout(250);
  assert.notEqual(await snapshot(currents),idle,'currents respond to the same pointer even at a fixed media time');
  assert.equal(await film.evaluate(v=>v.currentTime),timing.settled+.03);
  await page.mouse.move(20,20);await page.waitForTimeout(3000);
  await film.evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('.flight-film').ended);
  const name=await snapshot(letters),a=await snapshot(currents);
  await page.waitForTimeout(550);
  assert.notEqual(await snapshot(currents),a,'the background continues after the movie ends');
  assert.equal(await snapshot(letters),name,'resting letters do not need to redraw with the background');
  assert.equal(await film.evaluate(v=>v.currentTime),await film.evaluate(v=>v.duration));
  await page.screenshot({path:out+'/living-currents.png'});
  const restingColour=await colour();await page.waitForTimeout(5700);
  const nextColour=await colour();
  assert.ok(Math.hypot(...nextColour.map((value,i)=>value-restingColour[i]))>110,
    'the finished banner continues to change its dominant colour after the film ends');
  assert.equal(await snapshot(letters),name,'the colour cycle leaves the resting name intact');
  await page.locator('.motion-toggle').click();await page.waitForTimeout(120);
  const paused=await snapshot(currents);await page.waitForTimeout(350);
  assert.equal(await snapshot(currents),paused,'pause stills the live background');
  await page.locator('.motion-toggle').click();await page.waitForTimeout(350);
  assert.notEqual(await snapshot(currents),paused,'resume continues the background without replaying the movie');
  assert.ok(await film.evaluate(v=>v.ended));
  await page.locator('.chapter-next').click();await page.waitForFunction(()=>!document.documentElement.dataset.turn);
  const hidden=await snapshot(currents);await page.waitForTimeout(350);
  assert.equal(await snapshot(currents),hidden,'offscreen currents stop rendering');
  const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await reduced.goto(base);await reduced.locator('.flight-currents').waitFor();await reduced.evaluate(()=>document.fonts.ready);
  await reduced.waitForTimeout(150);const still=await reduced.locator('.flight-currents').evaluate(c=>c.toDataURL());
  await reduced.waitForTimeout(400);
  assert.equal(await reduced.locator('.flight-currents').evaluate(c=>c.toDataURL()),still);
  assert.ok(await reduced.locator('.flight-film').evaluate(v=>v.paused));
  assert.deepEqual(errors,[]);
  console.log('PASS four distinct colour exposures and ambient colour cycle; full digital surface; linked pointer; pause, resume, offscreen and reduced motion');
} finally {await browser.close();}
