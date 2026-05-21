/**
 * scroll.js — Page-wide smooth scroll (Lenis) + chapter entrance fades.
 *
 * Loaded as an ES module so we can import Lenis directly from the CDN.
 * Two independent systems live here:
 *
 *   1. Fade-in observer (always runs, no external deps): a one-shot
 *      IntersectionObserver that adds `is-visible` to any `.fade-in`
 *      element when 15% of it enters the viewport.
 *
 *   2. Lenis smooth scroll (lazy, may fail silently): imported via
 *      dynamic `import()` so a CDN hiccup does not nuke the fade-ins
 *      below. Exposed at window.lenis so other modules (e.g. the
 *      operator drawer) can pause it.
 *
 * Both opt out under prefers-reduced-motion: Lenis is never instantiated,
 * and the fade-in targets are revealed immediately.
 */

const reduceMotion =
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Fade-in observer (synchronous, no external deps) ----------
function initFadeIns() {
  const targets = document.querySelectorAll(".fade-in");
  if (!targets.length) return;
  if (reduceMotion) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
  );
  targets.forEach((el) => observer.observe(el));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFadeIns);
} else {
  initFadeIns();
}

// ---------- Lenis smooth scroll (lazy, isolated from fade-ins) ----------
// We use jsdelivr's `+esm` endpoint, which transparently converts any npm
// package to a working ES module. Wrapping in dynamic import + try/catch
// guarantees that a CDN failure cannot break the rest of the page.
(async function bootLenis() {
  if (reduceMotion) return;
  let Lenis;
  try {
    const mod = await import(
      "https://cdn.jsdelivr.net/npm/lenis@1.1.20/+esm"
    );
    Lenis = mod.default || mod.Lenis;
    if (!Lenis) throw new Error("Lenis default export missing");
  } catch (err) {
    console.warn("scroll: Lenis failed to load, native scroll continues", err);
    return;
  }
  try {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.0,
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    window.lenis = lenis;
  } catch (err) {
    console.warn("scroll: Lenis init failed", err);
  }
})();
