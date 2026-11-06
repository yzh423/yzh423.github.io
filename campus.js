(() => {
  'use strict';
  const gallery=document.querySelector('.campus-gallery');
  if (!gallery) return;
  const track=gallery.querySelector('.campus-track'), slides=[...track.children];
  const prev=gallery.querySelector('.campus-prev'), next=gallery.querySelector('.campus-next');
  const count=gallery.querySelector('.campus-count');
  let selected=0, destination=null, settleTimer;
  function reflect(index) {
    selected=index;
    prev.disabled=index===0;
    next.disabled=index===slides.length-1;
    count.textContent=(index+1)+' / '+slides.length;
    slides.forEach((slide,i)=>{ slide.inert=i!==index; });
  }
  function go(step, smooth) {
    const index=Math.max(0,Math.min(slides.length-1,(destination??selected)+step));
    destination=index;
    track.scrollTo({left:index*track.clientWidth,behavior:smooth && document.documentElement.dataset.motion==='running'?'smooth':'instant'});
    reflect(index);
  }
  track.addEventListener('scroll',()=>{
    clearTimeout(settleTimer);
    if(destination===null) reflect(Math.round(track.scrollLeft/track.clientWidth));
    settleTimer=setTimeout(()=>{
      destination=null;
      reflect(Math.round(track.scrollLeft/track.clientWidth));
    },100);
  },{passive:true});
  track.addEventListener('pointerdown',()=>{destination=null;});
  track.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft' || e.key==='ArrowRight') {
      e.preventDefault(); go(e.key==='ArrowLeft'?-1:1,false);
    }
  });
  prev.addEventListener('click',()=>go(-1,true));
  next.addEventListener('click',()=>go(1,true));
  new ResizeObserver(()=>{track.scrollLeft=selected*track.clientWidth;}).observe(track);
  reflect(0);
  gallery.querySelector('.campus-controls').hidden=false;
})();
