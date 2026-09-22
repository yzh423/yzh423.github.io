import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const script = await readFile(new URL("../script.js", import.meta.url), "utf8");

test("publishes the three internship projects and repository links", () => {
  assert.match(html, /href="#projects"/);
  assert.match(html, /<section id="projects"/);
  for (const url of [
    "https://github.com/yzh423/factory-dataset",
    "https://github.com/yzh423/single-arm-mount-trajectory",
    "https://github.com/yzh423/PID-MATLAB",
    "https://github.com/yzh423\?tab=repositories"
  ]) assert.match(html, new RegExp(url.replace(/[.?]/g, "\\$&")));
});

test("publication metadata matches the current CV and manuscripts", () => {
  assert.match(html, /Zhenghao Yu<\/strong>, Chaoyi Chen, Nuo Lei, Bingbing Li, Boli Chen, and Hao Zhang/);
  assert.match(html, /Published \/ JIKE \/ Vol\. 4, No\. 2 \/ April 2026/);
  assert.match(html, /https:\/\/doi\.org\/10\.62517\/jike\.202604230/);
  assert.doesNotMatch(html, /scheduled for publication/i);
});

test("current CV and all publication PDFs are available at stable paths", async () => {
  const expected = [
    ["assets/Zhenghao_Yu_Resume.pdf", 400_000],
    ["papers/game-diff-marl-cav-ramp-merging.pdf", 7_000_000],
    ["papers/wheel-leg-drug-delivery-robot.pdf", 700_000],
    ["papers/tri-modal-contactless-hmi.pdf", 800_000]
  ];
  for (const [path, minimumBytes] of expected) {
    const url = new URL(`../${path}`, import.meta.url);
    await access(url);
    assert.ok((await stat(url)).size > minimumBytes, `${path} should contain the current document`);
  }
});

test("mobile navigation is keyboard accessible and content works without JavaScript", () => {
  assert.match(html, /button[^>]+class="menu-toggle"[^>]+aria-controls="primary-navigation"[^>]+aria-expanded="false"/);
  assert.match(html, /id="primary-navigation"/);
  assert.match(script, /aria-expanded/);
  assert.match(script, /Escape/);
  assert.match(css, /\.reveal\s*\{[^}]*opacity:\s*1/s);
  assert.doesNotMatch(css, /\.js\s+\.reveal\s*\{[^}]*opacity:\s*0/s);
  assert.match(script, /menuToggle\.focus\(\)/);
  assert.match(script, /prefers-reduced-motion/);
});

test("editorial layout preserves anchors and puts work before the biography", () => {
  for (const id of ["home", "projects", "publications", "about", "research", "news", "experience", "cv", "skills", "contact"]) {
    assert.equal([...html.matchAll(new RegExp(`id="${id}"`, "g"))].length, 1, id);
  }
  const order = ["home", "projects", "publications", "about", "research", "news", "experience", "cv", "contact"].map(id => html.indexOf(`id="${id}"`));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  assert.match(css, /\.topbar\s*\{[^}]*position:\s*sticky/s);
  assert.doesNotMatch(css, /nameSheen|titleCycle|--sidebar-width/);
});

test("local editorial fonts and every referenced asset exist", async () => {
  assert.match(css, /font-family:\s*"DM Sans"/);
  assert.match(css, /font-family:\s*"Instrument Serif"/);
  assert.equal([...css.matchAll(/font-display:\s*swap/g)].length, 3);
  const paths = [...html.matchAll(/(?:src|href|poster)="((?:assets|papers)\/[^"#?]+)"/g), ...css.matchAll(/url\("([^"#?]+)"\)/g)].map(match => match[1]);
  await Promise.all([...new Set(paths)].map(path => access(new URL(`../${path}`, import.meta.url))));
});

test("project evidence uses current scoped results and native disclosure", () => {
  assert.match(html, /https:\/\/yzh423\.github\.io\/factory-dataset\//);
  for (const phrase of ["33 tasks", "2,016", "10.198 GiB", "13 UMI collections", "58 episodes", "42,223 frames", "23 archives", "three controllers", "39 deterministic runs", "360 paired stochastic trials", "0/30"]) assert.ok(html.includes(phrase), phrase);
  assert.doesNotMatch(html, /33\.3(?:→|&rarr;)80\.2%|126<\/dt>/);
  assert.match(html, /https:\/\/github\.com\/yzh423\/PID-MATLAB\/blob\/745eb8f2fe486c2ff3c2a3d0d110d433d8fe34eb\/docs\/report\/technical_report\.pdf/);
  const projects = html.slice(html.indexOf('<section id="projects"'), html.indexOf('<section id="publications"'));
  assert.equal([...projects.matchAll(/<details>/g)].length, 3);
  assert.match(html, /<video[^>]*controls[^>]*preload="none"[^>]*width="1280"[^>]*height="720"/);
  assert.match(html, /poster="assets\/fold-box-mujoco-qa-middle.png"/);
  assert.match(html, /simulation evidence/i);
});

test("media reserves space and publications show full figures", () => {
  for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
    assert.match(tag, /width="\d+"/);
    assert.match(tag, /height="\d+"/);
    assert.match(tag, /alt="[^"]+"/);
    if (!tag.includes('fetchpriority="high"')) assert.match(tag, /loading="lazy"/);
  }
  assert.match(css, /\.publication img\s*\{[^}]*object-fit:\s*contain/s);
});

test("native video uses a browser-compatible H.264 source", async () => {
  const source = html.match(/<source src="([^"]+)" type="video\/mp4">/)?.[1];
  assert.ok(source, "native MP4 source");
  const video = await readFile(new URL(`../${source}`, import.meta.url));
  assert.ok(video.includes(Buffer.from("avc1")), "video must contain an H.264/AVC sample entry");
});

test("mobile no-JS header scrolls away without changing the sticky enhanced navigation", () => {
  const mobile = css.slice(css.indexOf("@media (max-width: 780px)"), css.indexOf("@media (max-width: 520px)"));
  assert.match(mobile, /\.no-js \.topbar\s*\{\s*position:\s*static;\s*\}/);
  assert.match(css, /\.topbar\s*\{\s*position:\s*sticky;/);
  assert.match(mobile, /\.js \.primary-navigation\s*\{\s*display:\s*none;\s*\}/);
  assert.match(mobile, /\.js \.topbar\.menu-open \.primary-navigation\s*\{\s*display:\s*grid;\s*\}/);
});

test("every local image and PDF linked from markup exists", async () => {
  const paths = [...html.matchAll(/(?:src|href)="((?:assets|papers)\/[^"#?]+)"/g)].map((match) => match[1]);
  assert.ok(paths.length >= 10);
  await Promise.all([...new Set(paths)].map((path) => access(new URL(`../${path}`, import.meta.url))));
});
