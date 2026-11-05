(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 850px)');
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* Reading still works without storage. */ } }
  };
  let language = storage.get('zy-language') === 'zh' ? 'zh' : 'en';
  let userPaused = storage.get('zy-motion') === 'paused';
  let keyboard = false;
  const animations = new Set();
  const translations = [...document.querySelectorAll('[data-zh]')].map(el => ({ el, en: el.innerHTML, zh: el.dataset.zh }));
  const localizedAttributes = [...document.querySelectorAll('[data-zh-label]')].map(el => ({ el, en: el.getAttribute('aria-label'), zh: el.dataset.zhLabel }));
  const say = (en, zh) => language === 'zh' ? zh : en;
  const moving = () => !reduced.matches && !userPaused && !document.hidden;
  const animate = (el, frames, options) => {
    if (!moving() || keyboard || !el.animate) return;
    const a = el.animate(frames, options);
    animations.add(a);
    a.finished.then(() => animations.delete(a), () => animations.delete(a));
    return a;
  };
  document.addEventListener('keydown', () => { keyboard = true; }, true);
  document.addEventListener('pointerdown', () => { keyboard = false; }, true);

  const header = document.querySelector('.site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-navigation');
  let menuAnimation;
  function closeMenu(returnFocus = false) {
    menuAnimation?.cancel();
    header?.classList.remove('menu-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', say('Open navigation', '打开导航'));
    if (returnFocus) menuToggle?.focus();
  }
  menuToggle?.addEventListener('click', () => {
    if (header.classList.contains('menu-open')) { closeMenu(); return; }
    header.classList.add('menu-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', say('Close navigation', '关闭导航'));
    menuAnimation = animate(nav, [{ opacity: .4, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, easing: 'cubic-bezier(.22,1,.36,1)' });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && header?.classList.contains('menu-open')) closeMenu(true);
  });
  document.addEventListener('pointerdown', event => {
    if (header?.classList.contains('menu-open') && !header.contains(event.target)) closeMenu(false);
  });
  document.addEventListener('focusin', event => {
    if (header?.classList.contains('menu-open') && !header.contains(event.target)) closeMenu(false);
  });
  mobile.addEventListener('change', () => closeMenu());
  nav?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  root.classList.remove('no-js');
  root.classList.add('js');

  const themeToggle = document.querySelector('.theme-toggle');
  function themeLabel() {
    themeToggle?.setAttribute('aria-label', root.dataset.theme === 'dark' ? say('Switch to light theme', '切换到浅色主题') : say('Switch to dark theme', '切换到深色主题'));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', root.dataset.theme === 'dark' ? '#161715' : '#ffffff');
  }
  function setTheme(value) {
    root.classList.add('theme-changing');
    void root.offsetWidth;
    root.dataset.theme = value;
    themeLabel();
    document.dispatchEvent(new Event('site:theme'));
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-changing')));
  }
  themeToggle?.addEventListener('click', () => {
    const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    storage.set('zy-theme', theme);
    setTheme(theme);
  });
  systemDark.addEventListener('change', () => { if (!storage.get('zy-theme')) setTheme(systemDark.matches ? 'dark' : 'light'); });

  const motionToggle = document.querySelector('.motion-toggle');
  function refreshMotion() {
    root.dataset.motion = moving() ? 'running' : 'paused';
    if (!moving()) for (const a of animations) a.cancel();
    if (motionToggle) {
      motionToggle.setAttribute('aria-pressed', String(userPaused || reduced.matches));
      motionToggle.querySelector('span').textContent = reduced.matches ? say('Reduced motion', '已减少动态效果') : userPaused ? say('Resume motion', '继续动效') : say('Pause motion', '暂停动效');
      motionToggle.disabled = reduced.matches;
      motionToggle.querySelector('path').setAttribute('d', userPaused ? 'M8 4l12 8-12 8Z' : 'M8 5v14M16 5v14');
    }
    document.dispatchEvent(new Event('site:motion'));
  }
  motionToggle?.addEventListener('click', () => {
    userPaused = !userPaused;
    storage.set('zy-motion', userPaused ? 'paused' : 'running');
    refreshMotion();
  });
  reduced.addEventListener('change', refreshMotion);
  document.addEventListener('visibilitychange', refreshMotion);

  function setLanguage(value) {
    language = value;
    root.lang = value === 'zh' ? 'zh-CN' : 'en';
    for (const { el, en, zh } of translations) el.innerHTML = value === 'zh' ? zh : en;
    for (const { el, en, zh } of localizedAttributes) el.setAttribute('aria-label', value === 'zh' ? zh : en);
    const toggle = document.querySelector('.language-toggle');
    if (toggle) {
      toggle.textContent = value === 'zh' ? 'EN' : '中';
      toggle.lang = value === 'zh' ? 'en' : 'zh-CN';
      toggle.setAttribute('aria-label', value === 'zh' ? 'Switch to English' : '切换为中文');
    }
    const isDetail = document.body.classList.contains('research-detail');
    document.title = isDetail ? say('Reliable Robotic Manipulation | Zhenghao YU', '可靠机器人操作研究 | Zhenghao YU') : say('Zhenghao YU | Robotics, AI, Autonomous Systems', 'Zhenghao YU · Daniel | 机器人与人工智能');
    menuToggle?.setAttribute('aria-label', header?.classList.contains('menu-open') ? say('Close navigation','关闭导航') : say('Open navigation','打开导航'));
    themeLabel();
    refreshMotion();
    document.dispatchEvent(new Event('site:language'));
  }
  document.querySelector('.language-toggle')?.addEventListener('click', () => {
    const y = window.scrollY;
    setLanguage(language === 'en' ? 'zh' : 'en');
    storage.set('zy-language', language);
    // Keep the reader near the selected section when line lengths change.
    if (y > 100) document.querySelector('section.is-current')?.scrollIntoView({ block: 'start' });
  });

  // The same destinations work without JS; pointer navigation adds a short smooth scroll.
  document.addEventListener('click', event => {
    const a = event.target.closest('a[href^="#"]');
    if (!a || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(a.hash.slice(1));
    if (!target) return;
    event.preventDefault();
    history.pushState(null, '', a.hash);
    closeMenu(false);
    target.scrollIntoView({ behavior: moving() && event.detail > 0 ? 'smooth' : 'instant', block: 'start' });
    if (event.detail === 0) {
      const hadTabindex = target.hasAttribute('tabindex');
      if (!hadTabindex) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      if (!hadTabindex) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }
  });
  const navLinks = [...(nav?.querySelectorAll('a[href^="#"]') || [])];
  const sections = [...document.querySelectorAll('main > section[id]')];
  const progress = document.querySelector('.reading-progress');
  let scrollFrame = 0;
  function syncScroll() {
    scrollFrame = 0;
    const max = root.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.max(0, Math.min(1, scrollY / max)) : 0})`;
    let current = sections[0];
    const threshold = Math.min(innerHeight * .3, 250);
    for (const section of sections) if (section.getBoundingClientRect().top <= threshold) current = section;
    if (max > 0 && scrollY >= max - 3) current = sections.at(-1);
    for (const section of sections) section.classList.toggle('is-current', section === current);
    for (const a of navLinks) {
      if (a.hash === `#${current?.id}`) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    }
  }
  addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(syncScroll); }, { passive: true });
  addEventListener('resize', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(syncScroll); }, { passive: true });

  // Native buttons give the map the same hover/tap exploration as the reference,
  // while adding keyboard access and allowing ordinary vertical touch scrolling.
  const nodes = [...document.querySelectorAll('.graph-node')];
  const graph = document.querySelector('.research-map');
  const note = document.querySelector('#graph-note');
  let selectedNode = null;
  let previewNode = null;
  let noteAnimation;
  function showNode(node, transient = false) {
    if (!note) return;
    previewNode = transient ? node : null;
    const active = node || selectedNode;
    for (const item of nodes) item.setAttribute('aria-pressed', String(item === selectedNode));
    for (const edge of graph.querySelectorAll('[data-edge]')) edge.classList.toggle('is-active', edge.dataset.edge === active?.dataset.node);
    noteAnimation?.cancel();
    note.querySelector('strong').textContent = active ? active.textContent : say('Research is connected.', '研究是彼此相连的。');
    note.querySelector('p').textContent = active ? say(active.dataset.note, active.dataset.noteZh) : say('Hover, tap, or tab to a topic to see how it connects to my work.', '悬停、点选或用 Tab 键选择一个主题，查看它与我的工作的联系。');
    const link = note.querySelector('a');
    link.href = active?.dataset.link || '#projects';
    link.textContent = active ? say('Explore this work', '查看相关研究') : say('Explore the work', '查看相关项目');
    if (!transient) noteAnimation = animate(note.querySelector('div'), [{ opacity: .55, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
  for (const node of nodes) {
    node.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') showNode(node, true); });
    node.addEventListener('focus', () => showNode(node, true));
    node.addEventListener('click', () => { selectedNode = selectedNode === node ? null : node; showNode(selectedNode); });
    node.addEventListener('keydown', event => {
      if (event.key === 'Escape') { selectedNode = null; showNode(null); }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && !event.altKey && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        const step = ['ArrowLeft','ArrowUp'].includes(event.key) ? -1 : 1;
        nodes[(nodes.indexOf(node) + step + nodes.length) % nodes.length].focus();
      }
    });
  }
  graph?.addEventListener('pointerleave', () => showNode(selectedNode, true));
  graph?.addEventListener('focusout', event => { if (!graph.contains(event.relatedTarget)) showNode(selectedNode, true); });
  document.addEventListener('site:language', () => showNode(previewNode || selectedNode, true));

  // Only the labeled introductory preview can play automatically. Full evidence
  // videos always keep explicit native play controls and never auto-start.
  const preview = document.querySelector('video[data-preview]');
  if (preview) {
    let visible = false;
    let manuallyPaused = false;
    let systemPausing = false;
    let expectedPause = false;
    let playToken = 0;
    const canPreview = () => visible && moving() && !navigator.connection?.saveData && !manuallyPaused;
    function pausePreview() {
      ++playToken;
      if (!preview.paused) { expectedPause = true; systemPausing = true; preview.pause(); systemPausing = false; }
    }
    function updatePreview() {
      if (!canPreview()) { pausePreview(); return; }
      const token = ++playToken;
      preview.muted = true;
      const promise = preview.play();
      promise?.then(() => { if (token !== playToken && !canPreview()) pausePreview(); }, () => { /* Native play remains available when autoplay is blocked. */ });
    }
    preview.addEventListener('pause', () => {
      if (expectedPause) { expectedPause = false; return; }
      if (!systemPausing && visible && moving()) manuallyPaused = true;
    });
    preview.addEventListener('play', () => { manuallyPaused = false; });
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
      visible = entries[0].intersectionRatio >= .35;
      updatePreview();
    }, { threshold: [0, .35] }).observe(preview);
    document.addEventListener('site:motion', updatePreview);
    navigator.connection?.addEventListener?.('change', updatePreview);
  }
  for (const video of document.querySelectorAll('video:not([data-preview])')) {
    video.addEventListener('play', () => {
      for (const other of document.querySelectorAll('video')) if (other !== video && !other.paused) other.pause();
    });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) for (const video of document.querySelectorAll('video')) video.pause();
  });

  // Bounded particle typography. The actual name stays in the semantic heading.
  const canvas = document.querySelector('#name-particles');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const surface = canvas.closest('.particle-surface');
      const sample = document.createElement('canvas');
      const sampleCtx = sample.getContext('2d', { willReadFrequently: true });
      let points = [], width = 0, height = 0, frame = 0, visible = false;
      let pointer = null, lastTime = 0, settledFrames = 0;
      let ink, accent;
      function colors() {
        const css = getComputedStyle(root);
        ink = css.getPropertyValue('--ink').trim(); accent = css.getPropertyValue('--accent').trim();
      }
      function draw() {
        ctx.clearRect(0, 0, width, height);
        for (const p of points) {
          ctx.fillStyle = p.accent ? accent : ink;
          ctx.fillRect(p.x, p.y, 1.3, 1.8);
        }
      }
      function stop() { cancelAnimationFrame(frame); frame = 0; }
      function tick(time) {
        frame = 0;
        if (!moving() || !visible) return;
        const delta = Math.min(2, (time - lastTime) / 16.67 || 1); lastTime = time;
        let energy = 0;
        for (const p of points) {
          let ax = (p.tx - p.x) * .035, ay = (p.ty - p.y) * .035;
          if (pointer) {
            const dx = p.x - pointer.x, dy = p.y - pointer.y;
            const distance = Math.hypot(dx, dy);
            if (distance > .1 && distance < 60) { const force = (1 - distance / 60) * 1.5; ax += dx / distance * force; ay += dy / distance * force; }
          }
          p.vx = (p.vx + ax * delta) * .8; p.vy = (p.vy + ay * delta) * .8;
          p.x += p.vx * delta; p.y += p.vy * delta;
          energy += Math.abs(p.vx) + Math.abs(p.vy);
        }
        draw();
        settledFrames = energy < 1 ? settledFrames + 1 : 0;
        if (settledFrames < 12 || pointer) frame = requestAnimationFrame(tick);
      }
      function start() {
        if (moving() && visible && !frame) { settledFrames = 0; lastTime = performance.now(); frame = requestAnimationFrame(tick); }
      }
      function resize() {
        stop();
        const rect = canvas.getBoundingClientRect(); width = rect.width; height = rect.height;
        if (!width || !height || !sampleCtx) return;
        const dpr = Math.min(devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        sample.width = Math.ceil(width); sample.height = Math.ceil(height);
        const size = Math.min(66, width / 6.8);
        sampleCtx.font = `500 ${size}px Newsreader, Georgia, serif`;
        sampleCtx.textAlign = 'center'; sampleCtx.textBaseline = 'middle';
        sampleCtx.fillText('Zhenghao YU', width / 2, height * .48);
        const pixels = sampleCtx.getImageData(0, 0, sample.width, sample.height).data;
        points = [];
        const step = width < 350 ? 2 : 2.5;
        for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
          if (pixels[(Math.floor(y) * sample.width + Math.floor(x)) * 4 + 3] < 100) continue;
          const scatter = moving() ? 20 : 0;
          points.push({ x: x + (Math.random() - .5) * scatter, y: y + (Math.random() - .5) * scatter, tx: x, ty: y, vx: 0, vy: 0, accent: x > width * .62 });
        }
        colors(); draw(); surface.classList.add('particles-ready'); start();
      }
      canvas.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse' || !moving()) return;
        const r = canvas.getBoundingClientRect(); pointer = { x: e.clientX - r.left, y: e.clientY - r.top }; start();
      }, { passive: true });
      canvas.addEventListener('pointerleave', () => { pointer = null; start(); });
      document.addEventListener('site:theme', () => { colors(); draw(); });
      document.addEventListener('site:motion', () => {
        if (!moving()) { stop(); for (const p of points) { p.x = p.tx; p.y = p.ty; p.vx = p.vy = 0; } draw(); }
        else start();
      });
      if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (visible) start(); else stop();
      }).observe(canvas);
      else visible = true;
      new ResizeObserver(resize).observe(canvas);
      document.fonts.ready.then(resize);
    }
  }

  // Repeated reading stays still. Entrances run once and never hide default content.
  if ('IntersectionObserver' in window) {
    const reveal = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        reveal.unobserve(entry.target);
        if (entry.boundingClientRect.top < 0) continue;
        animate(entry.target, [{ opacity: .45, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    }, { threshold: .08 });
    for (const el of document.querySelectorAll('main > section > h2, .section-heading, .publication, .timeline article, .about-essay')) reveal.observe(el);
    const graphStage = document.querySelector('.graph-stage');
    if (graphStage) {
      let graphVisible = false;
      const syncGraphMotion = () => graphStage.style.setProperty('--graph-play', graphVisible && moving() ? 'running' : 'paused');
      new IntersectionObserver(entries => { graphVisible = entries[0].isIntersecting; syncGraphMotion(); }).observe(graphStage);
      document.addEventListener('site:motion', syncGraphMotion);
    }
  }
  setLanguage(language);
  syncScroll();
  if (!location.hash || location.hash === '#home') {
    const name = document.querySelector('.name-line');
    if (name) animate(name, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 760, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
})();
