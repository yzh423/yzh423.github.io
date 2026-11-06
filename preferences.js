/* Choose the opening appearance before the first paint. Only navigation
   within this visit carries a manual choice into the next document. */
(() => {
  const root=document.documentElement;
  const navigation=performance.getEntriesByType('navigation')[0]?.type;
  const sameSite=document.referrer && new URL(document.referrer).origin===location.origin;
  const carry=navigation==='back_forward' || (navigation==='reload' ? root.dataset.entry!=='home' : sameSite);
  const key='zy-visit-appearance';
  let settings={theme:'light',language:'en'};
  try {
    if(carry) {
      const saved=JSON.parse(sessionStorage.getItem(key)||'{}');
      settings.theme=saved?.theme==='dark'?'dark':'light';
      settings.language=saved?.language==='zh'?'zh':'en';
    }
    sessionStorage.setItem(key,JSON.stringify(settings));
  } catch { /* Private browsing can still use both controls in this document. */ }
  root.dataset.theme=settings.theme;
  root.lang=settings.language==='zh'?'zh-CN':'en';
  window.siteAppearance={
    remember(name,value) {
      settings[name]=value;
      try { sessionStorage.setItem(key,JSON.stringify(settings)); } catch {}
    }
  };
})();
