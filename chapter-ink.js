/* Sample the visible type and media at either end of a chapter turn.
   The live document supplies the first and last exposures at native resolution. */
(() => {
  'use strict';
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => n*n*(3-2*n);
  const colours = ['#058caa','#2879cb','#504cce','#9855b1','#cb665b'];
  const stamp = document.createElement('canvas');
  const ink = stamp.getContext('2d',{willReadFrequently:true});
  const overlay = document.createElement('canvas');
  overlay.className = 'chapter-particles';
  overlay.setAttribute('aria-hidden','true');
  const brush = overlay.getContext('2d');
  if (!ink || !brush) return;
  document.body.append(overlay);

  function alphabet(sheet, box) {
    const walk = document.createTreeWalker(sheet,NodeFilter.SHOW_TEXT);
    const range = new Range();
    let node;
    while ((node=walk.nextNode())) {
      if (!node.data.trim()) continue;
      range.selectNodeContents(node);
      const bounds=range.getBoundingClientRect();
      if (bounds.height<3 || bounds.bottom<=box.top || bounds.top>=box.bottom) continue;
      const el=node.parentElement;
      if (!el || el.closest('[hidden],[inert],script,svg,.has-lettering .flight-fallback')) continue;
      const style=getComputedStyle(el);
      if (style.visibility!=='visible') continue;
      ink.font=style.fontStyle+' '+style.fontWeight+' '+style.fontSize+' '+style.fontFamily;
      ink.fillStyle='#181818';
      const metric=ink.measureText('Hg');
      // A Range gives the browser's real wrapped line, including Chinese text
      // and inline emphasis. Split only when there is an actual line break.
      const lines=[...range.getClientRects()];
      let start=0;
      for (let i=0;i<lines.length && start<node.length;i++) {
        const line=lines[i];
        let end=node.length;
        if(i!==lines.length-1) {
          let lo=start+1,hi=node.length;
          while(lo<hi) {
            const mid=Math.ceil((lo+hi)/2);
            range.setStart(node,start); range.setEnd(node,mid);
            if(range.getClientRects().length<=1) lo=mid; else hi=mid-1;
          }
          end=lo;
        }
        if(line.width>0 && line.bottom>box.top && line.top<box.bottom) {
          const baseline=(line.height+metric.fontBoundingBoxAscent-metric.fontBoundingBoxDescent)/2;
          const text=node.data.slice(start,end).replace(/\s+/gu,' ').trim();
          if(text) ink.fillText(text,line.left-box.left,line.top-box.top+baseline,line.width);
        }
        start=end;
      }
    }
  }

  function imagePlate(sheet,box) {
    for (const el of sheet.querySelectorAll('img,video,canvas')) {
      if (el.closest('[inert],[hidden]')) continue;
      const r=el.getBoundingClientRect();
      if (!r.width || r.bottom<=box.top || r.top>=box.bottom) continue;
      const width=el.videoWidth || el.naturalWidth || el.width;
      const height=el.videoHeight || el.naturalHeight || el.height;
      if (!width || !height || (el.tagName==='VIDEO' && el.readyState<2) ||
          (el.tagName==='IMG' && !el.naturalWidth)) continue;
      const style=getComputedStyle(el), x=r.left-box.left,y=r.top-box.top;
      if(style.visibility!=='visible') continue;
      ink.save(); ink.beginPath(); ink.rect(x,y,r.width,r.height); ink.clip();
      const fit=style.objectFit;
      let dw=r.width,dh=r.height;
      if(fit==='cover' || fit==='contain') {
        const scale=(fit==='cover'?Math.max:Math.min)(dw/width,dh/height);
        dw=width*scale; dh=height*scale;
      }
      const [px,py]=style.objectPosition.split(' ').map(s=>parseFloat(s)/100);
      try { ink.drawImage(el,x+(r.width-dw)*px,y+(r.height-dh)*py,dw,dh); }
      catch { /* An undecoded frame can join on the next visit. */ }
      ink.restore();
    }
  }
  function sample(sheet) {
    const box=sheet.getBoundingClientRect();
    const scale=Math.min(.8,660/box.width,480/box.height);
    stamp.width=Math.max(1,Math.round(box.width*scale));
    stamp.height=Math.max(1,Math.round(box.height*scale));
    const width=stamp.width,height=stamp.height;
    ink.setTransform(scale,0,0,scale,0,0);
    const points=[];
    let seed=423;
    const random=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);
    function collect(text) {
      let data;
      try { data=ink.getImageData(0,0,width,height).data; } catch {return;}
      const candidates=[];
      for(let y=1;y<height-1;y+=2) for(let x=1+(y%4===1?0:1);x<width-1;x+=2) {
        const i=(y*width+x)*4;
        if(data[i+3]<55) continue;
        const luma=(data[i]+2*data[i+1]+data[i+2])*.25;
        if(!text) {
          const contrast=Math.abs(data[i+1]-data[i+5])+Math.abs(data[i+1]-data[i+width*4+1]);
          if(luma>241 || (contrast<12 && random()>.09*(1-luma/255))) continue;
        }
        candidates.push([x/scale,y/scale]);
      }
      const budget=Math.min(candidates.length,Math.round((text?2100:2350)*Math.min(1,box.width/850)));
      for(let n=0;n<budget;n++) points.push(candidates[Math.floor((n+random())*candidates.length/budget)]);
    }
    imagePlate(sheet,box); collect(false);
    // Reset the bitmap as well as its origin-clean flag before reading type.
    stamp.width=width; ink.setTransform(scale,0,0,scale,0,0);
    alphabet(sheet,box); collect(true);
    // Match nearby vertical strips so images and paragraphs keep their local
    // structure long enough to recognise them as they come apart.
    const rank=p=>Math.floor(p[0]/55)*height/scale+p[1];
    return points.sort((a,b)=>rank(a)-rank(b));
  }

  function morph(oldSheet,newSheet,sign,change) {
    const source=sample(oldSheet);
    const oldTop=oldSheet.getBoundingClientRect().top;
    change();
    const target=sample(newSheet);
    if(!source.length || !target.length) return null;
    const width=newSheet.clientWidth,height=newSheet.clientHeight;
    const dpr=Math.min(devicePixelRatio||1,1.5);
    overlay.width=Math.round(width*dpr); overlay.height=Math.round(height*dpr);
    brush.setTransform(dpr,0,0,dpr,0,0);
    overlay.hidden=false;
    const shift=oldTop-oldSheet.getBoundingClientRect().top;
    oldSheet.classList.add('ink-out'); newSheet.classList.add('ink-in');
    oldSheet.style.transform='translateY('+shift+'px)';
    const groups=colours.map(()=>[]);
    const count=Math.max(source.length,target.length);
    for(let i=0;i<count;i++) {
      const a=source[Math.floor(i*source.length/count)], b=target[Math.floor(i*target.length/count)];
      const seed=((Math.imul(i+71,2654435761)>>>0)/4294967296);
      const flow=Math.sin(a[1]/height*7+a[0]/width*4);
      const hue=Math.min(4,Math.floor(clamp(.16+(.52*a[0]/width)+seed*.32)*5));
      groups[hue].push({a,b,seed,flow,drift:Math.sin(i*23.37),size:.9+1.45*seed});
    }
    return {
      paint(p) {
        oldSheet.style.opacity=1-ease(clamp(p/.42));
        newSheet.style.opacity=ease(clamp((p-.53)/.47));
        brush.clearRect(0,0,width,height);
        brush.globalAlpha=ease(clamp(p/.16))*ease(clamp((1-p)/.18))*.93;
        for(let g=0;g<groups.length;g++) {
          brush.fillStyle=colours[g];
          for(const {a,b,seed,flow,drift,size} of groups[g]) {
            const phase=p+p*(1-p)*(.47*(seed-.5)+.32*sign*(.5-a[1]/height));
            const u=ease(clamp(phase)), plume=4*u*(1-u);
            const x=a[0]+(b[0]-a[0])*u+plume*(flow*.070*width+drift*.042*width);
            const y=a[1]+(b[1]-a[1])*u - sign*Math.sin(2*Math.PI*u)*height*(.085+.14*seed)
                  + plume*drift*height*.034;
            brush.fillRect(x,y,size,size*(1+plume*(.48+seed)));
          }
        }
      },
      clear() {
        overlay.hidden=true;
        oldSheet.classList.remove('ink-out'); newSheet.classList.remove('ink-in');
        oldSheet.style.removeProperty('transform');
        oldSheet.style.removeProperty('opacity'); newSheet.style.removeProperty('opacity');
      }
    };
  }
  overlay.hidden=true;
  window.chapterInk={morph};
})();
