(() => {
  const choices=[...document.querySelectorAll('[data-key]')];
  const player=document.querySelector('iframe'), description=document.querySelector('#description');
  const link=document.querySelector('#enlarge'), sync=document.querySelector('#synchronise');
  const videos=choices.map(a=>a.querySelector('video'));
  let playing=false, version=0;
  function select(key) {
    const choice=choices.find(a=>a.dataset.key===key)||choices[0];
    for(const a of choices) a.setAttribute('aria-current',String(a===choice));
    if(player.getAttribute('src')!==choice.getAttribute('href')) player.src=choice.href;
    player.title='机械臂与姓名粒子动画，'+choice.querySelector('strong').textContent;
    description.textContent=choice.dataset.note;
    link.href=choice.href;
  }
  for(const a of choices) a.addEventListener('click',event=>{
    if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey) return;
    event.preventDefault();
    location.hash=a.dataset.key;
    select(a.dataset.key);
  });
  addEventListener('hashchange',()=>select(location.hash.slice(1)));
  select(location.hash.slice(1));
  function stop() {
    version++; playing=false;
    for(const video of videos) video.pause();
    sync.textContent='同步播放三款';
  }
  sync.hidden=false;
  sync.addEventListener('click',async ()=>{
    if(playing) { stop();return; }
    playing=true;
    const run=++version;
    sync.textContent='停止对比播放';
    try {
      // Wait for all three first frames before starting a shared six-second take.
      await Promise.all(videos.map(v=>{
        if(v.readyState>=3) return Promise.resolve();
        return new Promise((resolve,reject)=>{
          v.addEventListener('canplay',resolve,{once:true});
          v.addEventListener('error',reject,{once:true});
          v.load();
        });
      }));
      if(run!==version)return;
      for(const v of videos) v.currentTime=0;
      await Promise.all(videos.map(v=>v.play()));
    } catch { if(run===version) stop(); }
  });
  videos[0].addEventListener('ended',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
})();
