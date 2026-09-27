import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";

const pageUrl = new URL("../projects/reliable-robotic-manipulation/index.html", import.meta.url);
const page = await readFile(pageUrl, "utf8");

test("R3 page distinguishes the latest diagnostic from prior tuning results", () => {
  assert.match(page, /Simulation, Adaptive Control, and Optimization Framework for Reliable Robotic Manipulation/);
  for (const phrase of ["60/60", "20/20", "6/20", "five cases", "four fixed controllers", "no optimization", "no confirmation", "simulation"]) {
    assert.match(page.toLowerCase(), new RegExp(phrase.toLowerCase().replace("/", "\\/")));
  }
  assert.doesNotMatch(page, /80\.2%|33\.3%|126 paired|360 paired stochastic trials/);
  assert.match(page, /earlier V8R/);
  assert.match(page, /manuscript in preparation/i);
});

test("every detail-page anchor and local media path resolves", async () => {
  const ids = new Set([...page.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  for (const [, id] of page.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(id), `missing anchor #${id}`);
  const paths = [...page.matchAll(/(?:src|href|poster)="((?:\.\.\/\.\.\/)?(?:assets|styles\.css|script\.js|project\.css)[^"#?]*)"/g)].map(match => match[1]);
  for (const path of new Set(paths)) await access(new URL(path, pageUrl));
  for (const [, tag] of page.matchAll(/(<img\b[^>]*>)/g)) {
    assert.match(tag, /alt="[^"]+"/);
    assert.match(tag, /width="\d+" height="\d+"/);
  }
});

test("R3 evidence uses playable H.264 video and a substantive report", async () => {
  const sources = [...page.matchAll(/<source src="([^"]+)" type="video\/mp4">/g)].map(match => match[1]);
  assert.equal(sources.length, 2);
  for (const source of sources) {
    const video = await readFile(new URL(source, pageUrl));
    assert.ok(video.includes(Buffer.from("avc1")), `${source} must be H.264`);
  }
  assert.ok((await stat(new URL("../assets/manipulation-research/r3-technical-report.pdf", import.meta.url))).size > 500_000);
});
