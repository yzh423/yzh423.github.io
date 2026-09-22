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
  assert.match(css, /\.js\s+\.reveal\s*\{[^}]*opacity:\s*0/s);
});

test("every local image and PDF linked from markup exists", async () => {
  const paths = [...html.matchAll(/(?:src|href)="((?:assets|papers)\/[^"#?]+)"/g)].map((match) => match[1]);
  assert.ok(paths.length >= 10);
  await Promise.all([...new Set(paths)].map((path) => access(new URL(`../${path}`, import.meta.url))));
});
