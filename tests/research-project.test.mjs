import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";

const pageUrl = new URL("../projects/reliable-robotic-manipulation/index.html", import.meta.url);
const page = await readFile(pageUrl, "utf8");

test("research page distinguishes the latest diagnostic from prior tuning results", () => {
  assert.match(page, /Simulation, Adaptive Control, and Optimization Framework for Reliable Robotic Manipulation/);
  for (const phrase of ["60/60", "20/20", "6/20", "five cases", "four fixed controllers", "no optimization", "no confirmation", "simulation"]) {
    assert.match(page.toLowerCase(), new RegExp(phrase.toLowerCase().replace("/", "\\/")));
  }
  assert.doesNotMatch(page, /80\.2%|33\.3%|126 paired|360 paired stochastic trials/);
  assert.match(page, /earlier study/);
  assert.doesNotMatch(page.replace(/<[^>]+>/g, " "), /V8RS|V8R|R3/);
  assert.match(page, /manuscript in preparation/i);
});

test("paired outcome claims match the recorded original-grid comparisons", async () => {
  const home = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(home, /17\.9% \(20\/112\).*50\.9% \(57\/112\)/);
  assert.match(page, /17\.9% to 50\.9% reliable task success/);
  assert.match(page, /20\/112.*57\/112/);
  assert.match(page, /separate validation protocol/);
  const jointRmsPairs = [
    [0.0420408610370447, 0.00333318281629777, 92.1],
    [0.0124099837144, 0.00204951571392129, 83.5],
    [0.0458080208654838, 0.00164875517970888, 96.4]
  ];
  for (const [original, research, reduction] of jointRmsPairs) {
    assert.equal(Number(((1 - research / original) * 100).toFixed(1)), reduction);
    assert.match(page, new RegExp(`${reduction}%`));
  }
  const meanPairedReduction = jointRmsPairs.reduce((sum, [original, research]) => sum + (1 - research / original), 0) / jointRmsPairs.length * 100;
  assert.equal(Number(meanPairedReduction.toFixed(1)), 90.7);
  assert.equal(Number(((1 - 0.760 / 3.565) * 100).toFixed(1)), 78.7);
  assert.equal(Number(((1 - 3.09393242249039 / 4.50231571732368) * 100).toFixed(1)), 31.3);
  for (const phrase of ["90.7% mean paired reduction", "78.7%", "31.3%", "three selected simulation cases", "higher squared-torque integral"]) {
    assert.ok(page.includes(phrase), phrase);
  }
  assert.match(home, /mean paired joint RMS tracking error fell 90\.7%.*three-case numerical study|three-case numerical study.*90\.7%/);
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
  assert.ok((await stat(new URL("../assets/manipulation-research/v8r-technical-report.pdf", import.meta.url))).size > 1_000_000);
});
