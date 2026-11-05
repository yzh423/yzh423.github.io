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
}
async function theme(page, value) {
  if (await page.locator('html').getAttribute('data-theme') !== value) await page.locator('.theme-toggle').click();
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
  const page = await context.newPage(); observe(page);
  await page.goto(base); await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelector('[data-preview]').currentTime > .2);
  assert.equal(await page.locator('[data-preview]').evaluate(v => v.muted), true);
  await page.locator('.motion-toggle').click();
  await page.waitForFunction(() => document.querySelector('[data-preview]').paused);
  assert.equal(await page.locator('html').getAttribute('data-motion'), 'paused');
  assert.equal(await page.locator('.graph-node span').first().evaluate(e => getComputedStyle(e).animationPlayState), 'paused');
  await page.locator('.motion-toggle').click();
  await page.waitForFunction(() => !document.querySelector('[data-preview]').paused);
  await page.locator('#research').evaluate(e => e.scrollIntoView({ block: 'start' }));
  await page.waitForFunction(() => document.querySelector('[data-preview]').paused);
  record('preview plays muted only in view; pause/resume controls stop video and decorative motion');

  const control = page.locator('[data-node="control"]');
  await control.click();
  assert.equal(await control.getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#graph-note').innerText(), /Nonlinear modeling/);
  await control.focus(); await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.node), 'data');
  await page.keyboard.press('Enter');
  assert.match(await page.locator('#graph-note').innerText(), /Documented factory tasks/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.graph-node[aria-pressed="true"]').count(), 0);
  await language(page, 'zh-CN');
  await page.locator('[data-node="control"]').click();
  assert.match(await page.locator('#graph-note').innerText(), /非线性建模/);
  record('research nodes support pointer, keyboard arrows, Enter, Escape and translated evidence links');

  await theme(page, 'dark');
  assert.equal(await page.locator('.button').first().evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(22, 23, 21)');
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.goto(new URL('projects/reliable-robotic-manipulation/', base).href);
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
  assert.match(await page.locator('h1').innerText(), /可靠机器人操作/);
  assert.match(await page.locator('#scope').innerText(), /未启用确认集/);
  record('language and theme persist across reloads and the research document');

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
          const hint = document.querySelector('.particle-hint'), action = document.querySelector('.explore-button');
          const reading = document.querySelectorAll('.project-copy p:not(.project-category), .research-card p, .publication p:not(.pub-status):not(.authors), .timeline p:not(.meta), .detail-lede, .comparison-copy p, .method-grid p, .detail-scope p');
          return { w:innerWidth, scrollWidth:document.documentElement.scrollWidth, name: name ? { h:name.getBoundingClientRect().height, line:parseFloat(getComputedStyle(name).lineHeight) } : null, hintGap: hint ? hint.getBoundingClientRect().top - action.getBoundingClientRect().bottom : null, smallestProse: Math.min(...[...reading].map(e=>parseFloat(getComputedStyle(e).fontSize))) };
        });
        assert.ok(measure.scrollWidth <= width + 1, `${route} ${lang} ${width}: overflow ${measure.scrollWidth}`);
        if (measure.name) assert.ok(measure.name.h < measure.name.line * 1.3, `name wrapped at ${width}`);
        if (measure.hintGap !== null) assert.ok(measure.hintGap >= 8, `${lang} ${width}: banner instruction overlaps its action`);
        assert.ok(measure.smallestProse >= 15, `${route} ${width}: undersized sustained prose`);
      }
    }
    record(`responsive geometry: ${route || 'homepage'} in both languages at six viewports`);
  }

  await page.setViewportSize({width:390,height:844}); await page.goto(base);
  await language(page,'en'); await theme(page,'light');
  await page.locator('.menu-toggle').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'true');
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

  await page.locator('#project-control details summary').click();
  assert.equal(await page.locator('#project-control details').evaluate(e=>e.open),true);
  const video=page.locator('#project-control video');
  await video.evaluate(async v => { await v.play(); });
  await page.waitForFunction(()=>document.querySelector('#project-control video').currentTime > .2);
  await video.evaluate(v=>v.pause());
  const time=await video.evaluate(v=>v.currentTime);
  assert.ok(time>.2);
  await page.locator('#project-motion video').evaluate(async v=>{await v.play()});
  await page.waitForFunction(()=>document.querySelector('#project-motion video').currentTime>.2);
  await page.locator('#project-motion video').evaluate(v=>v.pause());
  record('native disclosure and both project H.264 recordings are usable');

  for (const id of ['about','research','projects','publications','experience','contact']) {
    await page.locator(`#${id}`).evaluate(e=>e.scrollIntoView({block:'start'}));
    await page.waitForFunction(id=>document.querySelector(`.primary-navigation a[href="#${id}"][aria-current="location"]`),id);
  }
  record('navigation follows all six primary destinations including page end');

  // Capture stable, fully loaded compositions, with motion paused via the real control.
  await page.goto(base);await language(page,'en');await theme(page,'light');
  if(await page.locator('.motion-toggle').getAttribute('aria-pressed')!=='true') await page.locator('.motion-toggle').click();
  await page.locator('#project-control video').evaluate(async v=>{await v.play();v.pause()});
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
  assert.equal(await rp.locator('.graph-node span').first().evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.equal(await rp.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
  await reducedContext.close();record('reduced motion keeps all animations still and preview manually playable');

  const plain=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:740}});
  const np=await plain.newPage();observe(np);
  for(const route of ['', 'projects/reliable-robotic-manipulation/']) {
    await np.goto(new URL(route,base).href);
    assert.equal(await np.locator('h1').isVisible(),true);
    assert.equal(await np.locator('.primary-navigation').isVisible(),true);
    assert.equal(await np.locator('.site-header').evaluate(e=>getComputedStyle(e).position),'static');
    assert.ok(await np.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const details=np.locator('details').first();await details.locator('summary').click();assert.equal(await details.evaluate(e=>e.open),true);
  }
  await plain.close();record('both pages remain readable and navigable without JavaScript at 320px');

  const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const tp=await touchContext.newPage();observe(tp);await tp.goto(base);
  await tp.locator('#research').evaluate(e=>e.scrollIntoView({block:'start'}));
  await tp.locator('[data-node="data"]').tap();assert.equal(await tp.locator('[data-node="data"]').getAttribute('aria-pressed'),'true');
  const before=await tp.evaluate(()=>scrollY);const cdp=await touchContext.newCDPSession(tp);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:650}]});
  for(const y of [600,540,480,400,320])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await tp.waitForTimeout(300);assert.ok(await tp.evaluate(()=>scrollY)>before+80,'graph must not hijack vertical touch scroll');
  await touchContext.close();record('touch map selection works while vertical scrolling stays native');
  assert.deepEqual(errors,[],'console errors');assert.deepEqual(failedResources,[],'failed local resources');
  record('no page errors, console errors or failed same-origin resources');
} finally {
  await fs.writeFile(new URL('results.json',out),JSON.stringify({base,results,errors,failedResources},null,2));
  await browser.close();
}
