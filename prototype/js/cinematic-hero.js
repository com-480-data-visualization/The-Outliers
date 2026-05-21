/**
 * cinematic-hero.js — Drives the four-act cinematic intro.
 *
 * The hero section is a tall scroll stage (~400vh in CSS). Inside it,
 * .hero-stage is a viewport-sized sticky frame that holds the 3D scene,
 * three poster "acts" of text, and the finale title block.
 *
 * As the user scrolls through the stage, we compute a 0..1 progress value
 * and:
 *   - write it back as the CSS custom property --hero-progress on the
 *     #hero element so the tracer fill width can read directly off it;
 *   - decide which act is current and apply .is-active / .is-past classes
 *     to drive the per-act crossfade + the finale ignition.
 *
 * The whole controller is a single rAF-coalesced scroll listener: cheap,
 * never reads layout in the same frame it writes, and short-circuits
 * once the hero is offscreen.
 */

(function initCinematicHero() {
  const hero = document.getElementById("hero");
  if (!hero) return;

  const acts = Array.from(hero.querySelectorAll(".hero-act"));
  const finale = hero.querySelector(".hero-finale");
  if (!acts.length || !finale) return;

  // Honor reduced motion: skip straight to the finale, no scroll wiring.
  // CSS already hides the acts + tracer under prefers-reduced-motion, so all
  // we need to do here is light up the finale immediately.
  const reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    finale.classList.add("is-active");
    return;
  }

  // Split the stage into N equal phases. With 3 word acts + 1 finale we get
  // 4 phases of 25 % each. Empirically that gives every act ~one viewport of
  // scroll to read at a comfortable pace.
  const PHASES = acts.length + 1;
  let activeIdx = -2; // sentinel — never matches a real index
  let pending = false;

  function applyState() {
    pending = false;

    const rect = hero.getBoundingClientRect();
    const viewportH = window.innerHeight || 800;
    const scrollable = rect.height - viewportH;
    if (scrollable <= 0) return;

    // Scroll distance into the hero, clamped to [0, 1].
    const raw = -rect.top / scrollable;
    const progress = raw < 0 ? 0 : raw > 1 ? 1 : raw;

    // Drive the tracer fill via a single CSS variable on the hero. Cheap:
    // no per-element styles, the browser interpolates from the CSS var.
    hero.style.setProperty("--hero-progress", progress.toFixed(4));

    // Once the hero is fully out of view above, freeze and bail. Avoids
    // doing any further work for the rest of the page's scroll life.
    if (rect.bottom < -10) {
      if (activeIdx !== PHASES - 1) {
        setActive(PHASES - 1);
      }
      return;
    }

    // Which phase are we in? floor(progress * PHASES) but clamped so the
    // very last sliver of scroll (progress === 1) still lands on the finale
    // rather than overshooting.
    const idx = Math.min(PHASES - 1, Math.floor(progress * PHASES));
    if (idx !== activeIdx) setActive(idx);
  }

  function setActive(idx) {
    activeIdx = idx;
    // Word acts: indices 0..acts.length-1. Finale: last index.
    acts.forEach((el, i) => {
      el.classList.remove("is-active", "is-past");
      if (i < idx) el.classList.add("is-past");
      else if (i === idx) el.classList.add("is-active");
    });
    const finaleIdx = PHASES - 1;
    finale.classList.toggle("is-active", idx >= finaleIdx);
  }

  function onScroll() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(applyState);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  // Paint once on load so the first act is visible without the user needing
  // to wiggle the scroll wheel.
  applyState();
})();
