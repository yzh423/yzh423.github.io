/* The video remains a synchronized fallback and media clock. The live scene
 * supplies opaque, dimensional surfaces above the transparent numeric backdrop. */
import {createArmFilm} from './scripts/arm-3d.js';
const stage=document.querySelector('.print-stage'),film=stage?.querySelector('video');
if(stage&&film&&!navigator.connection?.saveData){
  let model,frame=0,lastRender=0,inView=false,disposed=false;
  const viewport=document.createElement('div');viewport.className='flight-model-viewport';viewport.setAttribute('aria-hidden','true');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const running=()=>inView&&!document.hidden&&document.documentElement.dataset.motion==='running'&&!reduced.matches;
  function render(now){
    frame=0;if(!model||disposed||!inView||document.hidden)return;
    if(lastRender&&now-lastRender<1000/60-.75){frame=requestAnimationFrame(render);return;}
    lastRender=now;
    const t=reduced.matches?model.timing.duration:
      film.currentTime||(document.documentElement.dataset.motion!=='running'?model.timing.duration:0);
    model.render(t);
    if(running()&&!film.paused&&!film.ended)frame=requestAnimationFrame(render);
  }
  function wake(){lastRender=0;if(!frame&&!disposed)frame=requestAnimationFrame(render);}
  function measure(){
    if(!model)return;
    const css=getComputedStyle(film),w=film.clientWidth,h=film.clientHeight;
    const scale=css.objectFit==='contain'?Math.min(w/1440,h/640):Math.max(w/1440,h/640);
    const align=parseFloat(css.objectPosition)/100||.5;
    Object.assign(viewport.style,{left:film.offsetLeft+'px',top:film.offsetTop+'px',width:w+'px',height:h+'px',translate:css.translate});
    Object.assign(model.renderer.domElement.style,{position:'absolute',width:1440*scale+'px',height:640*scale+'px',
      left:(w-1440*scale)*align+'px',top:(h-640*scale)/2+'px'});
    // A bounded framebuffer avoids spending desktop-resolution GPU work on phones.
    const pixels=Math.min(1440,Math.max(720,Math.round(w*devicePixelRatio)));
    model.renderer.setSize(pixels,Math.round(pixels*640/1440),false);
    wake();
  }
  function sync(){cancelAnimationFrame(frame);frame=0;wake();}
  function theme(){if(model){model.theme(document.documentElement.dataset.theme==='dark');wake();}}
  const visible=new IntersectionObserver(([entry])=>{
    inView=entry.isIntersecting&&entry.intersectionRatio>=.3;sync();
  },{threshold:[0,.3]});visible.observe(stage);
  try{
    model=await createArmFilm({live:true});
    model.renderer.domElement.addEventListener('webglcontextlost',event=>{
      event.preventDefault();disposed=true;cancelAnimationFrame(frame);stage.classList.remove('has-3d-model');viewport.remove();
    });
    viewport.append(model.renderer.domElement);stage.insertBefore(viewport,stage.querySelector('#flight-lettering'));
    theme();measure();stage.classList.add('has-3d-model');
    new ResizeObserver(measure).observe(film);
    new MutationObserver(()=>{viewport.style.transform=film.style.transform;}).observe(film,{attributes:true,attributeFilter:['style']});
    for(const event of ['playing','seeked','pause','ended'])film.addEventListener(event,sync);
    document.addEventListener('site:theme',theme);document.addEventListener('site:motion',sync);
    document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
    sync();
  }catch{
    // No WebGL, a shader failure or data saving keeps the pre-rendered 3D film.
    disposed=true;cancelAnimationFrame(frame);viewport.remove();stage.classList.remove('has-3d-model');
    model?.renderer.dispose();visible.disconnect();
  }
}
