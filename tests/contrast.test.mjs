import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
const luminance = hex => {
  const rgb = hex.slice(1).match(/../g).map(v => parseInt(v,16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
  return rgb[0]*.2126 + rgb[1]*.7152 + rgb[2]*.0722;
};
test('light and dark text and accent tokens meet AA on their reading surfaces', () => {
  for (const body of [css.match(/:root\s*\{([^}]+)/)[1], css.match(/:root\[data-theme="dark"\]\s*\{([^}]+)/)[1]]) {
    const token = name => body.match(new RegExp(`--${name}:\\s*(#[a-f0-9]{6})`, 'i'))?.[1];
    for (const bg of ['paper','surface']) for (const fg of ['ink','muted','accent']) {
      const [light,dark] = [luminance(token(bg)),luminance(token(fg))].sort((a,b)=>b-a);
      assert.ok((light+.05)/(dark+.05)>=4.5, `${fg} on ${bg}`);
    }
  }
});
