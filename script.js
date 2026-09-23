const topbar = document.querySelector(".topbar");
const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#primary-navigation");
const navLinks = [...navigation.querySelectorAll("a[href^='#']")];
const revealItems = [...document.querySelectorAll(".reveal")];

function setMenu(open) {
  topbar.classList.toggle("menu-open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
}

menuToggle.addEventListener("click", () => setMenu(menuToggle.getAttribute("aria-expanded") !== "true"));
topbar.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || menuToggle.getAttribute("aria-expanded") !== "true") return;
  setMenu(false);
  menuToggle.focus();
});
matchMedia("(min-width: 781px)").addEventListener("change", (event) => {
  if (event.matches) setMenu(false);
});

// Enable the collapsed mobile menu only after its handlers are ready.
document.documentElement.classList.remove("no-js");
document.documentElement.classList.add("js");

if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.08 });
  revealItems.forEach((item) => revealObserver.observe(item));
}

// Track the destinations represented in the left navigation.
const destinations = navLinks.map((link) => ({
  link,
  section: document.getElementById(link.getAttribute("href").slice(1))
}));
function updateActiveNavigation() {
  let current = null;
  const readingLine = Math.min(window.innerHeight * 0.35, 240);
  destinations.forEach(({ link, section }) => {
    if (section && section.getBoundingClientRect().top <= readingLine) current = link;
  });
  // A short closing section cannot always reach the reading line. Allow two
  // pixels for fractional scroll positions when the document reaches its end.
  const root = document.documentElement;
  const atBottom = window.scrollY > 0 && window.scrollY + root.clientHeight >= root.scrollHeight - 2;
  const finalDestination = destinations.at(-1);
  if (atBottom && finalDestination?.section) current = finalDestination.link;
  destinations.forEach(({ link }) => {
    const active = link === current;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}
let updateQueued = false;
function scheduleNavigationUpdate() {
  if (updateQueued) return;
  updateQueued = true;
  requestAnimationFrame(() => {
    updateActiveNavigation();
    updateQueued = false;
  });
}
window.addEventListener("scroll", scheduleNavigationUpdate, { passive: true });
window.addEventListener("resize", scheduleNavigationUpdate);
window.addEventListener("hashchange", scheduleNavigationUpdate);
updateActiveNavigation();
