// Theme before paint; language waits for the semantic document.
(() => {
  try {
    const theme = localStorage.getItem('zy-theme');
    document.documentElement.dataset.theme = theme === 'dark' || (!theme && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  } catch {
    document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
})();
