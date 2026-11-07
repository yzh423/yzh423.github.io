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
    const fieldWidth=112,fieldHeight=56;
    let w=0,h=0,groups=[],palette=[],grain=1,frame=0,last=0,visible=false,intro=false,played=false;
    let ready=false,entry=0,needsEntry=true,fx=0,fy=0,mx=0,my=0,strength=0,flowX=0,flowY=0;
    let inkMap, filmUnavailable = false, tint = [], flowTint = [], filmAlignment = .5, filmFit = 'cover';
    let currentCanvas,currentCtx,currentFrame=0,currentLast=0,currentTime=0,currentPixels,currentBuffer,currentSurface,currentSurfaceCtx,fieldPalette=[];
    let fieldEdges,fieldColumns,fieldPulls;
    // Use coordinates exported by the engraving renderer. Their origin is the
    // centre of the part, so they stay on the tool throughout the camera move.
    if (film.dataset.inkMap) {
      fetch(film.dataset.inkMap).then(response => {
        if (!response.ok) throw Error('Missing ink map');
        return response.json();
      }).then(map => { inkMap = map; setupCurrents(); measure(); wake(); }).catch(() => { filmUnavailable = true; wake(); });
    }
    const pointer=pointerFor(stage,wake);
    const smooth=n=>n*n*(3-2*n);
    const soften=n=>n*n*n*(10+n*(6*n-15));
    function setupCurrents() {
      if(!printStage||!stage.hasAttribute('data-live-currents')||!inkMap.live_currents||currentCanvas)return;
      currentCanvas=document.createElement('canvas');currentCanvas.className='flight-currents';
      currentCanvas.setAttribute('aria-hidden','true');currentCtx=currentCanvas.getContext('2d');
      if(!currentCtx)return;
      currentSurface=document.createElement('canvas');currentSurface.width=fieldWidth;currentSurface.height=fieldHeight;
      currentSurfaceCtx=currentSurface.getContext('2d');
      currentBuffer=currentSurfaceCtx.createImageData(fieldWidth,fieldHeight);currentPixels=currentBuffer.data;
      fieldEdges=new Float32Array(fieldWidth*fieldHeight);
      fieldColumns=new Float32Array(fieldWidth);fieldPulls=new Float32Array(fieldWidth);
      for(let y=0;y<fieldHeight;y++)for(let x=0;x<fieldWidth;x++) {
        const u=x/(fieldWidth-1),v=y/(fieldHeight-1);
        fieldEdges[y*fieldWidth+x]=soften(clamp(Math.min(u,1-u,v,1-v)*9,0,1));
      }
      stage.insertBefore(currentCanvas,film);stage.classList.add('has-currents');
    }
    function filmProjection() {
      const width=inkMap.width??1440,height=inkMap.height??540;
      const sx=film.clientWidth/width,sy=film.clientHeight/height;
      const scale=filmFit==='contain'?Math.min(sx,sy):Math.max(sx,sy);
      return {scale,x:(w-width*scale)*filmAlignment,y:(h-height*scale)/2};
    }
    function drawCurrents(time,still=false) {
      if(!currentCtx||!w||!h||!fieldPalette.length)return;
      const phase=(from,to)=>soften(clamp((time-from)/(to-from),0,1));
      const opening=phase(inkMap.explosion_start??1.22,inkMap.explosion_peak??2.58)*
        (1-phase(inkMap.assembly_start??3.1,inkMap.assembled));
      const handoff=phase(inkMap.release,inkMap.settled);
      const pointerX=mx/w,pointerY=my/h,heat=still?0:strength;
      // One continuous pigment field, not paths or separate floating shapes.
      // A small raster carries slow, broad colour folds across the whole paper;
      // the film supplies its finer engraved texture. No full-size pixel reads.
      const timeX=time*.18,timeY=time*.13;
      for(let x=0;x<fieldWidth;x++) {
        const u=x/(fieldWidth-1);
        fieldColumns[x]=Math.sin(u*4.8-timeY)*.10;
        fieldPulls[x]=heat>.001?heat*Math.exp(-((u-pointerX)**2)*9):0;
      }
      for(let y=0;y<fieldHeight;y++) {
        const v=y/(fieldHeight-1),drift=Math.sin(v*4.2+timeX)*.13;
        const rowPull=heat>.001?Math.exp(-((v-pointerY)**2)*9):0;
        for(let x=0;x<fieldWidth;x++) {
          const u=x/(fieldWidth-1),influence=fieldPulls[x]*rowPull;
          const warpX=u+drift+influence*.08,warpY=v+fieldColumns[x];
          const tide=Math.sin(warpX*4.6+warpY*2.8-timeX)*.5+.5;
          const fold=Math.cos(warpX*3.0-warpY*4.2+timeY)*.5+.5;
          const hue=clamp(.07+tide*.59+fold*.20+opening*.10+influence*.10,0,1);
          const color=fieldPalette[Math.round(hue*255)];
          // Feather into the same white paper at the edges. A continuous centre
          // stays visible throughout the introduction and the resting name.
          const edge=fieldEdges[y*fieldWidth+x];
          const opacity=(.12+.16*fold+.07*opening+.045*influence)*(1-handoff*.18)*edge;
          const index=(y*fieldWidth+x)*4;
          currentPixels[index]=color[0];currentPixels[index+1]=color[1];currentPixels[index+2]=color[2];
          currentPixels[index+3]=Math.round(opacity*255);
        }
      }
      currentSurfaceCtx.putImageData(currentBuffer,0,0);
      currentCtx.clearRect(0,0,w,h);currentCtx.imageSmoothingEnabled=true;
      currentCtx.drawImage(currentSurface,0,0,w,h);
    }
    function currentsAllowed() {
      return currentCtx&&visible&&intro&&enabled()&&!filmUnavailable&&!navigator.connection?.saveData;
    }
    function tickCurrents(now) {
      currentFrame=0;if(!currentsAllowed())return;
      if(currentLast&&now-currentLast<1000/60-.75){currentFrame=request(tickCurrents);return;}
      const dt=currentLast?Math.min(.05,(now-currentLast)/1000):1/60;currentLast=now;
      // Follow the film until its last frame, then continue the very same
      // phase. The lettering canvas can sleep while the pigment field flows.
      currentTime=film.ended?Math.max(currentTime,film.currentTime)+dt:film.currentTime;
      drawCurrents(currentTime);currentFrame=request(tickCurrents);
    }
    function syncCurrents() {
      if(!currentCtx)return;
      if(!currentsAllowed()) {
        cancelAnimationFrame(currentFrame);currentFrame=currentLast=0;
        if(visible)drawCurrents(played?currentTime:inkMap.settled,true);
      } else if(!currentFrame)currentFrame=request(tickCurrents);
    }
    function flowProgress(p,time) {
      const delay=.08+p.lane*.20+(1-p.x/w)*.35+p.phase*.06;
      return clamp((time-inkMap.release-delay)/inkMap.name_duration,0,1);
    }
    function flowPoint(p,pose,progress) {
      // Neighbouring cuts remain a family of flowing lines, rather than
      // spreading radially from a single cloud beside the jaws.
      const index=Math.min(inkMap.marks.length-1,Math.floor((p.lane*.88+p.phase*.12)*inkMap.marks.length));
      const mark=inkMap.marks[index],u=soften(progress),v=1-u;
      const x=pose.x+mark[0]*pose.radius/1000,y=pose.y+mark[1]*pose.radius/1000;
      const reach=Math.max(w*.16,Math.abs(x-p.x));
      const c1x=x-reach*.30,c1y=y-h*(.10+.10*p.lane);
      const c2x=p.x+reach*.21,c2y=p.y-h*(.06+.07*p.lane);
      return [v*v*v*x+3*v*v*u*c1x+3*v*u*u*c2x+u*u*u*p.x,
        v*v*v*y+3*v*v*u*c1y+3*v*u*u*c2y+u*u*u*p.y];
    }
    function projectionAt(time) {
      const index = clamp(time * inkMap.fps, 0, inkMap.poses.length - 1);
      const a = inkMap.poses[Math.floor(index)], b = inkMap.poses[Math.ceil(index)];
      const lerp = slot => a[slot] + (b[slot] - a[slot]) * (index % 1);
      const view=filmProjection(),scale=view.scale;
      return {
        x: lerp(0)*scale + view.x,
        y: lerp(1)*scale + view.y,
        radius: lerp(2)*scale
      };
    }
    function colors(){
      const dark=document.documentElement.dataset.theme==='dark';
      const a=dark?[251,244,225]:[44,43,34],b=printStage ? (dark?[224,227,205]:[49,58,51]) : (dark?[255,171,109]:[170,65,20]);
      const pigments = dark ? [[87,222,248],[126,161,255],[199,147,255],[255,142,130]] :
        [[0,141,176],[41,88,213],[129,64,207],[184,96,57]];
      tint = pigments.map(color => Array.from({length:13}, (_,step) =>
        'rgb('+a.map((v,i) => Math.round(v + (color[i]-v)*step/12)).join(',')+')'));
      flowTint=Array.from({length:64},(_,phase)=>{
        const t=phase/63*3,lo=Math.min(2,Math.floor(t)),blend=t-lo;
        const colour=pigments[lo].map((v,i)=>v+(pigments[lo+1][i]-v)*blend);
        return Array.from({length:13},(_,step)=>
          'rgb('+a.map((v,i)=>Math.round(v+(colour[i]-v)*step/12)).join(',')+')');
      });
      palette=Array.from({length:18},(_,i)=>'rgb('+a.map((c,j)=>Math.round(c+(b[j]-c)*i/17)).join(',')+')');
      fieldPalette=Array.from({length:256},(_,step)=>{
        const position=step/255*3,lo=Math.min(2,Math.floor(position)),blend=position-lo;
        return pigments[lo].map((channel,i)=>Math.round(channel+(pigments[lo+1][i]-channel)*blend));
      });
    }
    function measure(){
      if(!ctx||!sampler)return;
      w=stage.clientWidth;h=stage.clientHeight;if(!w||!h)return;
      filmAlignment = parseFloat(getComputedStyle(film).objectPosition)/100;
      filmFit = getComputedStyle(film).objectFit;
      if (!Number.isFinite(filmAlignment)) filmAlignment = .5;
      const dpr=Math.min(devicePixelRatio||1,2);
      canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
      if(currentCtx) {
        currentCanvas.width=canvas.width;currentCanvas.height=canvas.height;
        currentCtx.setTransform(dpr,0,0,dpr,0,0);
      }
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
      const baseline=h*anchorY+(metric.actualBoundingBoxAscent-metric.actualBoundingBoxDescent)*.5;
      const top=baseline-metric.actualBoundingBoxAscent,letterHeight=metric.actualBoundingBoxAscent+metric.actualBoundingBoxDescent;
      sampler.fillText(text,w*anchorX,baseline);
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
        groups[bin].push({x,y,sx,sy,lane:clamp((y-top)/letterHeight,0,1),bend:sign*(8+17*rand())*depth,delay:.17*s+.14*x/w,
          mark:Math.floor(rand()*384), phase:rand(), pigment:clamp(Math.floor((x/w + .10*(s-.5))*5),0,3),
          span:.89+.28*depth,size:grain*(.84+.28*rand()),depth,dx:0,dy:0,vx:0,vy:0,driftX:0,driftY:0,hue:.12});
      }
      ready=groups.some(g=>g.length);if(ready)stage.classList.add('has-lettering');
      colors();render(0,!enabled());syncCurrents();wake();
    }
    function render(dt,still=false){
      if(!ready)return false;
      ctx.clearRect(0,0,w,h);
      if(!intro&&!still)return false;
      // The media clock also freezes on a network stall. A blocked video or
      // data-saving visit gets the finished signature without a timed blank.
      const transfer = printStage && !still && !filmUnavailable && !navigator.connection?.saveData;
      const filmTime = film.currentTime;
      const releaseAt = inkMap?.release ?? inkMap?.contact ?? 1.93;
      const settledAt = inkMap?.settled ?? 4.9;
      const pose = transfer && inkMap && filmTime < settledAt ? projectionAt(filmTime) : null;
      const assembling = transfer && filmTime < settledAt;
      const r=stage.getBoundingClientRect(),px=pointer.cx-r.left,py=pointer.cy-r.top,act=pointer.active&&!still;
      const kFollow=1-Math.exp(-dt*18),kTrail=1-Math.exp(-dt*6);
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
      const radius=clamp(w*.14,60,160), invRadius=1/radius;
      const speed=Math.hypot(flowX,flowY),directionX=flowX/Math.max(speed,1),directionY=flowY/Math.max(speed,1);
      const drive=radius*.48*(1-Math.exp(-speed/340)),stroke2=moveX*moveX+moveY*moveY;
      const driftDecay=Math.exp(-dt*2.8),pickup=1-Math.exp(-dt*16);
      const attack=15,release=6.3,attackDecay=Math.exp(-dt*attack),releaseDecay=Math.exp(-dt*release);
      const engraved=pose&&inkMap.flow==='engraved';
      for(let i=0;i<groups.length;i++){
        ctx.fillStyle=palette[i];
        for(const p of groups[i]){
          // Sample the swept segment as well as its tip. A fast mouse or a
          // sparsely sampled finger cannot jump over an entire stroke of type.
          const tipX=p.x-mx,tipY=p.y-my;
          const along=stroke2>1?clamp(-(tipX*moveX+tipY*moveY)/stroke2,0,1):0;
          const ax=tipX+along*moveX,ay=tipY+along*moveY,d2=ax*ax+ay*ay;
          p.driftX*=driftDecay;p.driftY*=driftDecay;
          let destX=0,destY=0,carrying=false,hovering=false;
          if(act&&!assembling&&d2<radius*radius){
            const dist=Math.sqrt(d2),s=1-clamp(dist*invRadius,0,1);
            const influence=strength*s*s*(.78+.22*p.depth);
            // Position keeps a clear pocket open even at zero pointer speed.
            // Use the resting glyph position, so the equilibrium cannot chatter.
            const reach=radius*.56*strength*s**1.2*(.75+.20*p.depth);
            const angle=p.phase*Math.PI*2,normal=Math.max(dist,1);
            destX=(dist>1?ax/normal:Math.cos(angle))*reach;
            destY=(dist>1?ay/normal:Math.sin(angle))*reach;
            hovering=true;
            if(speed>12) {
              const bend=(p.lane-.5)*drive*.22;
              const targetX=(directionX*drive-directionY*bend)*influence;
              const targetY=(directionY*drive+directionX*bend)*influence;
              p.driftX+=(targetX-p.driftX)*pickup;
              p.driftY+=(targetY-p.driftY)*pickup;
              carrying=true;
            }
          }
          if(still)p.driftX=p.driftY=0;
          destX+=p.driftX;destY+=p.driftY;
          const hueTarget=(hovering||carrying)?.10+p.lane*.22:1;
          if((hovering||carrying)&&Math.hypot(p.dx,p.dy)<.2)p.hue=hueTarget;
          p.hue+=(hueTarget-p.hue)*(1-Math.exp(-dt*(carrying?5:1.5)));
          // The return is slower than the outward movement. Critical damping
          // settles a grain onto its letter without a bounce.
          const advancing=destX*destX+destY*destY>p.dx*p.dx+p.dy*p.dy;
          const stiffness=advancing?attack:release,decay=advancing?attackDecay:releaseDecay;
          const x=p.dx-destX,y=p.dy-destY,qx=(p.vx+stiffness*x)*dt,qy=(p.vy+stiffness*y)*dt;
          p.dx=still?0:destX+(x+qx)*decay;p.dy=still?0:destY+(y+qy)*decay;
          p.vx=still?0:(p.vx-stiffness*qx)*decay;p.vy=still?0:(p.vy-stiffness*qy)*decay;
          if(Math.abs(p.dx-destX)+Math.abs(p.dy-destY)>.025||Math.abs(p.vx)+Math.abs(p.vy)>.45
            ||Math.hypot(p.driftX,p.driftY)>.025||(Math.hypot(p.dx,p.dy)>.3&&Math.abs(p.hue-hueTarget)>.005))movingInk=true;
          else {p.dx=destX;p.dy=destY;p.vx=p.vy=0;}
          let cx=p.x+p.dx,cy=p.y+p.dy,alpha=1,grainScale=1;
          if (printStage) {
            if (assembling && (!pose || filmTime < releaseAt)) continue;
            let exposure = 0, typeMark = 0, flowTail=null, flowStrength=0, flowColour=null;
            if (engraved) {
              const progress=flowProgress(p,filmTime);
              if(progress<=0)continue;
              [cx,cy]=flowPoint(p,pose,progress);
              const envelope=Math.sin(Math.PI*progress)**2;
              // Keep travelling ink filament-thin. It gains weight only as
              // each cut reaches its letter, avoiding a dense cloud at source.
              const arrival=soften(clamp((progress-.25)/.70,0,1));
              alpha=.10+.90*arrival;
              grainScale=.44+.56*arrival;
              exposure=envelope*(.66+.30*p.phase);
              flowColour=flowTint[Math.round(progress*63)];
              if(p.mark%12===0&&progress<.98) {
                flowTail=flowPoint(p,pose,Math.max(0,progress-.018-.018*envelope));
                flowStrength=envelope;
              }
            } else if (pose) {
              const mark = inkMap.marks[p.mark % inkMap.marks.length];
              // Adjacent cuts leave the tool in ribbons and settle together.
              const lane = clamp((mark[1]+1880)/2920,0,1);
              const stagger = (lane*.43 + p.phase*.26 + (1-p.x/w)*.32)*(inkMap.name_stagger ?? 1);
              const start = releaseAt + .05 + stagger;
              const duration = inkMap.name_duration ?? (1.05 + p.span*.42);
              const progress = clamp((filmTime - start)/duration,0,1);
              if (!progress) continue;
              const ease = progress**3*(10+progress*(6*progress-15));
              const fromX = pose.x + mark[0]*pose.radius/1000;
              const fromY = pose.y + mark[1]*pose.radius/1000;
              const bow = 4*ease*(1-ease);
              cx += (fromX-p.x)*(1-ease);
              cy += (fromY-p.y)*(1-ease) - bow*h*(.075+.14*lane)
                + Math.sin(2*Math.PI*ease)*bow*(lane-.5)*h*.12;
              alpha = smooth(clamp(progress/(inkMap.fade_in ?? .32),0,1));
              exposure = bow * (.62 + .36*p.phase);
              typeMark = p.mark%11===0 ? bow : 0;
            }
            const displacement = Math.hypot(p.dx,p.dy);
            const activity=clamp(displacement/(radius*.10),0,.90);
            if(!assembling&&!still) {
              flowColour=flowTint[Math.round(p.hue*63)];
              if(p.mark%12===0&&activity>.035) {
                flowTail=[cx-clamp(p.vx*.075,-15,15),cy-clamp(p.vy*.075,-15,15)];
                flowStrength=activity*.75;
              }
            }
            const colorStep = Math.round(clamp(Math.max(exposure,activity),0,1)*12);
            ctx.fillStyle = colorStep ? (flowColour ?? tint[p.pigment])[colorStep] : palette[i];
            if(flowTail) {
              ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=Math.max(.6,p.size*.48);
              ctx.globalAlpha=flowStrength*.32;
              ctx.beginPath();ctx.moveTo(flowTail[0],flowTail[1]);ctx.lineTo(cx,cy);ctx.stroke();
              if(!assembling&&p.mark%36===0) {
                ctx.globalAlpha=flowStrength*.035;ctx.lineWidth=p.size*3;ctx.stroke();
              }
            }
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
          const size=p.size*grainScale;
          ctx.fillRect(cx-size*.5,cy-size*.49,size,size*.98);
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
        syncCurrents();
        return;
      }
      if(needsEntry){entry=0;played=false;needsEntry=false;}
      if(allowFilm&&(!played||(film.paused&&!film.ended))){
        if(!played)film.currentTime=0;
        played=true;
        film.play().then(() => { filmUnavailable=false; syncCurrents(); wake(); }).catch(error => {
          if (error.name !== 'AbortError') { filmUnavailable=true; wake(); }
        });
      }
      syncCurrents();wake();
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
    document.addEventListener('site:theme',()=>{colors();render(0,!enabled());drawCurrents(currentTime,!enabled());wake();});
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
