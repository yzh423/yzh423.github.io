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
      if (e.target.closest('.flight-action, .motion-toggle, .flight-replay')) { clear(); return; }
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
    const film=stage.querySelector('video'), canvas=stage.querySelector('canvas'), replay=stage.querySelector('.flight-replay');
    const ctx=canvas.getContext('2d'), mask=document.createElement('canvas'), sampler=mask.getContext('2d',{willReadFrequently:true});
    const stillPoster=film.getAttribute('poster'), assemblyTime=1.52;
    const printStage=stage.classList.contains('print-stage');
    let w=0,h=0,groups=[],palette=[],grain=1,frame=0,last=0,visible=false,intro=false,played=false;
    let ready=false,entry=0,needsEntry=true,fx=0,fy=0,mx=0,my=0,strength=0,flowX=0,flowY=0;
    let inkMap, filmUnavailable = false, tint = [], filmAlignment = .5;
    // Use coordinates exported by the engraving renderer. Their origin is the
    // centre of the part, so they stay on the tool throughout the camera move.
    if (film.dataset.inkMap) {
      fetch(film.dataset.inkMap).then(response => {
        if (!response.ok) throw Error('Missing ink map');
        return response.json();
      }).then(map => { inkMap = map; wake(); }).catch(() => { filmUnavailable = true; wake(); });
    }
    const pointer=pointerFor(stage,wake);
    const smooth=n=>n*n*(3-2*n);
    function projectionAt(time) {
      const index = clamp(time * inkMap.fps, 0, inkMap.poses.length - 1);
      const a = inkMap.poses[Math.floor(index)], b = inkMap.poses[Math.ceil(index)];
      const lerp = slot => a[slot] + (b[slot] - a[slot]) * (index % 1);
      const scale = Math.max(w / 1440, h / 540);
      return {
        x: lerp(0)*scale + (w - 1440*scale)*filmAlignment,
        y: lerp(1)*scale + (h - 540*scale)/2,
        radius: lerp(2)*scale
      };
    }
    function colors(){
      const dark=document.documentElement.dataset.theme==='dark';
      const a=dark?[251,244,225]:[44,43,34],b=printStage ? (dark?[224,227,205]:[49,58,51]) : (dark?[255,171,109]:[170,65,20]);
      const pigments = dark ? [[87,222,248],[126,161,255],[199,147,255],[255,142,130]] :
        [[0,141,176],[41,88,213],[129,64,207],[209,68,78]];
      tint = pigments.map(color => Array.from({length:13}, (_,step) =>
        'rgb('+a.map((v,i) => Math.round(v + (color[i]-v)*step/12)).join(',')+')'));
      palette=Array.from({length:18},(_,i)=>'rgb('+a.map((c,j)=>Math.round(c+(b[j]-c)*i/17)).join(',')+')');
    }
    function measure(){
      if(!ctx||!sampler)return;
      w=stage.clientWidth;h=stage.clientHeight;if(!w||!h)return;
      filmAlignment = parseFloat(getComputedStyle(film).objectPosition)/100;
      if (!Number.isFinite(filmAlignment)) filmAlignment = .5;
      const dpr=Math.min(devicePixelRatio||1,2);
      canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
      mask.width=Math.ceil(w);mask.height=Math.ceil(h);
      const family='Newsreader, Georgia, serif',text='Zhenghao YU';
      sampler.textAlign='center';sampler.textBaseline='alphabetic';sampler.font='500 100px '+family;
      const narrow=w<500;
      const widthFraction=printStage ? (narrow?.82:.64) : (narrow?.88:.75);
      const size=Math.min(w*widthFraction*100/sampler.measureText(text).width,h*.47);
      sampler.font='500 '+size+'px '+family;
      const metric=sampler.measureText(text);
      const anchorX=printStage ? (narrow?.46:.36) : .5;
      const anchorY=printStage && narrow ? .60 : .49;
      sampler.fillText(text,w*anchorX,h*anchorY+(metric.actualBoundingBoxAscent-metric.actualBoundingBoxDescent)*.5);
      const pixels=sampler.getImageData(0,0,mask.width,mask.height).data;
      const step=clamp(w/368,1.52,3.15);
      grain=step*(w<500?.87:.75);
      groups=Array.from({length:18},()=>[]);
      // Derive each grain from its cell: resize/replay cannot shuffle the letter shapes.
      let seed=0x629cee73;
      const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      for(let y=1;y<h;y+=step)for(let x=1+(Math.round(y/step)%2)*step*.22;x<w;x+=step){
        if(pixels[(Math.floor(y)*mask.width+Math.floor(x))*4+3]<94)continue;
        const s=rand(), depth=.65+.68*rand(), angle=2*Math.PI*rand(), sign=s<.5?-1:1;
        const sx=w*.5+Math.cos(angle)*w*(.32+.23*depth)-x, sy=h*.46+Math.sin(angle)*h*(.32+.25*depth)-y;
        const bin=clamp(Math.round(17*((x/w-.10)/.80+(s-.5)*.14)),0,17);
        groups[bin].push({x,y,sx,sy,bend:sign*(8+17*rand())*depth,delay:.17*s+.14*x/w,
          mark:Math.floor(rand()*384), phase:rand(), pigment:clamp(Math.floor((x/w + .10*(s-.5))*5),0,3),
          span:.89+.28*depth,size:grain*(.84+.28*rand()),depth,dx:0,dy:0,vx:0,vy:0});
      }
      ready=groups.some(g=>g.length);if(ready)stage.classList.add('has-lettering');
      colors();render(0,!enabled());wake();
    }
    function render(dt,still=false){
      if(!ready)return false;
      ctx.clearRect(0,0,w,h);
      if(!intro&&!still)return false;
      // The media clock also freezes on a network stall. A blocked video or
      // data-saving visit gets the finished signature without a timed blank.
      const transfer = printStage && !still && !filmUnavailable && !navigator.connection?.saveData;
      const filmTime = film.currentTime;
      const pose = transfer && inkMap && filmTime < 4.9 ? projectionAt(filmTime) : null;
      const assembling = transfer && filmTime < 4.9;
      const r=stage.getBoundingClientRect(),px=pointer.cx-r.left,py=pointer.cy-r.top,act=pointer.active&&!still;
      const kFollow=1-Math.exp(-dt*22),kTrail=1-Math.exp(-dt*9);
      if(act&&strength<.002){mx=px;my=py;}
      const moveX=act?(px-mx)*kFollow:0,moveY=act?(py-my)*kFollow:0;
      mx+=moveX;my+=moveY;
      flowX+=(clamp(moveX/Math.max(.001,dt),-1100,1100)-flowX)*kTrail;
      flowY+=(clamp(moveY/Math.max(.001,dt),-1100,1100)-flowY)*kTrail;
      strength+=((act?1:0)-strength)*(1-Math.exp(-dt*14));
      const canTilt=act&&!assembling;
      const tx=canTilt?clamp(px/w-.5,-.5,.5)*Math.min(w*.055,29):0,ty=canTilt?clamp(py/h-.5,-.5,.5)*15:0;
      fx+=(tx-fx)*kTrail;fy+=(ty-fy)*kTrail;
      if(still)fx=fy=strength=flowX=flowY=0;
      film.style.transform='translate('+fx.toFixed(2)+'px,'+fy.toFixed(2)+'px) rotate('+(fx*.049).toFixed(3)+'deg)';
      let movingInk=false;
      const radius=clamp(w*.132,54,142), invRadius=1/radius;
      const vx=flowX*.018,vy=flowY*.018,stroke2=moveX*moveX+moveY*moveY;
      const attack=21,release=10,attackDecay=Math.exp(-dt*attack),releaseDecay=Math.exp(-dt*release);
      for(let i=0;i<groups.length;i++){
        ctx.fillStyle=palette[i];
        for(const p of groups[i]){
          // Sample the swept segment as well as its tip. A fast mouse or a
          // sparsely sampled finger cannot jump over an entire stroke of type.
          const tipX=p.x-mx,tipY=p.y-my;
          const along=stroke2>1?clamp(-(tipX*moveX+tipY*moveY)/stroke2,0,1):0;
          const ax=tipX+along*moveX,ay=tipY+along*moveY,d2=ax*ax+ay*ay;
          let destX=0,destY=0;
          if(act&&!assembling&&d2<radius*radius){
            const dist=Math.sqrt(d2),s=1-clamp(dist*invRadius,0,1);
            const gain=strength*radius*.46*s*s*(.78+.22*p.depth)*(1-.24*along)/Math.sqrt(d2+25);
            const tail=strength*.41*s*s;
            destX=ax*gain+vx*tail;destY=ay*gain+vy*tail;
          }
          // The return is slower than the outward movement. Critical damping
          // settles a grain onto its letter without a bounce.
          const advancing=destX*destX+destY*destY>p.dx*p.dx+p.dy*p.dy;
          const stiffness=advancing?attack:release,decay=advancing?attackDecay:releaseDecay;
          const x=p.dx-destX,y=p.dy-destY,qx=(p.vx+stiffness*x)*dt,qy=(p.vy+stiffness*y)*dt;
          p.dx=still?0:destX+(x+qx)*decay;p.dy=still?0:destY+(y+qy)*decay;
          p.vx=still?0:(p.vx-stiffness*qx)*decay;p.vy=still?0:(p.vy-stiffness*qy)*decay;
          if(Math.abs(p.dx-destX)+Math.abs(p.dy-destY)>.025||Math.abs(p.vx)+Math.abs(p.vy)>.45)movingInk=true;
          else {p.dx=destX;p.dy=destY;p.vx=p.vy=0;}
          let cx=p.x+p.dx,cy=p.y+p.dy,alpha=1;
          if (printStage) {
            if (assembling && (!pose || filmTime < inkMap.contact)) continue;
            let exposure = 0, typeMark = 0;
            if (pose) {
              const mark = inkMap.marks[p.mark % inkMap.marks.length];
              // Adjacent cuts leave the tool in ribbons and settle together.
              const lane = clamp((mark[1]+1880)/2920,0,1);
              const start = inkMap.contact + .05 + lane*.43 + p.phase*.26 + (1-p.x/w)*.32;
              const progress = clamp((filmTime - start)/(1.05 + p.span*.42),0,1);
              if (!progress) continue;
              const ease = progress**3*(10+progress*(6*progress-15));
              const fromX = pose.x + mark[0]*pose.radius/1000;
              const fromY = pose.y + mark[1]*pose.radius/1000;
              const bow = 4*ease*(1-ease);
              cx += (fromX-p.x)*(1-ease);
              cy += (fromY-p.y)*(1-ease) - bow*h*(.075+.14*lane)
                + Math.sin(2*Math.PI*ease)*bow*(lane-.5)*h*.12;
              alpha = smooth(clamp(progress/.32,0,1));
              exposure = bow * (.62 + .36*p.phase);
              typeMark = p.mark%11===0 ? bow : 0;
            }
            const displacement = Math.hypot(p.dx,p.dy);
            const colorStep = Math.round(clamp(Math.max(exposure, displacement/(radius*.17)),0,1)*12);
            ctx.fillStyle = colorStep ? tint[p.pigment][colorStep] : palette[i];
            if(typeMark>.20) {
              ctx.globalAlpha=alpha*typeMark*.78;
              const unit=p.size*(.38+.34*typeMark);
              ctx.fillRect(cx-unit*1.45,cy-2*unit,unit,4*unit);
              ctx.fillRect(cx-unit*.45,cy-2*unit,2*unit,unit);
              ctx.fillRect(cx-unit*.45,cy+(p.mark%2?0:1)*unit,1.6*unit,unit);
            }
          } else if(!still&&entry<assemblyTime){
            const progress=clamp((entry-p.delay)/p.span,0,1),spread=(1-progress)**3;
            cx+=p.sx*spread;cy+=p.sy*spread+Math.sin(progress*Math.PI)*p.bend*(1-progress);
            alpha=.18+.82*smooth(progress);
          }
          ctx.globalAlpha=alpha;
          ctx.fillRect(cx-p.size*.5,cy-p.size*.49,p.size,p.size*.98);
        }
      }
      ctx.globalAlpha=1;
      return !still&&((printStage ? assembling : entry<assemblyTime)||movingInk||Math.abs(tx-fx)+Math.abs(ty-fy)>.035
        || Math.abs(flowX)+Math.abs(flowY)>1||Math.abs((act?1:0)-strength)>.001);
    }
    function tick(t){
      frame=0;if(!visible||!intro||!enabled())return;
      const dt=last?clamp((t-last)/1000,.001,.05):1/60;last=t;entry+=dt;
      if(render(dt))frame=request(tick);else last=0;
    }
    function wake(){if(visible&&intro&&enabled()&&ready&&!frame)frame=request(tick);}
    function sync(){
      const allowFilm=enabled()&&!navigator.connection?.saveData;
      if(!played){
        const poster=allowFilm?film.dataset.openingPoster:stillPoster;
        if(film.getAttribute('poster')!==poster)film.setAttribute('poster',poster);
      }
      replay.hidden=!(visible&&allowFilm&&film.ended&&!needsEntry);
      if(!visible||!intro||!enabled()){
        cancelAnimationFrame(frame);frame=last=0;film.pause();
        if(!enabled()){entry=assemblyTime;render(0,true);}
        return;
      }
      if(needsEntry){entry=0;played=false;needsEntry=false;}
      if(allowFilm&&(!played||(film.paused&&!film.ended))){
        if(!played)film.currentTime=0;
        played=true;
        film.play().then(() => { filmUnavailable=false; wake(); }).catch(error => {
          if (error.name !== 'AbortError') { filmUnavailable=true; wake(); }
        });
      }
      wake();
    }
    film.addEventListener('error', () => { filmUnavailable=true; wake(); });
    film.querySelector('source')?.addEventListener('error', () => { filmUnavailable=true; wake(); });
    replay.addEventListener('click',event=>{
      if(event.detail===0)stage.querySelector('.motion-toggle').focus({preventScroll:true});
      needsEntry=true;sync();
    });
    film.addEventListener('ended',()=>{replay.hidden=!(visible&&enabled()&&!navigator.connection?.saveData);});
    new IntersectionObserver(([e])=>{
      const arrived=e.isIntersecting&&e.intersectionRatio>=.30;
      if(visible&&!arrived){needsEntry=true;pointer.active=false;}
      visible=arrived;sync();
    },{threshold:[0,.30]}).observe(stage);
    intro=true;
    new ResizeObserver(measure).observe(stage);document.fonts.ready.then(measure);
    document.addEventListener('site:theme',()=>{colors();render(0,!enabled());wake();});
    document.addEventListener('site:motion',sync);
    navigator.connection?.addEventListener?.('change',()=>{if(navigator.connection.saveData)film.pause();sync();});
    sync();
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
      svg.append(line);
      if (!faint) {
        // The copy follows the live geometry of the base line, even mid-stroke.
        line.id='map-edge-'+b;
        line.setAttribute('pathLength', '1');
        const ink=document.createElementNS(svg.namespaceURI,'use');
        ink.setAttribute('href','#'+line.id);
        ink.classList.add('map-ink');
        if(a!=='root') ink.classList.add('leaf-ink');
        svg.append(ink);
      }
      edges.push({a:byKey[a],b:byKey[b],line});
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
  document.querySelectorAll('.flight-stage').forEach(flight);
  document.querySelectorAll('.graph-stage').forEach(web);
})();
