/* Each native scrollport holds one complete section. The root only moves on a turn. */
(() => {
  'use strict';
  const root = document.documentElement;
  const sections = [...document.querySelectorAll('main > section[id]')];
  const rail = document.querySelector('.chapter-rail');
  if (!rail || !sections.length) return;
  const header = document.querySelector('.site-header');
  const previous = rail.querySelector('.chapter-prev');
  const next = rail.querySelector('.chapter-next');
  const count = rail.querySelector('.chapter-count');
  const title = rail.querySelector('.chapter-title');
  const sheets = sections.map(section => {
    const sheet = document.createElement('div');
    sheet.className = 'chapter-sheet';
    section.before(sheet);
    sheet.append(section);
    return sheet;
  });
  sheets.at(-1).append(document.querySelector('.site-footer'));
  let active = 0, motion = null, swiping;
  function settleTurn() { motion?.finish(false); }
  const headerHeight = () => header.offsetHeight;
  const offset = sheet => scrollY + sheet.getBoundingClientRect().top - headerHeight();
  const atEdge = (sheet, direction) => direction < 0 ? sheet.scrollTop < 2 :
    sheet.scrollHeight - sheet.clientHeight - sheet.scrollTop < 2;
  function updateRail() {
    const section = sections[active];
    const link = header.querySelector('a[href="#' + section.id + '"]');
    const label = active === 0 ? (root.lang.startsWith('zh') ? '首页' : 'Home') : link?.textContent;
    if (title.textContent !== label) title.textContent = label;
    count.textContent = String(active+1).padStart(2,'0') + ' / ' + String(sheets.length).padStart(2,'0');
    previous.disabled = active === 0;
    next.disabled = active === sheets.length-1;
  }
  function locate() {
    // Focus, find-in-page and script-driven scrolls may also select a sheet.
    if (root.dataset.turn) return sections[active];
    const midpoint = headerHeight() + sheets[0].clientHeight/2;
    const index = sheets.findIndex(sheet => {
      const box = sheet.getBoundingClientRect();
      return box.top <= midpoint && box.bottom > midpoint;
    });
    if (index >= 0 && active !== index) { active = index; updateRail(); }
    return sections[active];
  }
  function position(target, index, fromBelow) {
    const sheet = sheets[index];
    active = index;
    window.scrollTo({top:offset(sheet),behavior:'instant'});
    if (target === sections[index] || target.id === 'main-content') {
      sheet.scrollTop = fromBelow ? sheet.scrollHeight : 0;
    } else {
      const inset = target.classList.contains('anchor-alias') ? 0 : 12;
      sheet.scrollTop += target.getBoundingClientRect().top - sheet.getBoundingClientRect().top - inset;
    }
    updateRail();
    // A wheel turn moves focus only when it would otherwise remain in a hidden chapter.
    const oldFocus = document.activeElement?.closest('.chapter-sheet');
    if (oldFocus && oldFocus !== sheet) {
      sections[index].tabIndex = -1;
      sections[index].focus({preventScroll:true});
    }
    window.dispatchEvent(new Event('scroll'));
  }
  function open(target, animate = true, fromBelow = false, updateHash = false, impulse = 0) {
    settleTurn();
    const section=target.closest('.chapter-sheet')?.firstElementChild || sections[0];
    const index=sections.indexOf(section);
    if(index<0) return;
    const origin=active, sign=Math.sign(index-origin), originalURL=location.href;
    const oldPosition=sheets[origin].scrollTop;
    const change=()=>{
      if(updateHash) history.replaceState(history.state,'','#'+section.id);
      position(target,index,fromBelow);
    };
    if(!sign || !animate || root.dataset.motion!=='running' || !window.chapterTurns) { change(); return; }
    document.dispatchEvent(new Event('site:turn-start'));
    root.dataset.turn=sign>0?'down':'up';
    const exposure=window.chapterTurns.create(sheets[origin],sheets[index],sign,change);
    // Wheel deltas move a destination, and a critically damped spring follows
    // it. After the gesture rests, finish in its last deliberate direction.
    const travelDistance = Math.max(320, sheets[index].clientHeight*.72);
    let progress=0, velocity=0, intent=1;
    let destination=impulse ? Math.min(.60,.14+Math.abs(impulse)/travelDistance) : 1;
    let lastInput=impulse ? performance.now() : -Infinity;
    let last=performance.now(), frame=0;
    function finish(undo) {
      cancelAnimationFrame(frame);
      exposure.clear();
      motion=null;
      if(undo) {
        history.replaceState(history.state,'',originalURL);
        position(sections[origin],origin,false);
        sheets[origin].scrollTop=oldPosition;
      }
      delete root.dataset.turn;
    }
    function draw(now) {
      const dt=Math.max(0,Math.min(50,now-last))/1000; last=now;
      const tracking=now-lastInput<110;
      if(!tracking) destination=intent>0 ? 1 : 0;
      const frequency=tracking ? 27 : 18;
      const distance=progress-destination;
      const momentum=velocity+frequency*distance;
      const decay=Math.exp(-frequency*dt);
      progress=destination+(distance+momentum*dt)*decay;
      velocity=(velocity-frequency*momentum*dt)*decay;
      // A sharp reversal preserves momentum, while bounds keep the reading
      // surface intact if the destination reaches an endpoint first.
      if(progress<0 || progress>1) {
        progress=Math.max(0,Math.min(1,progress)); velocity=0;
      }
      exposure.paint(progress,velocity);
      if(!tracking && Math.abs(progress-destination)<.001 && Math.abs(velocity)<.025) finish(intent<0);
      else frame=requestAnimationFrame(draw);
    }
    motion={finish, feed(delta) {
      const signed=sign*delta;
      if(Math.abs(signed)>3) {
        const nextIntent=Math.sign(signed);
        if(nextIntent!==intent) destination=progress;
        intent=nextIntent;
      }
      destination=Math.max(0,Math.min(1,destination+signed/travelDistance));
      lastInput=performance.now();
    }};
    exposure.paint(0);
    frame=requestAnimationFrame(draw);
  }
  function step(direction, animate, fromEdge = false, impulse = 0) {
    const target=sections[active+direction];
    if(target) open(target,animate,fromEdge && direction<0,true,impulse);
  }
  const interactive = 'input, textarea, select, [contenteditable="true"], video[controls], .menu-open';
  let lastWheel = -Infinity, wheelDirection = 0, distance = 0, consumed = false, turned = false;
  window.addEventListener('wheel', event => {
    if (event.ctrlKey || event.shiftKey || !event.deltaY || Math.abs(event.deltaX)>Math.abs(event.deltaY) ||
        header.classList.contains('menu-open') || event.target.closest(interactive)) return;
    const direction = Math.sign(event.deltaY), now = performance.now();
    if (now-lastWheel > 165 || direction !== wheelDirection) { distance=0; consumed=false; turned=false; }
    lastWheel=now; wheelDirection=direction;
    const sheet = sheets[active];
    const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? sheet.clientHeight : 1);
    if (motion) { event.preventDefault(); motion.feed(pixels); turned=true; return; }
    if (turned) { event.preventDefault(); return; }
    if (!atEdge(sheet,direction)) {
      consumed=true;
      if (!sheet.contains(event.target)) { event.preventDefault(); sheet.scrollBy(0,pixels); }
      return;
    }
    event.preventDefault();
    if (consumed) return;
    distance += Math.abs(pixels);
    if (distance >= 7) {
      consumed=true;
      turned=true;
      step(direction,true,true,pixels);
    }
  },{passive:false});
  // The browser owns vertical reading and pinch-to-zoom. Only a fresh swipe
  // that started at the reading boundary can turn the sheet.
  document.addEventListener('touchstart',event => {
    swiping = null;
    if (event.touches.length!==1 || header.classList.contains('menu-open') || event.target.closest(interactive)) return;
    const t=event.touches[0],sheet=sheets[active];
    swiping={x:t.clientX,y:t.clientY,index:active,top:atEdge(sheet,-1),bottom:atEdge(sheet,1)};
  },{passive:true});
  document.addEventListener('touchcancel',()=>{ swiping=null; },{passive:true});
  document.addEventListener('touchend',event => {
    const start=swiping;
    swiping=null;
    if (!start || event.touches.length || start.index!==active) return;
    const t=event.changedTouches[0],dy=start.y-t.clientY,dx=start.x-t.clientX;
    if (Math.abs(dy)>52 && Math.abs(dy)>Math.abs(dx)*1.35 && (dy>0 ? start.bottom : start.top))
      step(Math.sign(dy),true,true);
  },{passive:true});
  previous.addEventListener('click',e=>step(-1,e.detail>0));
  next.addEventListener('click',e=>step(1,e.detail>0));
  document.addEventListener('keydown',event => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey ||
        header.classList.contains('menu-open') || event.target.closest(interactive)) return;
    const sheet = sheets[active];
    let direction = 0;
    if (event.key==='PageDown' || event.key==='ArrowDown') direction=1;
    if (event.key==='PageUp' || event.key==='ArrowUp') direction=-1;
    if (event.key===' ' && !event.target.closest('button,summary,a')) direction=event.shiftKey ? -1 : 1;
    if (event.key==='Home' || event.key==='End') {
      event.preventDefault();
      open(event.key==='Home' ? sections[0] : sections.at(-1),false,false,true);
    } else if (direction) {
      event.preventDefault();
      if (atEdge(sheet,direction)) { if (!event.repeat) step(direction,false,true); }
      else sheet.scrollBy({top:direction*(event.key.startsWith('Arrow') ? 48 : sheet.clientHeight*.86),behavior:'instant'});
    }
  });
  function restore() {
    const target=document.getElementById(location.hash.slice(1)) || sections[0];
    open(target,false);
  }
  function resize() {
    settleTurn();
    root.style.setProperty('--reader-header', headerHeight()+'px');
    window.scrollTo({top:offset(sheets[active]),behavior:'instant'});
  }
  document.addEventListener('site:language',updateRail);
  document.addEventListener('site:motion',() => {
    if(root.dataset.motion!=='running') settleTurn();
  });
  document.addEventListener('site:preference-start',settleTurn);
  window.addEventListener('hashchange',restore);
  window.addEventListener('popstate',restore);
  window.addEventListener('resize',resize);
  window.chapterReader={open,current:locate};
  root.style.setProperty('--reader-header',headerHeight()+'px');
  root.classList.add('chapter-mode');
  rail.hidden=false;
  restore();
  window.addEventListener('load',() => { if (location.hash) restore(); },{once:true});
})();
