import { pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : 'playwright');
const base = process.env.SITE_URL || 'http://127.0.0.1:8782/';
const out = new URL('../output/playwright/', import.meta.url);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [], errors = [], failedResources = [];
const record = (name, detail = {}) => { results.push({ name, ...detail }); console.log(`PASS ${name}`); };
function observe(page) {
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) failedResources.push(`${response.status()} ${response.url()}`); });
}
async function screenshot(page, name, fullPage = false) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(async img => { img.loading = 'eager'; try { await img.decode(); } catch {} }));
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: new URL(name, out).pathname.replace(/^\/(\w:)/,'$1'), fullPage });
}
async function language(page, lang) {
  if (await page.locator('html').getAttribute('lang') !== lang) await page.locator('.language-toggle').click();
  await page.waitForFunction(lang=>document.documentElement.lang===lang && !document.documentElement.dataset.preferenceMotion,lang);
}
async function theme(page, value) {
  if (await page.locator('html').getAttribute('data-theme') !== value) await page.locator('.theme-toggle').click();
  await page.waitForFunction(theme=>document.documentElement.dataset.theme===theme && !document.documentElement.dataset.preferenceMotion,value);
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark',locale:'zh-CN' });
  await context.addInitScript(()=>{
    localStorage.setItem('zy-language','zh');
    localStorage.setItem('zy-theme','dark');
  });
  const page = await context.newPage(); observe(page);
  await page.goto(base); await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  await page.waitForFunction(() => document.querySelector('[data-preview]').currentTime > .2);
  assert.equal(await page.locator('[data-preview]').evaluate(v => v.muted), true);
  const film=page.locator('.flight-film'), stage=page.locator('.flight-stage'), lettering=page.locator('#flight-lettering');
  assert.equal(new URL(await film.evaluate(video => video.poster)).pathname, '/assets/motion/grasp-study-opening.webp');
  function countCopper(video) {
    const canvas=document.createElement('canvas');
    canvas.width=480; canvas.height=180;
    const ctx=canvas.getContext('2d');
    ctx.drawImage(video,0,0,480,180);
    const pixels=ctx.getImageData(0,0,480,180).data;
    let count=0;
    for(let i=0;i<pixels.length;i+=4) {
      if(pixels[i]-pixels[i+1]>34 && pixels[i+1]-pixels[i+2]>9) count++;
    }
    return count;
  }
  const openingCopper=await film.evaluate(countCopper);
  assert.deepEqual(await stage.boundingBox(),await lettering.boundingBox());
  assert.equal(await stage.locator('video[controls]').count(),0);
  const box=await stage.boundingBox();
  await page.waitForFunction(()=>document.querySelector('.flight-film').currentTime>4.95);
  const beforeHover=await lettering.evaluate(c=>c.toDataURL());
  await page.mouse.move(box.x+box.width*.22,box.y+box.height*.47);
  await page.waitForFunction(()=>Math.abs(new DOMMatrix(getComputedStyle(document.querySelector('.flight-film')).transform).e)>3);
  assert.notEqual(beforeHover,await lettering.evaluate(c=>c.toDataURL()),'pointer should displace the lettering as well as the film');
  record('one shared stage: pointing at the artwork displaces the ink and the robot arm');
  await page.locator('.motion-toggle').click();
  await page.waitForFunction(() => document.querySelector('[data-preview]').paused);
  assert.equal(await page.locator('html').getAttribute('data-motion'), 'paused');
  assert.equal(await page.locator('.flight-film').evaluate(e => e.style.transform), 'translate(0px, 0px) rotate(0deg)');
  await page.locator('.motion-toggle').click();
  await page.waitForFunction(() => !document.querySelector('[data-preview]').paused);
  await page.locator('#research').evaluate(e => e.scrollIntoView({ block: 'start' }));
  await page.waitForFunction(() => document.querySelector('[data-preview]').paused);
  await page.evaluate(()=>scrollTo(0,0));
  await page.waitForFunction(()=>{const v=document.querySelector('.flight-film');return !v.paused&&v.currentTime<1;});
  await film.evaluate(v=>{v.currentTime=v.duration-.28;});
  await page.waitForFunction(()=>document.querySelector('.flight-film').ended);
  await page.waitForTimeout(230); assert.equal(await film.evaluate(v=>v.ended),true);
  assert.ok(openingCopper < 3 && await film.evaluate(countCopper) > 9,
    'copper appears at the gripper contacts once the part is held');
  await page.locator('.flight-replay').focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(()=>{const v=document.querySelector('.flight-film');return !v.paused&&v.currentTime>.05&&v.currentTime<1;});
  assert.equal(await page.locator('.motion-toggle').evaluate(e=>document.activeElement===e),true);
  await page.locator('#research').evaluate(e=>e.scrollIntoView({block:'start'}));
  const line=page.locator('[data-edge="control"]');
  const endpoint=await line.getAttribute('x2');
  await page.waitForFunction(from=>document.querySelector('[data-edge="control"]').getAttribute('x2')!==from,endpoint);
  assert.equal(await line.evaluate(l=>{
    const b=document.querySelector('[data-node="control"] span').getBoundingClientRect(),r=l.ownerSVGElement.getBoundingClientRect();
    return Math.abs(r.left+l.x2.baseVal.value-(b.left+b.width/2))<2;
  }),true,'line follows moving label');
  const hubAligned = await page.locator('.graph-stage').evaluate(stage => {
    const hub=stage.querySelector('[data-hub="root"]'), label=stage.querySelector('.graph-center span');
    const lines=[...stage.querySelectorAll('[data-from="root"]')], r=label.getBoundingClientRect(), svg=hub.ownerSVGElement.getBoundingClientRect();
    return lines.length===4 && lines.every(l=>l.getAttribute('x1')===hub.getAttribute('cx') && l.getAttribute('y1')===hub.getAttribute('cy'))
      && Math.abs(svg.left+hub.cx.baseVal.value-r.left-r.width/2)<1 && Math.abs(svg.top+hub.cy.baseVal.value-r.top-r.height/2)<1
      && getComputedStyle(label).backgroundColor==='rgba(0, 0, 0, 0)';
  });
  assert.ok(hubAligned,'all four spokes must meet at the visible hub behind the title');
  record('preview plays muted only in view; pause/resume controls stop video and decorative motion');

  const control = page.locator('[data-node="control"]'), note = page.locator('#graph-note');
  const graphLinks = await page.locator('.graph-node').evaluateAll(links => Object.fromEntries(links.map(a => [a.dataset.node, a.tagName === 'A' && a.getAttribute('href')])));
  assert.deepEqual(graphLinks,{control:'#project-control',data:'#project-data',autonomy:'#theme-autonomy',interaction:'#paper-cabin-interaction',pid:'#project-control',robustness:'projects/reliable-robotic-manipulation/#scope',dataset:'#project-data',motion:'#project-motion',driving:'#paper-ramp-merging',navigation:'#paper-robot-navigation',hmi:'#paper-cabin-interaction',evaluation:'#paper-cabin-interaction'});
  await control.hover(); await note.waitFor({state:'visible'});
  assert.match(await note.innerText(), /Nonlinear modeling/);
  assert.equal(await note.getAttribute('href'), await control.getAttribute('href'));
  await control.focus(); await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.node), 'data');
  assert.match(await note.innerText(), /Documented factory tasks/);
  await page.keyboard.press('Escape'); assert.ok(await note.isHidden());
  await page.keyboard.press('Enter'); await page.waitForURL(u=>u.hash==='#project-data');
  await language(page, 'zh-CN'); await control.hover();
  assert.match(await note.innerText(), /非线性建模/);
  await note.click(); await page.waitForURL(u=>u.hash==='#project-control');
  assert.ok(await page.locator('.work-title').evaluateAll(links=>links.length===6 && links.every(a=>a.href===document.querySelector('a.work-image[aria-labelledby="'+a.parentNode.id+'"]').href)));
  record('all twelve map topics, preview cards and six linked works lead directly to their evidence; arrows, Escape and both languages work');

  const row=page.locator('#theme-autonomy'), topic=row.locator('.topic-link');
  await row.hover();
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#theme-autonomy .topic-sketch')).opacity==='1');
  await topic.focus(); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'paper-ramp-merging');
  record('illustrated research rows reveal on hover and lead keyboard readers to the matching evidence');

  await theme(page, 'dark');
  assert.equal(await page.locator('.flight-action').evaluate(e => getComputedStyle(e).color), 'rgb(241, 240, 235)');
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  await language(page,'zh-CN'); await theme(page,'dark');
  await page.locator('#project-control .work-title').click();
  await page.waitForURL(u=>u.pathname.endsWith('/projects/reliable-robotic-manipulation/'));
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  assert.match(await page.locator('h1').innerText(), /可靠机器人操作/);
  assert.match(await page.locator('#scope').innerText(), /未启用确认集/);
  record('fresh and refreshed homepage use light English; an internal link carries manual choices to the study');

  const dimensions = [[320,740],[390,844],[768,1024],[1024,680],[1440,1000],[1440,620]];
  for (const route of ['', 'projects/reliable-robotic-manipulation/']) {
    await page.goto(new URL(route,base).href);
    for (const lang of ['en','zh-CN']) {
      await language(page, lang);
      for (const [width,height] of dimensions) {
        await page.setViewportSize({ width,height });
        await page.evaluate(() => scrollTo(0,0));
        const measure = await page.evaluate(() => {
          const name = document.querySelector('.name-line');
          const stage = document.querySelector('.flight-stage'), action = document.querySelector('.flight-action');
          const reading = document.querySelectorAll('.project-copy p:not(.project-category), .research-card p, .publication p:not(.pub-status):not(.authors), .timeline p:not(.meta), .detail-lede, .comparison-copy p, .method-grid p, .detail-scope p');
          return { w:innerWidth, scrollWidth:document.documentElement.scrollWidth, name: name ? { h:name.getBoundingClientRect().height, line:parseFloat(getComputedStyle(name).lineHeight) } : null, actionGap: stage ? stage.getBoundingClientRect().bottom - action.getBoundingClientRect().bottom : null, smallestProse: Math.min(...[...reading].map(e=>parseFloat(getComputedStyle(e).fontSize))) };
        });
        assert.ok(measure.scrollWidth <= width + 1, `${route} ${lang} ${width}: overflow ${measure.scrollWidth}`);
        if (measure.name) assert.ok(measure.name.h < measure.name.line * 1.3, `name wrapped at ${width}`);
        if (measure.actionGap !== null) assert.ok(measure.actionGap >= 8, `${lang} ${width}: banner action clipped`);
        assert.ok(measure.smallestProse >= 15, `${route} ${width}: undersized sustained prose`);
      }
    }
    record(`responsive geometry: ${route || 'homepage'} in both languages at six viewports`);
  }

  await page.setViewportSize({width:390,height:844}); await page.goto(base);
  await language(page,'en'); await theme(page,'light');
  await page.locator('.menu-toggle').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'true');
  assert.equal(await page.evaluate(()=>document.activeElement.hash),'#about');
  await page.keyboard.press('Tab'); assert.equal(await page.evaluate(()=>document.activeElement.hash),'#research');
  await screenshot(page,'mobile-menu.png');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
  assert.equal(await page.evaluate(()=>document.activeElement.className),'menu-toggle');
  await page.locator('.menu-toggle').click(); await page.locator('.hero-positioning').click();
  assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
  await page.locator('.menu-toggle').click(); await page.locator('.primary-navigation a[href="#publications"]').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'publications');
  await page.waitForFunction(()=>document.querySelector('a[href="#publications"][aria-current="location"]'));
  for (let i=0;i<6;i++) await page.locator('.menu-toggle').click();
  assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
  record('mobile menu supports keyboard, Escape/focus return, outside dismissal, links and rapid toggles');

  await page.locator('#project-control .project-copy details summary').click();
  assert.equal(await page.locator('#project-control .project-copy details').evaluate(e=>e.open),true);
  for(const id of ['project-control','project-motion']) {
    const recording=page.locator('#'+id+' .recording');
    assert.equal(await recording.evaluate(d=>d.open),false);
    assert.equal(await recording.locator('video').isVisible(),false);
    await recording.locator('summary').click();
  }
  const video=page.locator('#project-control video');
  await video.evaluate(async v => { await v.play(); });
  await page.waitForFunction(()=>document.querySelector('#project-control video').currentTime > .2);
  await video.evaluate(v=>v.pause());
  const time=await video.evaluate(v=>v.currentTime);
  assert.ok(time>.2);
  await page.locator('#project-motion video').evaluate(async v=>{await v.play()});
  await page.waitForFunction(()=>document.querySelector('#project-motion video').currentTime>.2);
  await page.locator('#project-motion .recording summary').click();
  await page.waitForFunction(()=>document.querySelector('#project-motion video').paused);
  record('native disclosure and both project H.264 recordings are usable');

  for (const id of ['about','research','projects','publications','news','experience','cv','contact','cv','experience','news','publications','projects','research','about']) {
    await page.locator(`#${id}`).evaluate(e=>e.scrollIntoView({block:'start'}));
    await page.waitForFunction(id=>document.querySelector(`.primary-navigation a[href="#${id}"][aria-current="location"]`),id);
  }
  record('navigation follows all eight primary destinations in both scroll directions');

  // Capture stable, fully loaded compositions, with motion paused via the real control.
  await page.goto(base);await language(page,'en');await theme(page,'light');
  if(await page.locator('.motion-toggle').getAttribute('aria-pressed')!=='true') await page.locator('.motion-toggle').click();
  assert.equal(await page.locator('#project-control .recording').evaluate(d=>d.open),false);
  for(const [width,height,label] of [[1440,1000,'desktop'],[390,844,'mobile']]) {
    await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));
    await screenshot(page,`${label}.png`,true);await screenshot(page,`${label}-hero.png`);
    await page.locator('#research').evaluate(e=>e.scrollIntoView({block:'start'}));
    await screenshot(page,`${label}-research.png`);
    await page.locator('#project-control').evaluate(e=>e.scrollIntoView({block:'start'}));
    await screenshot(page,`${label}-work.png`);
    await language(page,'zh-CN');await theme(page,'dark');await page.evaluate(()=>scrollTo(0,0));
    await screenshot(page,`${label}-dark-zh.png`,true);await screenshot(page,`${label}-dark-hero.png`);
    await language(page,'en');await theme(page,'light');
  }
  await page.goto(new URL('projects/reliable-robotic-manipulation/',base).href);
  await page.locator('.detail-hero video').evaluate(async v=>{await v.play();v.pause()});
  for(const [width,height,label] of [[1440,1000,'desktop'],[390,844,'mobile']]){
    await page.setViewportSize({width,height});await language(page,'en');await theme(page,'light');await page.evaluate(()=>scrollTo(0,0));
    await screenshot(page,`detail-${label}.png`,true);
    await language(page,'zh-CN');await page.evaluate(()=>scrollTo(0,0));await screenshot(page,`detail-${label}-zh.png`,true);
  }
  const missingImages=await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src));
  assert.deepEqual(missingImages,[]);
  record('desktop/mobile captures include fully loaded figures, both languages and dark mode');
  await context.close();

  const reducedContext=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});
  const rp=await reducedContext.newPage();observe(rp);await rp.goto(base);await rp.waitForTimeout(1000);
  assert.equal(await rp.locator('[data-preview]').evaluate(v=>v.paused),true);
  assert.equal(await rp.locator('.motion-toggle').isDisabled(),true);
  await rp.locator('#research').evaluate(e=>e.scrollIntoView());
  const reducedLine=rp.locator('[data-edge=control]'); const fixed=await reducedLine.getAttribute('x2');
  await rp.waitForTimeout(300); assert.equal(await reducedLine.getAttribute('x2'),fixed);
  assert.equal(await rp.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
  await reducedContext.close();record('reduced motion keeps all animations still and the banner on its still poster');

  const plain=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:740}});
  const np=await plain.newPage();observe(np);
  for(const route of ['', 'projects/reliable-robotic-manipulation/']) {
    await np.goto(new URL(route,base).href);
    assert.equal(await np.locator('h1').isVisible(),true);
    if (!route) assert.equal(await np.locator('.graph-node:visible').count(),12);
    assert.equal(await np.locator('.primary-navigation').isVisible(),true);
    assert.equal(await np.locator('.site-header').evaluate(e=>getComputedStyle(e).position),'static');
    assert.ok(await np.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const details=np.locator('details').first();await details.locator('summary').click();assert.equal(await details.evaluate(e=>e.open),true);
  }
  await plain.close();record('both pages remain readable and navigable without JavaScript at 320px');

  const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const tp=await touchContext.newPage();observe(tp);await tp.goto(base);
  const touchTopic=tp.locator('[data-node="dataset"]');
  await touchTopic.evaluate(e => {
    const r=e.getBoundingClientRect();
    scrollTo({top:scrollY+r.y+r.height/2-innerHeight+22,behavior:'instant'});
  });
  await touchTopic.tap(); await tp.waitForURL(u=>u.hash==='#project-data');
  const touchRow=tp.locator('#theme-autonomy');
  await tp.waitForFunction(()=>!document.documentElement.dataset.turn && window.chapterReader.current().id==='projects');
  await touchRow.evaluate(e=>{window.chapterReader.open(e,false);});
  const desc=await touchRow.locator('p').boundingBox(); await tp.touchscreen.tap(desc.x+desc.width/2,desc.y+desc.height/2);
  await tp.waitForURL(u=>u.hash==='#paper-ramp-merging');
  await tp.waitForFunction(()=>!document.documentElement.dataset.turn && window.chapterReader.current().id==='publications');
  await tp.locator('.graph-stage').evaluate(e=>window.chapterReader.open(e,false));
  const readPosition=()=>tp.locator('#research').evaluate(e=>e.parentElement.scrollTop);
  const before=await readPosition();const cdp=await touchContext.newCDPSession(tp);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:650}]});
  for(const y of [600,540,480,400,320])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await tp.waitForTimeout(300);assert.ok(await readPosition()>before+80,'graph must not hijack vertical touch scroll');
  await touchContext.close();record('a single tap on a map topic or research row follows the link; vertical scrolling stays native');
  assert.deepEqual(errors,[],'console errors');assert.deepEqual(failedResources,[],'failed local resources');
  record('no page errors, console errors or failed same-origin resources');
} finally {
  await fs.writeFile(new URL('results.json',out),JSON.stringify({base,results,errors,failedResources},null,2));
  await browser.close();
}
