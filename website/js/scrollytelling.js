/**
 * scrollytelling.js - Scroll-driven stacking cards.
 * The entire .scrolly grid is sticky. The parent .viz-container is tall (300vh via CSS).
 * As the user scrolls through that height, cards reveal one by one and stay.
 * No DOM injection, no spacers.
 */

function initScrollytelling() {
  const container = document.querySelector('#chapter-timeline .viz-container');
  const steps = document.querySelectorAll('.step');
  if (!container || !steps.length) return;

  let currentStep = -1;

  function onScroll() {
    const rect = container.getBoundingClientRect();
    const scrolled = -rect.top;
    const scrollable = rect.height - window.innerHeight;
    if (scrollable <= 0) return;

    const progress = Math.max(0, Math.min(1, scrolled / scrollable));
    const activeIdx = Math.min(steps.length - 1, Math.floor(progress * steps.length));

    if (activeIdx === currentStep) return;
    currentStep = activeIdx;

    steps.forEach((step, i) => {
      step.classList.remove('is-active', 'is-passed');
      if (i < activeIdx) step.classList.add('is-passed');
      else if (i === activeIdx) step.classList.add('is-active');
    });

    const stepNum = +(steps[activeIdx].dataset.step);
    window.dispatchEvent(
      new CustomEvent('scrolly-step', { detail: { step: stepNum } })
    );
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
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
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = eased * target;
    el.textContent = isDecimal
      ? current.toFixed(1)
      : Math.floor(current).toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

window.initScrollytelling = initScrollytelling;
window.initStatCounters = initStatCounters;
