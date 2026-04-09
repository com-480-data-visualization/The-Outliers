/**
 * scrollytelling.js — Scroll-driven step activation for the narrative sections.
 * Uses IntersectionObserver (no external library) as taught in Lecture 5 (Interaction).
 */

function initScrollytelling() {
  const steps = document.querySelectorAll('.step');
  if (!steps.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Deactivate all steps, activate current
          steps.forEach((s) => s.classList.remove('is-active'));
          entry.target.classList.add('is-active');

          // Dispatch custom event so charts can react
          const stepIndex = +entry.target.dataset.step;
          window.dispatchEvent(
            new CustomEvent('scrolly-step', { detail: { step: stepIndex } })
          );
        }
      });
    },
    {
      rootMargin: '-30% 0px -30% 0px', // trigger when step is near center
      threshold: 0.5,
    }
  );

  steps.forEach((step) => observer.observe(step));
}

/**
 * Animate stat counters on scroll into view.
 */
function initStatCounters() {
  const stats = document.querySelectorAll('.stat-number');
  if (!stats.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  stats.forEach((el) => observer.observe(el));
}

function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  const isDecimal = target % 1 !== 0;
  const duration = 2000;
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = eased * target;
    el.textContent = isDecimal
      ? current.toFixed(1)
      : Math.floor(current).toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// Export for main.js
window.initScrollytelling = initScrollytelling;
window.initStatCounters = initStatCounters;
