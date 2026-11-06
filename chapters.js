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
  const beam = document.createElement('div');
  beam.className = 'chapter-beam';
  beam.setAttribute('aria-hidden','true');
  document.body.append(beam);
  let active = 0, transition, sweep, incoming, revision = 0, swiping, boundaryTimer = 0;
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
  function open(target, animate = true, fromBelow = false, updateHash = false) {
    const section = target.closest('.chapter-sheet')?.firstElementChild || sections[0];
    const index = sections.indexOf(section);
    if (index < 0) return;
    const direction = index < active ? 'up' : 'down';
    const turn = index !== active && animate && root.dataset.motion === 'running';
    const ticket = ++revision;
    transition?.skipTransition();
    sweep?.cancel();
    incoming?.cancel();
    delete root.dataset.turn;
    const change = () => {
      if (ticket !== revision) return;
      if (updateHash) history.replaceState(history.state,'','#' + section.id);
      position(target,index,fromBelow);
    };
    if (!turn) { change(); return; }
    if (document.startViewTransition) {
      const effect = document.startViewTransition(() => {
        if (ticket !== revision) return;
        root.dataset.turn = direction;
        change();
      });
      transition = effect;
      effect.finished.finally(() => {
        if (ticket === revision) { delete root.dataset.turn; transition = null; }
      });
    } else {
      change();
      root.dataset.turn = direction;
      const frames = [{transform:'translateY(-64%)'},{transform:'translateY(64%)'}];
      incoming = section.animate([
        {opacity:.55, transform:'translateY('+(direction === 'down' ? 18 : -18)+'px)'},
        {opacity:1, transform:'translateY(0)'}
      ],{duration:420,easing:'cubic-bezier(.18,.7,.2,1)'});
      sweep = beam.animate(direction === 'down' ? frames : frames.reverse(),{duration:460,easing:'cubic-bezier(.3,0,.2,1)'});
      sweep.finished.then(() => { if (ticket === revision) delete root.dataset.turn; }, () => {});
    }
  }
  function step(direction, animate, fromEdge = false) {
    const target = sections[active+direction];
    if (target) open(target,animate,fromEdge && direction < 0,true);
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
    if (turned || (transition && root.dataset.turn) || now < boundaryTimer) { event.preventDefault(); consumed=true; return; }
    if (!atEdge(sheet,direction)) {
      consumed=true;
      if (!sheet.contains(event.target)) { event.preventDefault(); sheet.scrollBy(0,pixels); }
      return;
    }
    event.preventDefault();
    if (consumed) return;
    distance += Math.abs(pixels);
    if (distance >= 32) {
      consumed=true;
      turned=true;
      boundaryTimer=now+320;
      step(direction,true,true);
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
    root.style.setProperty('--reader-header', headerHeight()+'px');
    window.scrollTo({top:offset(sheets[active]),behavior:'instant'});
  }
  document.addEventListener('site:language',updateRail);
  document.addEventListener('site:motion',() => {
    if(root.dataset.motion!=='running') { transition?.skipTransition(); sweep?.finish(); incoming?.finish(); }
  });
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
