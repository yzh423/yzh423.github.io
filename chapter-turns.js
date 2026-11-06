/* A two-sheet exposure for every boundary. A retreat samples the very same
   composition in reverse, including when the wheel changes direction mid-turn. */
(() => {
  'use strict';
  const clamp = x => Math.max(0,Math.min(1,x));
  const ease = x => { const u=clamp(x); return u*u*(3-2*u); };
  const pct = x => x.toFixed(3)+'%';

  // Each drawing describes the later sheet over the earlier one. All units
  // are CSS pixels except clip paths, which follow the viewport proportions.
  const boundaries = {
    about(t,w,h) {
      return {frontY:(1-t)*h, backY:-.055*h*t, backScale:1-.039*t, shade:true};
    },
    research(t,w,h) {
      // The six leaves open around the graph hub. A circumscribed hexagon
      // reaches all four corners, including on a very wide window.
      const radius=Math.hypot(w,h)*.60*t;
      const vertices=Array.from({length:6},(_,i)=>{
        const angle=Math.PI*i/3 + (1-t)*.20;
        return (w*.5+radius*Math.cos(angle)).toFixed(1)+'px '+(h*.5+radius*Math.sin(angle)).toFixed(1)+'px';
      });
      return {clip:'polygon('+vertices.join(',')+')',frontScale:1.025-.025*t};
    },
    projects(t) {
      // Three scan windows expose a bench photograph from top to bottom.
      return {mask:'repeating-linear-gradient(180deg,#000 0 '+pct(t/3*100)+',transparent '+pct(t/3*100)+' 33.33333%)'};
    },
    publications(t,w,h) {
      const edge=132*t-16;
      return {clip:'polygon(0 0,'+pct(edge+16)+' 0,'+pct(edge-16)+' 100%,0 100%)',
        frontX:-w*.025*(1-t),backY:-h*.015*t};
    },
    news(t,w) {
      // Adjacent spreads share an edge, as on a horizontal film transport.
      return {frontX:w*(1-t),backX:-w*t};
    },
    experience(t,w,h) {
      // Open the timeline from a horizontal slit, slightly above its centre.
      return {clip:'inset('+pct(38*(1-t))+' 0 '+pct(62*(1-t))+' 0)',backY:-h*.025*t};
    },
    cv(t) {
      const left=pct(100*ease(t/.77)),right=pct(100*ease((t-.23)/.77));
      return {clip:'polygon(0 0,100% 0,100% '+right+',50% '+right+',50% '+left+',0 '+left+')'};
    },
    contact(t,w,h) {
      return {frontAlpha:t,backAlpha:1-t*.72,frontScale:1.046-.046*t,backScale:1-.025*t,frontY:h*.018*(1-t)};
    }
  };

  function create(outgoing,incoming,direction,change) {
    const oldTop=outgoing.getBoundingClientRect().top;
    change();
    const shift=oldTop-outgoing.getBoundingClientRect().top;
    const front=direction>0 ? incoming : outgoing;
    const back=direction>0 ? outgoing : incoming;
    const width=incoming.clientWidth, height=incoming.clientHeight;
    const key=front.firstElementChild.id;
    const draw=boundaries[key] || boundaries.about;
    front.classList.add('turn-front');
    back.classList.add('turn-back');
    document.documentElement.dataset.turnStyle=key;
    function transform(sheet,x=0,y=0,scale=1) {
      const top=(sheet===outgoing?shift:0)+y;
      sheet.style.transform='translate3d('+x.toFixed(2)+'px,'+top.toFixed(2)+'px,0) scale('+scale.toFixed(5)+')';
    }
    return {
      paint(progress) {
        const t=ease(direction>0?progress:1-progress);
        const f=draw(t,width,height);
        transform(back,f.backX,f.backY,f.backScale);
        transform(front,f.frontX,f.frontY,f.frontScale);
        if (f.clip) front.style.clipPath=f.clip;
        if (f.mask) front.style.maskImage=t===1?'none':f.mask;
        if (f.frontAlpha!==undefined) front.style.opacity=f.frontAlpha;
        if (f.backAlpha!==undefined) back.style.opacity=f.backAlpha;
        if (f.shade) front.style.boxShadow='0 -9px 28px rgba(31,42,48,'+(Math.sin(t*Math.PI)*.105).toFixed(3)+')';
      },
      clear() {
        for(const sheet of [front,back]) {
          sheet.classList.remove('turn-front','turn-back');
          for(const prop of ['transform','clip-path','mask-image','opacity','box-shadow']) sheet.style.removeProperty(prop);
        }
        delete document.documentElement.dataset.turnStyle;
      }
    };
  }
  window.chapterTurns={create};
})();
