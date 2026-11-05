import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const home = await readFile(new URL('index.html', root), 'utf8');
const pages = ['index.html', 'projects/reliable-robotic-manipulation/index.html'];

test('every existing section and research destination remains available', () => {
  for (const id of ['home','about','research','projects','publications','news','experience','cv','skills','contact','education']) {
    assert.equal([...home.matchAll(new RegExp(`\\bid="${id}"`, 'g'))].length, 1, id);
  }
  for (const path of ['factory-dataset','single-arm-mount-trajectory','PID-MATLAB']) assert.ok(home.includes(`https://github.com/yzh423/${path}`));
  assert.ok(home.includes('https://github.com/yzh423?tab=repositories'));
  assert.ok(home.includes('https://yzh423.github.io/factory-dataset/'));
});

test('publication authors, status and scoped project results remain intact', () => {
  for (const text of ['Zhenghao Yu</strong>, Chaoyi Chen, Nuo Lei, Bingbing Li, Boli Chen, and Hao Zhang', 'Accepted / In Press / IEEE OJITS / 2026', 'Published / JIKE / Vol. 4, No. 2 / April 2026', '10.62517/jike.202604230', '33 tasks', '2,016', '10.198 GiB', '58 episodes', '42,223 frames', '97.88%', '98.81%', 'no retiming or object model', 'not a hardware-ready command', 'SevnceRobotics', 'Ragtime Lab']) assert.ok(home.includes(text), text);
  assert.doesNotMatch(home, /scheduled for publication|126 paired|80\.2%/i);
});

test('all seven published PDFs keep their original bytes and URLs', async () => {
  const expected = JSON.parse(await readFile(new URL('tests/downloads.json', root), 'utf8'));
  assert.equal(Object.keys(expected).length, 7);
  for (const [path, hash] of Object.entries(expected)) assert.equal(createHash('sha256').update(await readFile(new URL(path, root))).digest('hex'), hash, path);
});

test('both semantic documents have unique anchors and valid local media and font references', async () => {
  for (const path of pages) {
    const url = new URL(path, root);
    const html = await readFile(url, 'utf8');
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, ids.length, `${path}: duplicate id`);
    for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(id), `${path}: #${id}`);
    for (const [, asset] of html.matchAll(/(?:src|href|poster)="([^"#]+)"/g)) {
      if (/^(?:https?:|mailto:|data:)/.test(asset)) continue;
      const target = new URL(asset, url); target.search = ''; target.hash = '';
      if (target.pathname.endsWith('/')) target.pathname += 'index.html';
      await access(target);
    }
    for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
      assert.match(tag, /alt="[^"]+"/); assert.match(tag, /width="\d+"/); assert.match(tag, /height="\d+"/);
    }
    assert.match(html, /<html[^>]+lang="en"/);
    assert.ok([...html.matchAll(/data-zh=/g)].length > 50, `${path}: bilingual content`);
  }
  const css = await readFile(new URL('styles.css', root), 'utf8');
  for (const [, path] of css.matchAll(/url\("([^"]+)"\)/g)) await access(new URL(path, root));
});

test('recorded videos are H.264; evidence videos stay manually playable', async () => {
  for (const path of pages) {
    const url = new URL(path, root), html = await readFile(url, 'utf8');
    for (const [video] of html.matchAll(/<video\b[\s\S]*?<\/video>/g)) {
      assert.match(video, /\bcontrols(?:[\s=])/); assert.match(video, /\bplaysinline(?:[\s=])/); assert.match(video, /preload="none"/);
      assert.doesNotMatch(video, /\bautoplay\b/);
      const src = video.match(/<source[^>]+src="([^"]+)"/)?.[1];
      assert.ok(src);
      assert.ok((await readFile(new URL(src, url))).includes(Buffer.from('avc1')), src);
    }
  }
});
