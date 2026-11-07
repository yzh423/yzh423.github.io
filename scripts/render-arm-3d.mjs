/* Render the original Three.js scene to a lightweight, deterministic 60 fps film.
 * Run the local server first. PLAYWRIGHT_MODULE and FFMPEG_BIN may override tools.
 */
import {pathToFileURL} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const ffmpeg=process.env.FFMPEG_BIN||execFileSync('python',['-B','-c','import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8'}).trim();
const base=process.env.RENDER_URL||'http://127.0.0.1:8782/';
const folder=new URL('../assets/motion/',import.meta.url);
const scratch=new URL('../output/playwright/arm3d/',import.meta.url);await mkdir(scratch,{recursive:true});
const browser=await chromium.launch({channel:'msedge'});
let encoder;
try{
  const page=await browser.newPage({viewport:{width:1440,height:640}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('scripts/arm-3d.html',base).href);
  await page.waitForFunction(()=>window.armFilm,{timeout:60000});
  const timing=await page.evaluate(()=>window.armFilm.timing),poses=[],bounds=[];
  const frames=timing.duration*timing.fps;
  const video=new URL('grasp-study.mp4',folder);
  encoder=spawn(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','png','-r',String(timing.fps),'-i','pipe:0',
    '-an','-c:v','libx264','-preset','slow','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',video.pathname.slice(1)],{windowsHide:true,stdio:['pipe','ignore','inherit']});
  const encoded=once(encoder,'exit');encoder.stdin.on('error',()=>{});
  for(let i=0;i<frames;i++){
    const frame=await page.evaluate(t=>{const f=window.armFilm;return {...f.render(t,true),bounds:f.bounds()};},i/timing.fps);
    poses.push(frame.pose.map(n=>Math.round(n*100)/100));
    const b=frame.bounds;bounds.push([b.left,b.top,b.right,b.bottom].map(n=>Math.round(n*10000)/10000));
    const png=Buffer.from(frame.image.split(',')[1],'base64');
    if(!encoder.stdin.write(png))await once(encoder.stdin,'drain');
    if(i===0||i===frames-1)await writeFile(new URL(i===0?'opening.png':'settled.png',scratch),png);
    if(i%60===0)console.log(`Rendered ${i}/${frames}`);
  }
  encoder.stdin.end();const [code]=await encoded;if(code!==0)throw Error('Video encoder failed: '+code);
  poses.push((await page.evaluate(t=>window.armFilm.render(t).pose,timing.duration)).map(n=>Math.round(n*100)/100));
  const last=await page.evaluate(()=>window.armFilm.bounds());bounds.push([last.left,last.top,last.right,last.bottom].map(n=>Math.round(n*10000)/10000));
  const marks=await page.evaluate(()=>window.armFilm.inkMarks());
  const data={...timing,live_currents:true,background_strength:.72,flow:'engraved',motion_profile:'cruise',model:'original-3d',
    assembly_mode:'simultaneous',poses,bounds,marks};
  await writeFile(new URL('grasp-ink.json',folder),JSON.stringify(data)+'\n');
  for(const [source,target] of [['opening.png','grasp-study-opening.webp'],['settled.png','grasp-study.webp']])
    execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',new URL(source,scratch).pathname.slice(1),'-quality','92',new URL(target,folder).pathname.slice(1)],{windowsHide:true});
  if(errors.length)throw Error(errors.join('\n'));
  console.log('Rendered 600 frames, posters and synchronized 3D tool projections.');
}finally{if(encoder?.exitCode===null)encoder.kill();await browser.close();}
