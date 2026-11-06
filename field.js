/* Decorative motion only. All research and navigation are native HTML. */
(() => {
  'use strict';
  const enabled = () => document.documentElement.dataset.motion === 'running' && !document.hidden;
  const request = window.requestAnimationFrame.bind(window);
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  // Coordinates are viewport-relative until a frame is drawn: the pointer still maps
  // to the right letter after a native scroll. Touch handlers never cancel scrolling.
  function pointerFor(el, wake) {
    const p = { active: false, cx: 0, cy: 0 };
    const sample = e => {
      if (e.target.closest('a, .motion-toggle')) { clear(); return; }
      p.active = true; p.cx = e.clientX; p.cy = e.clientY; wake();
    };
    const clear = () => { p.active = false; wake(); };
    el.addEventListener('pointermove', sample, {passive: true});
    el.addEventListener('pointerdown', sample, {passive: true});
    el.addEventListener('pointerleave', clear);
    el.addEventListener('pointercancel', clear);
    el.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') clear(); });
    return p;
  }

  function flight(stage) {
    const film = stage.querySelector('video'), canvas = stage.querySelector('canvas');
    const ctx = canvas.getContext('2d'), mask = document.createElement('canvas');
    const sampler = mask.getContext('2d', {willReadFrequently: true});
    let w=0,h=0,groups=[],palette=[],frame=0,last=0,visible=false,intro=false,played=false;
    let ready=false,entry=0,needsEntry=true,fx=0,fy=0,mx=0,my=0,strength=0;
    const pointer = pointerFor(stage, wake);
    function colors() {
      const dark=document.documentElement.dataset.theme==='dark';
      const a=dark?[243,236,221]:[50,47,40], b=dark?[248,169,112]:[171,68,26];
      palette=Array.from({length:12},(_,i)=>'rgb('+a.map((c,j)=>Math.round(c+(b[j]-c)*i/11)).join(',')+')');
    }
    function measure() {
      if (!ctx || !sampler) return;
      w=stage.clientWidth;h=stage.clientHeight;if(!w || !h) return;
      const dpr=Math.min(devicePixelRatio||1,2);
      canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
      mask.width=Math.ceil(w);mask.height=Math.ceil(h);
      const family='Newsreader, Georgia, serif', text='Zhenghao YU';
      sampler.font='500 100px '+family;
      const size=Math.min(w*(w<500?.89:.77)*100/sampler.measureText(text).width,h*.46);
      sampler.font='500 '+size+'px '+family;sampler.textAlign='center';sampler.textBaseline='alphabetic';
      const metric=sampler.measureText(text);
      sampler.fillText(text,w*.5,h*.485+(metric.actualBoundingBoxAscent-metric.actualBoundingBoxDescent)*.5);
      const pixels=sampler.getImageData(0,0,mask.width,mask.height).data;
      const step=clamp(w/370,1.55,3.1);
      groups=Array.from({length:12},()=>[]);
      for(let y=1;y<h;y+=step) for(let x=1+(Math.round(y/step)%2)*step*.28;x<w;x+=step) {
        if(pixels[(Math.floor(y)*mask.width+Math.floor(x))*4+3]<99)continue;
        const phase=x*.021+y*.031, bin=clamp(Math.floor(x/w*13-.5+Math.sin(phase)*.62),0,11);
        groups[bin].push({x,y,dx:0,dy:0,vx:0,vy:0,phase});
      }
      canvas.dataset.radius=(step*(w<500?.51:.38)).toFixed(2);
      ready=groups.some(group=>group.length);
      if(ready)stage.classList.add('has-lettering');
      colors();render(0,true);wake();
    }
    function render(dt,still=false) {
      if(!ready)return false;
      const r=stage.getBoundingClientRect(), px=pointer.cx-r.left,py=pointer.cy-r.top;
      const gain=1-Math.exp(-dt*12), act=pointer.active&&!still;
      if(act && strength<.005){mx=px;my=py;}
      mx+=(px-mx)*gain;my+=(py-my)*gain;
      strength+=((act?1:0)-strength)*gain;
      const tx=act?clamp(px/w-.5,-.5,.5)*32:0, ty=act?clamp(py/h-.5,-.5,.5)*20:0;
      fx+=(tx-fx)*gain;fy+=(ty-fy)*gain;
      if(still)fx=fy=strength=0;
      film.style.transform='translate('+fx.toFixed(2)+'px,'+fy.toFixed(2)+'px) rotate('+(fx*.085).toFixed(3)+'deg)';
      const radius=clamp(w*.12,49,112),dot=Number(canvas.dataset.radius);
      let settling=false;
      ctx.clearRect(0,0,w,h);
      const reveal=still?0:(1-Math.min(1,entry/.84))**3;
      for(let i=0;i<groups.length;i++){
        ctx.fillStyle=palette[i];ctx.beginPath();
        for(const p of groups[i]){
          const ax=p.x-mx,ay=p.y-my,d=Math.max(.1,Math.hypot(ax,ay));
          const push=strength*radius*.65*Math.max(0,1-d/radius)**2;
          // Exact critically damped spring step: stable on 30/60/120 Hz screens.
          const k=13,decay=Math.exp(-k*dt);
          const x=p.dx-ax/d*push,y=p.dy-ay/d*push;
          const qx=(p.vx+k*x)*dt,qy=(p.vy+k*y)*dt;
          p.dx=still?0:(x+qx)*decay+ax/d*push;p.dy=still?0:(y+qy)*decay+ay/d*push;
          p.vx=still?0:(p.vx-k*qx)*decay;p.vy=still?0:(p.vy-k*qy)*decay;
          if(Math.abs(p.dx)+Math.abs(p.dy)>.07)settling=true;
          const cx=p.x+p.dx+((w*.5-p.x)*.28+Math.cos(p.phase)*14)*reveal;
          const cy=p.y+p.dy+Math.sin(p.phase*1.3)*24*reveal;
          ctx.moveTo(cx+dot,cy);ctx.arc(cx,cy,dot,0,Math.PI*2);
        }
        ctx.fill();
      }
      return settling || strength>.005 || Math.abs(fx)+Math.abs(fy)>.08 || reveal>.0001;
    }
    function tick(t){
      frame=0;if(!visible||!intro||!enabled())return;
      const dt=last?clamp((t-last)/1000,.001,.048):1/60;last=t;entry+=dt;
      if(render(dt))frame=request(tick);else last=0;
    }
    function wake(){if(visible&&intro&&enabled()&&ready&&!frame)frame=request(tick);}
    function sync(){
      if(!visible||!intro||!enabled()){
        cancelAnimationFrame(frame);frame=last=0;film.pause();
        if(!enabled()){entry=1;render(0,true);}
        return;
      }
      if(needsEntry){entry=0;played=false;needsEntry=false;}
      if(!navigator.connection?.saveData && (!played || (film.paused&&!film.ended))){
        if(!played)film.currentTime=0;
        played=true;film.play().catch(()=>{}); // The authored poster is always available.
      }
      wake();
    }
    new IntersectionObserver(([e])=>{
      const arrived=e.isIntersecting && e.intersectionRatio>=.30;
      if(visible&&!arrived){needsEntry=true;pointer.active=false;}
      visible=arrived;sync();
    },{threshold:[0,.30]}).observe(stage);
    Promise.resolve(window.identityReady).then(()=>{intro=true;sync();});
    new ResizeObserver(measure).observe(stage);
    document.fonts.ready.then(measure);
    document.addEventListener('site:theme',()=>{colors();render(0,!enabled());wake();});
    document.addEventListener('site:motion',sync);
    navigator.connection?.addEventListener?.('change',()=>{if(navigator.connection.saveData)film.pause();sync();});
  }

  function web(stage) {
    // [parent, desktop x/y, narrow x/y], in fractions of the available field.
    const layout={
      root:[null,.50,.49,.50,.49],
      control:['root',.25,.32,.24,.30], data:['root',.73,.23,.76,.32],
      autonomy:['root',.30,.72,.24,.67], interaction:['root',.76,.70,.76,.70],
      pid:['control',.095,.15,.18,.07], robustness:['control',.36,.10,.34,.18],
      dataset:['data',.60,.07,.66,.08], motion:['data',.91,.14,.83,.20],
      driving:['autonomy',.09,.83,.17,.80], navigation:['autonomy',.39,.91,.33,.94],
      hmi:['interaction',.62,.86,.65,.83], evaluation:['interaction',.91,.88,.83,.95]
    };
    const svg=stage.querySelector('svg');
    const items=Object.entries(layout).map(([key,L],i)=>{
      const button=stage.querySelector(key==='root'?'.graph-center':'[data-node="'+key+'"]');
      return {key,L,i,button,label:button.querySelector('span'),x:0,y:0,u:0,v:0,dx:0,dy:0,vx:0,vy:0};
    });
    const byKey=Object.fromEntries(items.map(n=>[n.key,n])),edges=[];
    function edge(a,b,faint=false){
      const line=document.createElementNS('http://www.w3.org/2000/svg','line');
      line.dataset.from=a;
      if(faint)line.classList.add('thread');else line.dataset.edge=b;
      svg.append(line);edges.push({a:byKey[a],b:byKey[b],line});
    }
    items.filter(n=>n.L[0]).forEach(n=>edge(n.L[0],n.key));
    edge('robustness','autonomy',true);edge('motion','interaction',true);edge('control','data',true);
    for(const n of items.filter(n=>n.key==='root'||n.L[0]==='root')){
      const dot=document.createElementNS(svg.namespaceURI,'circle');
      dot.dataset.hub=n.key;dot.classList.add('junction');
      if(n.key==='root')dot.classList.add('junction-root');
      dot.setAttribute('r',n.key==='root'?'2.6':'1.65');svg.append(dot);n.dot=dot;
    }
    let w,h,t=0,frame=0,last=0,visible=false,narrow=false;
    let mx=0,my=0,weight=0;
    const pointer=pointerFor(stage,start);
    function size(){
      w=stage.clientWidth;h=stage.clientHeight;narrow=matchMedia('(max-width:620px)').matches;
      for(const n of items){
        n.x=w*n.L[narrow?3:1];n.y=h*n.L[narrow?4:2];
        n.button.style.setProperty('--x',n.x+'px');n.button.style.setProperty('--y',n.y+'px');
      }
      paint(0);start();
    }
    function paint(dt){
      if(!w||!h)return;
      const running=enabled(), follow=1-Math.exp(-dt*13);
      if(pointer.active){
        const r=stage.getBoundingClientRect(), px=pointer.cx-r.left, py=pointer.cy-r.top;
        if(weight<.002){mx=px;my=py;} else {mx+=(px-mx)*follow;my+=(py-my)*follow;}
      }
      weight+=((pointer.active && running ? 1 : 0)-weight)*follow;
      const radius=narrow?64:102, stiffness=11, decay=Math.exp(-stiffness*dt);
      for(const n of items){
        const phase=n.i*2.37, amp=(n.key==='root'?.46:1)*(narrow?.60:1);
        const ax=n.x-mx,ay=n.y-my;
        // A continuous field (including directly under the cursor) avoids a direction snap.
        const force=weight*.27*Math.exp(-(ax*ax+ay*ay)/(2*radius*radius));
        const parent=byKey[n.L[0]];
        const tx=(parent?.dx||0)*.19 + amp*(Math.sin(t*.57+phase)*5.5+Math.cos(t*.31-phase)*2.5+ax*force);
        const ty=(parent?.dy||0)*.19 + amp*(Math.cos(t*.49+phase)*5+Math.sin(t*.35+phase)*2+ay*force);
        if(running){
          const x=n.dx-tx,y=n.dy-ty,qx=(n.vx+stiffness*x)*dt,qy=(n.vy+stiffness*y)*dt;
          n.dx=tx+(x+qx)*decay;n.dy=ty+(y+qy)*decay;
          n.vx=(n.vx-stiffness*qx)*decay;n.vy=(n.vy-stiffness*qy)*decay;
        }else{n.dx=n.dy=n.vx=n.vy=0;}
        n.u=(n.x+n.dx).toFixed(2);n.v=(n.y+n.dy).toFixed(2);
        n.label.style.transform='translate('+n.dx.toFixed(2)+'px,'+n.dy.toFixed(2)+'px)';
        if(n.dot){n.dot.setAttribute('cx',n.u);n.dot.setAttribute('cy',n.v);}
      }
      for(const {a,b,line} of edges){
        line.setAttribute('x1',a.u);line.setAttribute('y1',a.v);
        line.setAttribute('x2',b.u);line.setAttribute('y2',b.v);
      }
    }
    function tick(now){
      frame=0;if(!enabled()||!visible)return;
      const dt=last?Math.min(.05,(now-last)/1000):1/60;last=now;t+=dt;paint(dt);frame=request(tick);
    }
    function start(){if(visible&&enabled()&&!frame)frame=request(tick);}
    function sync(){
      if(!visible||!enabled()){cancelAnimationFrame(frame);frame=last=0;if(!enabled())paint(0);}
      else start();
    }
    new ResizeObserver(size).observe(stage);
    new IntersectionObserver(([e])=>{visible=e.isIntersecting;sync();}).observe(stage);
    document.addEventListener('site:motion',sync);
    size();
  }
  flight(document.querySelector('.flight-stage'));
  web(document.querySelector('.graph-stage'));
})();
