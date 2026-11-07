/* The video remains a synchronized fallback and media clock. The live scene
 * supplies opaque, dimensional surfaces above the transparent numeric backdrop. */
import {createArmFilm} from './scripts/arm-3d.js?v=metal-touch-1';
const stage=document.querySelector('.print-stage'),film=stage?.querySelector('video');
if(stage&&film&&!navigator.connection?.saveData){
  let model,frame=0,lastRender=0,inView=false,disposed=false,drag=null,touchDrag=false;
  const viewport=document.createElement('div');viewport.className='flight-model-viewport';viewport.setAttribute('aria-hidden','true');
  const toolbar=stage.querySelector('.model-tools'),reset=toolbar.querySelector('button');
  const view={yaw:0,pitch:0,engagement:0},target={...view};
  viewport.setAttribute('role','group');viewport.setAttribute('aria-describedby','model-instructions');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const running=()=>inView&&!document.hidden&&document.documentElement.dataset.motion==='running'&&!reduced.matches;
  const ready=()=>model&&(reduced.matches||film.ended||film.currentTime>=model.timing.settled||
    (!film.currentTime&&document.documentElement.dataset.motion!=='running'));
  function label(){viewport.setAttribute('aria-label',document.documentElement.lang==='zh-CN'?
    '机械臂视角。拖动旋转，方向键调整，Home 键复位。':'Robot arm view. Drag or use arrow keys to rotate. Home resets the view.');}
  function inspectState(){
    const active=ready();toolbar.hidden=!active;viewport.classList.toggle('is-interactive',active);
    viewport.tabIndex=active?0:-1;viewport.setAttribute('aria-hidden',String(!active));
    if(!active){Object.assign(view,{yaw:0,pitch:0,engagement:0});Object.assign(target,view);finishDrag();delete stage.dataset.modelOrbit;}
  }
  function render(now){
    frame=0;if(!model||disposed||!inView||document.hidden)return;
    if(lastRender&&now-lastRender<1000/60-.75){frame=requestAnimationFrame(render);return;}
    const dt=lastRender?Math.min(.05,(now-lastRender)/1000):1/60;lastRender=now;
    const t=reduced.matches?model.timing.duration:
      film.currentTime||(document.documentElement.dataset.motion!=='running'?model.timing.duration:0);
    const follow=reduced.matches?1:1-Math.exp(-dt*20);
    let moving=false;
    for(const key of ['yaw','pitch','engagement']){
      view[key]+=(target[key]-view[key])*follow;
      if(Math.abs(target[key]-view[key])>.00015)moving=true;else view[key]=target[key];
    }
    model.render(t,false,view);
    if(!moving&&target.engagement===0)delete stage.dataset.modelOrbit;
    if((running()&&!film.paused&&!film.ended)||moving)frame=requestAnimationFrame(render);
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
  function sync(){cancelAnimationFrame(frame);frame=0;inspectState();wake();}
  function theme(){if(model){model.theme(document.documentElement.dataset.theme==='dark');wake();}}
  function rotate(yaw,pitch){
    target.yaw+=yaw;target.pitch=Math.max(-.12,Math.min(.43,target.pitch+pitch));target.engagement=1;
    stage.dataset.modelOrbit='true';stage.dispatchEvent(new Event('model:drag'));wake();
  }
  function finishDrag(){
    const previous=drag;drag=null;delete stage.dataset.modelDragging;
    if(previous&&viewport.hasPointerCapture(previous.id))viewport.releasePointerCapture(previous.id);
  }
  function resetView(){finishDrag();Object.assign(target,{yaw:0,pitch:0,engagement:0});wake();}
  function onModel(e){
    const r=model.renderer.domElement.getBoundingClientRect();
    return model.hit((e.clientX-r.x)/r.width*2-1,1-(e.clientY-r.y)/r.height*2);
  }
  viewport.addEventListener('pointerdown',e=>{
    if(!ready()||e.button!==0||e.isPrimary===false||!onModel(e))return;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,touch:e.pointerType==='touch',active:false};
    if(!drag.touch){e.preventDefault();viewport.focus({preventScroll:true});}
  });
  viewport.addEventListener('pointermove',e=>{
    if(!ready())return;
    if(!drag){viewport.classList.toggle('over-model',onModel(e));return;}
    if(e.pointerId!==drag.id)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(!drag.active){
      if(Math.hypot(dx,dy)<5)return;
      if(drag.touch&&Math.abs(dy)>Math.abs(dx)){finishDrag();return;}
      drag.active=true;touchDrag=drag.touch;viewport.setPointerCapture(e.pointerId);stage.dataset.modelDragging='true';
    }
    e.preventDefault();
    rotate(-(e.clientX-drag.lastX)*.007,(e.clientY-drag.lastY)*(drag.touch?0:.004));
    drag.lastX=e.clientX;drag.lastY=e.clientY;
  },{passive:false});
  for(const event of ['pointerup','pointercancel'])viewport.addEventListener(event,finishDrag);
  // Touch initially captures the canvas. Transferring that capture to its
  // viewport emits a bubbling loss from the canvas, not the active drag.
  viewport.addEventListener('lostpointercapture',e=>{if(e.target===viewport)finishDrag();});
  viewport.addEventListener('touchend',e=>{if(touchDrag)e.stopPropagation();touchDrag=false;},{passive:true});
  viewport.addEventListener('touchcancel',()=>{touchDrag=false;},{passive:true});
  viewport.addEventListener('keydown',e=>{
    if(!ready()||e.altKey||e.metaKey||e.ctrlKey)return;
    const moves={ArrowLeft:[-.18,0],ArrowRight:[.18,0],ArrowUp:[0,.08],ArrowDown:[0,-.08]};
    if(!moves[e.key]&&!['Home','Escape'].includes(e.key))return;
    e.preventDefault();e.stopPropagation();
    if(moves[e.key])rotate(...moves[e.key]);else resetView();
  });
  reset.addEventListener('click',e=>{resetView();if(e.detail===0)viewport.focus({preventScroll:true});});
  const visible=new IntersectionObserver(([entry])=>{
    inView=entry.isIntersecting&&entry.intersectionRatio>=.3;sync();
  },{threshold:[0,.3]});visible.observe(stage);
  try{
    model=await createArmFilm({live:true});
    model.renderer.domElement.addEventListener('webglcontextlost',event=>{
      event.preventDefault();disposed=true;cancelAnimationFrame(frame);stage.classList.remove('has-3d-model');viewport.remove();toolbar.hidden=true;
    });
    viewport.append(model.renderer.domElement);stage.insertBefore(viewport,stage.querySelector('#flight-lettering'));
    label();theme();measure();stage.classList.add('has-3d-model');
    new ResizeObserver(measure).observe(film);
    new MutationObserver(()=>{viewport.style.transform=film.style.transform;}).observe(film,{attributes:true,attributeFilter:['style']});
    for(const event of ['playing','seeked','pause','ended'])film.addEventListener(event,sync);
    document.addEventListener('site:theme',theme);document.addEventListener('site:motion',sync);
    document.addEventListener('site:language',label);
    document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
    sync();
  }catch{
    // No WebGL, a shader failure or data saving keeps the pre-rendered 3D film.
    disposed=true;cancelAnimationFrame(frame);viewport.remove();toolbar.hidden=true;stage.classList.remove('has-3d-model');
    model?.renderer.dispose();visible.disconnect();
  }
}
