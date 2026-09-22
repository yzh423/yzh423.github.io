import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const source = await readFile(new URL("../script.js", import.meta.url), "utf8");
function element(attrs = {}) {
  const classes = new Set();
  return {
    attrs, listeners: {}, style: {}, id: attrs.id,
    classList: { add: (...names) => names.forEach(name => classes.add(name)), remove: name => classes.delete(name), toggle: (name, state) => state ? classes.add(name) : classes.delete(name), contains: name => classes.has(name) },
    setAttribute(name, value) { this.attrs[name] = value; },
    getAttribute(name) { return this.attrs[name]; },
    removeAttribute(name) { delete this.attrs[name]; },
    addEventListener(name, handler) { this.listeners[name] = handler; },
    focus() { this.focused = true; },
    getBoundingClientRect() { return { top: this.top ?? 500 }; }
  };
}
function boot({ reduced = false, observer = true } = {}) {
  const topbar = element();
  const toggle = element({ "aria-expanded": "false" });
  const links = ["#projects", "#publications", "#experience", "#contact", "assets/Zhenghao_Yu_Resume.pdf"].map(href => element({ href }));
  const sectionLinks = links.filter(link => link.attrs.href.startsWith("#"));
  const nav = element();
  nav.querySelectorAll = selector => selector === "a" ? links : sectionLinks;
  const sections = sectionLinks.map(link => element({ id: link.attrs.href.slice(1) }));
  const reveal = element();
  const doc = element();
  doc.documentElement = element();
  doc.documentElement.scrollHeight = 10000;
  doc.documentElement.clientHeight = 800;
  doc.querySelector = selector => ({ ".topbar": topbar, ".menu-toggle": toggle, "#primary-navigation": nav })[selector];
  doc.querySelectorAll = selector => selector === ".reveal" ? [reveal] : sections;
  doc.getElementById = id => sections.find(section => section.id === id);
  const observers = [];
  class Observer {
    constructor(callback) { this.callback = callback; this.observed = []; this.removed = []; observers.push(this); }
    observe(item) { this.observed.push(item); }
    unobserve(item) { this.removed.push(item); }
  }
  const win = element();
  win.innerHeight = 800;
  win.scrollY = 0;
  if (observer) win.IntersectionObserver = Observer;
  runInNewContext(source, { document: doc, window: win, IntersectionObserver: Observer, matchMedia: query => ({ matches: query.includes("reduced-motion") && reduced, addEventListener() {} }), requestAnimationFrame: callback => callback() });
  return { topbar, toggle, links, doc, observers, reveal, sections, win };
}

test("mobile menu closes on Escape and returns keyboard focus", () => {
  const page = boot();
  page.toggle.listeners.click();
  assert.equal(page.toggle.attrs["aria-expanded"], "true");
  page.doc.listeners.keydown({ key: "Escape" });
  assert.equal(page.toggle.attrs["aria-expanded"], "false");
  assert.equal(page.toggle.focused, true);
});

test("every menu destination including the CV closes the menu", () => {
  const page = boot();
  for (const link of page.links) {
    page.toggle.listeners.click();
    link.listeners.click();
    assert.equal(page.toggle.attrs["aria-expanded"], "false");
  }
});

test("reveal enhancement runs once and respects reduced motion", () => {
  const page = boot();
  const revealObserver = page.observers.find(item => item.observed.includes(page.reveal));
  revealObserver.callback([{ isIntersecting: true, target: page.reveal }]);
  assert.ok(revealObserver.removed.includes(page.reveal));
  const reducedPage = boot({ reduced: true });
  assert.equal(reducedPage.observers.some(item => item.observed.includes(reducedPage.reveal)), false);
  assert.doesNotThrow(() => boot({ observer: false }));
});

test("active navigation follows the last reached destination and clears at home", () => {
  const page = boot();
  assert.equal(page.links.some(link => link.attrs["aria-current"]), false);
  page.sections[0].top = 120;
  page.win.listeners.scroll();
  assert.equal(page.links[0].attrs["aria-current"], "location");
  page.sections[0].top = -500;
  page.sections[1].top = 120;
  page.win.listeners.scroll();
  assert.equal(page.links[0].attrs["aria-current"], undefined);
  assert.equal(page.links[1].attrs["aria-current"], "location");
  page.sections.forEach(section => { section.top = 500; });
  page.win.listeners.scroll();
  assert.equal(page.links.some(link => link.attrs["aria-current"]), false);
});

test("Contact becomes current at the document bottom even below the reading line", () => {
  const page = boot();
  page.win.innerHeight = 1080;
  page.doc.documentElement.clientHeight = 1080;
  page.doc.documentElement.scrollHeight = 10000;
  page.sections[0].top = -8000;
  page.sections[1].top = -5000;
  page.sections[2].top = -1000;
  page.sections[3].top = 350;
  const experience = page.links[2];
  const contact = page.links[3];

  page.win.scrollY = 8800;
  page.win.listeners.scroll();
  assert.equal(experience.attrs["aria-current"], "location");
  assert.equal(contact.attrs["aria-current"], undefined);

  for (const scrollY of [8920, 8919]) {
    page.win.scrollY = scrollY;
    page.win.listeners.scroll();
    assert.equal(contact.attrs["aria-current"], "location", "Contact is current at or within one pixel of the bottom");
    assert.equal(experience.attrs["aria-current"], undefined);
  }

  page.win.scrollY = 8800;
  page.win.listeners.scroll();
  assert.equal(experience.attrs["aria-current"], "location", "normal section tracking resumes above the bottom");
  assert.equal(contact.attrs["aria-current"], undefined);
});
