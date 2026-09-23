import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

function hex(name) {
  return css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
}

function luminance(color) {
  const channels = color.slice(1).match(/.{2}/g).map((value) => Number.parseInt(value, 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test("editorial palette and dark closing text meet WCAG AA contrast", () => {
  assert.equal(hex("paper").toLowerCase(), "#f5f2eb");
  assert.equal(hex("ink").toLowerCase(), "#20251f");
  assert.equal(hex("green").toLowerCase(), "#315447");
  for (const color of ["ink", "green", "muted"]) assert.ok(contrast(hex(color), hex("paper")) >= 4.5, color);
  assert.ok(contrast(hex("paper"), hex("ink")) >= 4.5);
  assert.ok(contrast(hex("paper"), hex("green")) >= 4.5);
  assert.ok(contrast(hex("on-dark-muted"), hex("ink")) >= 4.5);
  assert.ok(contrast(hex("on-dark-muted"), hex("green")) >= 4.5);
});
