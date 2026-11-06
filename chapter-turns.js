/* One optical exposure for every chapter. Reversing the wheel samples the
   same aperture in reverse, even when the reader turns back halfway through. */
(() => {
  'use strict';
  const tau=2*Math.PI;
  const pigment=['#139aa4','#4268b4','#8867b2'];
  const nightPigment=['#8be5dd','#a6c4ff','#d1a2ed'];
  const glyphs='MOTION012';
  // Stable screen positions avoid sparkling noise between animation frames.
  const samples=Array.from({length:230},(_,i)=>{
    const angle=i*2.399963229728653;
    const phase=((Math.imul(i+3,2654435761)>>>0)/4294967296);
    return {x:Math.cos(angle),y:Math.sin(angle),depth:phase,channel:i%3,mark:i%9};
  });

  function drawEdge(ctx,x,y,rx,ry,t,colour) {
    const weight=Math.sin(Math.PI*t);
    if(weight<.008) return;
    // The first pass is a translucent emulsion; the other two are its fine
    // engraved edges. Most of the screen stays at full reading contrast.
    ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,tau);
    ctx.strokeStyle=colour[0];ctx.lineWidth=10;ctx.globalAlpha=.12*weight;ctx.stroke();
    ctx.lineWidth=1.35;ctx.globalAlpha=.85*weight;ctx.stroke();
    for(let band=0;band<6;band++) {
      const gap=(band%2?4:10)*weight;
      const a=band*tau/6 + t*.29;
      ctx.beginPath();ctx.ellipse(x,y,rx+gap,ry+gap,0,a,a+.70);
      ctx.strokeStyle=colour[(band+1)%3];ctx.lineWidth=band%2?1.45:.85;
      ctx.globalAlpha=weight*(band%2?.72:.47);ctx.stroke();
    }
    ctx.font='7px ui-monospace, monospace';
    for(const grain of samples) {
      const gap=(grain.depth-.27)*30*weight;
      const px=x+(rx+gap)*grain.x,py=y+(ry+gap)*grain.y;
      ctx.fillStyle=colour[grain.channel];
      ctx.globalAlpha=weight*(.30+.50*grain.depth);
      if(grain.mark===1) ctx.fillText(glyphs[grain.channel*3],px,py);
      else ctx.fillRect(px,py,1.05+grain.depth,1.15);
    }
    ctx.globalAlpha=1;
  }

  function create(outgoing,incoming,direction,change) {
    const startY=outgoing.getBoundingClientRect().top;
    change();
    const shift=startY-outgoing.getBoundingClientRect().top;
    const front=direction>0 ? incoming : outgoing;
    const back=direction>0 ? outgoing : incoming;
    const bounds=incoming.getBoundingClientRect();
    const w=incoming.clientWidth,h=incoming.clientHeight;
    const x=w*.62,y=h*.49;
    // Use the farthest corner to close the exposure exactly on any aspect ratio.
    const extent=Math.hypot(Math.max(x,w-x)/w,Math.max(y,h-y)/h)+.018;
    const overlay=document.createElement('canvas');
    const dpr=Math.min(devicePixelRatio||1,1.5);
    overlay.className='chapter-exposure';
    overlay.setAttribute('aria-hidden','true');
    overlay.width=Math.round(w*dpr);overlay.height=Math.round(h*dpr);
    Object.assign(overlay.style,{top:bounds.top+'px',left:bounds.left+'px',width:w+'px',height:h+'px'});
    document.body.append(overlay);
    const ctx=overlay.getContext('2d');
    ctx?.setTransform(dpr,0,0,dpr,0,0);
    const colours=document.documentElement.dataset.theme==='dark'?nightPigment:pigment;
    front.classList.add('turn-front');
    back.classList.add('turn-back');
    document.documentElement.dataset.turnStyle='exposure';
    // Keep the clipping plane and its diffraction rim on the very same pixels.
    front.style.transform='translateY('+(front===outgoing?shift:0)+'px)';
    return {
      paint(progress) {
        const p=direction>0?progress:1-progress;
        const t=p*p*(3-2*p);
        const rx=w*extent*t,ry=h*extent*t;
        front.style.clipPath='ellipse('+rx.toFixed(2)+'px '+ry.toFixed(2)+'px at '+x.toFixed(2)+'px '+y.toFixed(2)+'px)';
        const away=(back===outgoing?shift:0)-h*.014*t;
        back.style.transform='translateY('+away.toFixed(2)+'px) scale('+(1-.012*t).toFixed(5)+')';
        if(ctx) {
          ctx.clearRect(0,0,w,h);
          drawEdge(ctx,x,y,rx,ry,t,colours);
        }
      },
      clear() {
        overlay.remove();
        front.classList.remove('turn-front');back.classList.remove('turn-back');
        front.style.removeProperty('clip-path');front.style.removeProperty('transform');back.style.removeProperty('transform');
        delete document.documentElement.dataset.turnStyle;
      }
    };
  }
  window.chapterTurns={create};
})();
