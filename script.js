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
  menuToggle?.addEventListener('click', event => {
    if (header.classList.contains('menu-open')) { closeMenu(); return; }
    header.classList.add('menu-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', say('Close navigation', '关闭导航'));
    if (event.detail === 0) nav?.querySelector('a')?.focus({preventScroll: true});
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
    const section = document.querySelector('section.is-current');
    const fraction = section ? (scrollY - section.offsetTop) / section.offsetHeight : 0;
    setLanguage(language === 'en' ? 'zh' : 'en');
    storage.set('zy-language', language);
    // Keep the reader near the selected section when line lengths change.
    if (section && scrollY > 100) scrollTo({ top: section.offsetTop + section.offsetHeight * fraction, behavior: 'instant' });
  });

  // The same destinations work without JS; pointer navigation adds a short smooth scroll.
  document.addEventListener('click', event => {
    const a = event.target.closest('a[href^="#"]');
    if (!a || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(a.hash.slice(1));
    if (!target) return;
    event.preventDefault();
    if (location.hash !== a.hash) history.pushState(null, '', a.hash);
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
    const threshold = innerHeight * .37;
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

  // Each topic is already a link in the HTML. The optional preview shares
  // that destination; it never intercepts a first tap to ask for a second one.
  const nodes = [...document.querySelectorAll('.graph-node')];
  const graph = document.querySelector('.research-map');
  const note = document.querySelector('#graph-note');
  let activeNode = null, dismissTimer;
  function placeNote(node) {
    if (!node || note.hidden) return;
    const field = graph.getBoundingClientRect(), anchor = node.getBoundingClientRect();
    const left = anchor.left - field.left + (anchor.width - note.offsetWidth) / 2;
    const room = Math.min(field.bottom, innerHeight) - anchor.bottom;
    note.style.left = Math.max(0, Math.min(left, field.width - note.offsetWidth)) + 'px';
    note.style.top = (room >= note.offsetHeight + 4 ? anchor.bottom - field.top + 3 : Math.max(0, anchor.top - field.top - note.offsetHeight - 3)) + 'px';
  }
  function preview(node) {
    clearTimeout(dismissTimer);
    if (!note) return;
    activeNode?.classList.remove('is-previewed');
    activeNode = node;
    note.hidden = !node;
    if (node) {
      node.classList.add('is-previewed');
      note.setAttribute('href',node.getAttribute('href'));
      note.querySelector('strong').textContent = node.firstElementChild.textContent;
      note.querySelector('.note-text').textContent = document.getElementById(node.getAttribute('aria-describedby')).textContent;
      placeNote(node);
    } else { note.removeAttribute('href'); }
    const edges = [...graph.querySelectorAll('[data-edge]')], trail = new Set();
    let key = node?.dataset.node;
    while (key && key !== 'root' && !trail.has(key)) {
      trail.add(key); key = edges.find(e => e.dataset.edge === key)?.dataset.from;
    }
    for (const edge of edges) edge.classList.toggle('is-active', trail.has(edge.dataset.edge));
  }
  const dismissSoon = () => { clearTimeout(dismissTimer); dismissTimer = setTimeout(() => preview(null), 180); };
  for (const node of nodes) {
    node.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') preview(node); });
    node.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') dismissSoon(); });
    node.addEventListener('focus', () => preview(node));
    node.addEventListener('keydown', e => {
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key) && !e.altKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const step = ['ArrowLeft','ArrowUp'].includes(e.key) ? -1 : 1;
        nodes[(nodes.indexOf(node) + step + nodes.length) % nodes.length].focus();
      }
    });
  }
  if (graph) {
    note.addEventListener('pointerenter', () => clearTimeout(dismissTimer));
    note.addEventListener('pointerleave', dismissSoon);
    graph.addEventListener('focusout', e => { if (!graph.contains(e.relatedTarget)) preview(null); });
    graph.addEventListener('keydown', e => { if (e.key === 'Escape') preview(null); });
    graph.addEventListener('click', e => {
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.target.closest('a')) {
        // Let native navigation (and the document's anchor handler) read the href first.
        requestAnimationFrame(() => preview(null));
      }
    });
    document.addEventListener('pointerdown', e => { if (activeNode && !graph.contains(e.target)) preview(null); }, {passive:true});
    document.addEventListener('site:language', () => { if (activeNode) preview(activeNode); });
    new ResizeObserver(() => placeNote(activeNode)).observe(graph);
  }

  for (const disclosure of document.querySelectorAll('.recording')) {
    disclosure.addEventListener('toggle', () => { if (!disclosure.open) disclosure.querySelector('video')?.pause(); });
  }
  for (const video of document.querySelectorAll('video:not([data-preview])')) {
    video.addEventListener('play', () => {
      for (const other of document.querySelectorAll('video')) if (other !== video && !other.paused) other.pause();
    });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) for (const video of document.querySelectorAll('video')) video.pause();
  });

  // Reveal the individual reading units, including items below the fold of a large section.
  if ('IntersectionObserver' in window) {
    const targets = document.querySelectorAll([
      '.about-essay', '.about-images', '.field-heading', '.research-map', '.research-card',
      '.section-heading', '.project-media', '.project-copy', '.all-projects-link', '.publication',
      'main > section > h2', '.news-list li', '.news-archive > summary', '.timeline article',
      '.closing-grid h2', '.compact-item', '.skill-groups > div', '.cv-download',
      '.contact-inner > *', '.detail-stat-band', '.detail-section-heading', '.comparison-copy',
      '.detail-conclusions > div:first-child', '.method-grid article', '.evidence-feature', '.evidence-grid figure', '.detail-extra-video > summary', '.detail-scope > div'
    ].join(','));
    const reveal = new IntersectionObserver(entries => {
      let order = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        reveal.unobserve(entry.target);
        entry.target.classList.remove('read-pending');
        if (entry.target.matches(':focus-within')) continue;
        animate(entry.target, [{ opacity: 0, translate: '0 16px' }, { opacity: 1, translate: '0 0' }], {
          duration: 760, delay: Math.min(order++, 3) * 45, easing: 'cubic-bezier(.22,.74,.24,1)', fill: 'backwards'
        });
      }
    }, { threshold: 0, rootMargin: '0px 0px -16px 0px' });
    for (const el of targets) { el.classList.add('read-pending'); reveal.observe(el); }
    document.addEventListener('focusin', event => {
      const el = event.target.closest('.read-pending');
      if (el) { el.classList.remove('read-pending'); reveal.unobserve(el); }
    });
  }
  setLanguage(language);
  syncScroll();
  const heading = document.querySelector('.hero-identity h1');
  if (heading) {
    function revealIdentity() {
      const easing = 'cubic-bezier(.19,.8,.27,1)';
      const words = [...heading.querySelectorAll('.name-word')].map((word, i) => animate(word, [
        { opacity: 0, transform: 'translateY(.22em)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 620, delay: i * 125, easing, fill: 'backwards' }));
      const signature = animate(heading.querySelector('.name-secondary'), [
        { opacity: 0, clipPath: 'inset(-20% 100% -20% -10%)', transform: 'translateY(.12em)' },
        { opacity: 1, clipPath: 'inset(-20% -12% -20% -10%)', transform: 'translateY(0)' }
      ], { duration: 680, delay: 360, easing, fill: 'backwards' });
      return Promise.allSettled([...words, signature].filter(Boolean).map(a => a.finished));
    }
    if (['', '#home', '#hero', '#main-content'].includes(location.hash)) {
      window.identityReady = revealIdentity();
    } else if ('IntersectionObserver' in window) {
      // A direct research link should not spend the entrance offscreen or delay the banner.
      let away = false;
      const entrance = new IntersectionObserver(([entry]) => {
        // The browser can report the top of the document before it jumps to the fragment.
        if (entry.intersectionRatio < .6) { away = true; return; }
        if (!away) return;
        entrance.disconnect();
        revealIdentity();
      }, { threshold: .6 });
      entrance.observe(heading);
    }
  }
})();
