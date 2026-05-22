/**
 * cinematic-hero.js — Wheel-driven cinematic intro (no scroll consumption).
 *
 * The hero is exactly 100vh. While the intro plays, the page scroll is
 * locked (body.intro-lock, lenis.stop()) and the hero is a fixed overlay
 * (.is-intro-active). The controller listens to wheel + touch + keyboard
 * input directly, accumulates "intent" into a phase index, and advances
 * the visuals via [data-phase] without ever moving the page.
 *
 * Phases:
 *   pre1   — first poster line
 *   pre2   — second poster line
 *   pre3   — third poster line
 *   reveal — vignette dissolves outward (still no globe)
 *   final  — title slides in; 1.6s later the globe fades in
 *
 * Once `final` has fully played, .is-locked is added, scroll is released,
 * and the hero becomes a normal 100vh section. Scroll position is unchanged
 * by the transition (because the hero was always 100vh), so there's no
 * jump and no "5 pages in one shot."
 *
 * Reverse input during the intro DOES advance the timeline by exactly 0
 * — i.e. it's ignored. We deliberately don't replay phases on reverse;
 * the user already saw them.
 */

(function initCinematicHero() {
  const hero = document.getElementById("hero");
  if (!hero) return;

  const PHASES = ["pre1", "pre2", "pre3", "reveal", "final"];

  const reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    hero.setAttribute("data-phase", "final");
    hero.classList.add("is-locked", "show-globe");
    return;
  }

  // Lock the page scroll for the duration of the intro. Both Lenis and the
  // native body need to be frozen — Lenis ignores body.overflow on its own.
  hero.classList.add("is-intro-active");
  document.documentElement.classList.add("intro-lock");
  document.body.classList.add("intro-lock");
  let lenisWasRunning = false;
  if (window.lenis && typeof window.lenis.stop === "function") {
    window.lenis.stop();
    lenisWasRunning = true;
  }

  let phaseIdx = 0;
  let accumulator = 0;      // signed wheel intent since last phase change
  let finalEnteredAt = 0;   // performance.now() when phase became `final`
  let locked = false;
  const ADVANCE_THRESHOLD = 220; // deltaY units needed to move to next phase
  const TITLE_DURATION_MS = 1600;
  const TOTAL_FINALE_MS = 3000;

  function setPhase(idx) {
    if (locked || idx === phaseIdx) return;
    if (idx < phaseIdx) return; // no replay on reverse — intro is one-shot
    phaseIdx = Math.min(idx, PHASES.length - 1);
    hero.setAttribute("data-phase", PHASES[phaseIdx]);
    accumulator = 0;
    syncActs();
    if (PHASES[phaseIdx] === "final") {
      finalEnteredAt = performance.now();
      setTimeout(() => {
        if (!locked) hero.classList.add("show-globe");
      }, TITLE_DURATION_MS);
      setTimeout(release, TOTAL_FINALE_MS);
    }
  }

  function release() {
    if (locked) return;
    locked = true;
    hero.classList.add("is-locked");
    hero.classList.remove("is-intro-active");
    document.documentElement.classList.remove("intro-lock");
    document.body.classList.remove("intro-lock");
    if (lenisWasRunning && window.lenis && typeof window.lenis.start === "function") {
      window.lenis.start();
      if (typeof window.lenis.resize === "function") window.lenis.resize();
    }
    detachListeners();
  }

  function tryAdvance(delta) {
    if (locked) return;
    // Only forward intent counts. Backward scrolling during the intro is a
    // no-op (user already saw earlier phases).
    if (delta <= 0) return;
    accumulator += delta;
    if (accumulator >= ADVANCE_THRESHOLD) {
      setPhase(phaseIdx + 1);
    }
  }

  function onWheel(e) {
    if (locked) return;
    // Don't preventDefault on every wheel — that fires the passive-listener
    // warning. Instead, the body overflow lock keeps the page from moving.
    tryAdvance(e.deltaY);
  }

  let touchY = null;
  function onTouchStart(e) {
    if (locked || !e.touches.length) return;
    touchY = e.touches[0].clientY;
  }
  function onTouchMove(e) {
    if (locked || touchY == null || !e.touches.length) return;
    const y = e.touches[0].clientY;
    const delta = touchY - y; // swipe up = positive (advance)
    touchY = y;
    tryAdvance(delta * 2.2);   // touch deltas are smaller than wheel deltas
  }
  function onTouchEnd() { touchY = null; }

  function onKey(e) {
    if (locked) return;
    const advancers = ["ArrowDown", "PageDown", " ", "Spacebar", "ArrowRight"];
    if (advancers.includes(e.key)) {
      e.preventDefault();
      setPhase(phaseIdx + 1);
    }
    if (e.key === "Escape" || e.key === "End") {
      // Esc / End fast-forwards through the rest of the intro.
      e.preventDefault();
      setPhase(PHASES.length - 1);
    }
  }

  function attachListeners() {
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKey);
  }
  function detachListeners() {
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("keydown", onKey);
  }

  // Act crossfades are driven by the same phase index. We use a small
  // helper rather than a MutationObserver this time — simpler and we
  // already have full control of phase changes.
  const acts = Array.from(hero.querySelectorAll(".hero-act"));
  function syncActs() {
    acts.forEach((el, i) => {
      el.classList.remove("is-active", "is-past");
      if (phaseIdx >= 3) return;
      if (i < phaseIdx) el.classList.add("is-past");
      else if (i === phaseIdx) el.classList.add("is-active");
    });
  }

  hero.setAttribute("data-phase", "pre1");
  syncActs();
  attachListeners();
})();
