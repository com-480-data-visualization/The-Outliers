/**
 * nav.js — Chapter navigator: glowing burger + flyout menu.
 *
 * Three responsibilities:
 *   1. Open/close the flyout when the burger is clicked, the scrim is
 *      clicked, Escape is pressed, or a chapter link is followed.
 *   2. Smooth-scroll to the clicked chapter via Lenis if it's available;
 *      fall back to native window.scrollTo otherwise.
 *   3. Highlight the chapter currently in view via an IntersectionObserver
 *      over the section IDs the menu references.
 *
 * The burger is hidden during the cinematic intro (CSS keys off
 * #hero.is-intro-active being a previous sibling). This script never
 * touches that — it just behaves correctly whenever the controls become
 * visible.
 */

(function initNav() {
  const toggle = document.getElementById("nav-toggle");
  const menu   = document.getElementById("nav-menu");
  const scrim  = document.getElementById("nav-scrim");
  const links  = Array.from(document.querySelectorAll(".nav-link"));
  if (!toggle || !menu || !scrim || !links.length) return;

  let isOpen = false;

  function open() {
    if (isOpen) return;
    isOpen = true;
    toggle.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    scrim.classList.add("is-open");
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    toggle.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    scrim.classList.remove("is-open");
  }

  toggle.addEventListener("click", () => {
    if (isOpen) close();
    else open();
  });

  scrim.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) close();
  });

  // Smooth-scroll on link click via Lenis, otherwise native behaviour.
  // We preventDefault so the native anchor jump (and any URL fragment
  // mutation that affects router state) doesn't steal the smoothness.
  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("data-target");
      const target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      close();
      // Tiny delay so the menu's close animation can start before the
      // scroll begins — feels more orchestrated than a hard cut.
      setTimeout(() => {
        if (window.lenis && typeof window.lenis.scrollTo === "function") {
          window.lenis.scrollTo(target, { duration: 1.1, offset: -10 });
        } else {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 120);
    });
  });

  // Highlight the chapter currently in view. We observe each chapter
  // section the menu points to and set .is-active on the corresponding
  // link as it crosses the middle of the viewport.
  const targets = links
    .map((l) => ({ link: l, el: document.getElementById(l.dataset.target) }))
    .filter((t) => t.el);

  const visibility = new Map();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        visibility.set(entry.target, entry.intersectionRatio);
      });
      // Pick the section with the highest current visibility. Ties resolve
      // to the earlier one in document order, which matches how the user
      // reads the page.
      let bestEl = null;
      let bestRatio = 0;
      targets.forEach(({ el }) => {
        const r = visibility.get(el) || 0;
        if (r > bestRatio) {
          bestRatio = r;
          bestEl = el;
        }
      });
      links.forEach((l) => l.classList.remove("is-active"));
      if (bestEl) {
        const match = links.find((l) => l.dataset.target === bestEl.id);
        if (match) match.classList.add("is-active");
      }
    },
    {
      // Observe the central band of the viewport: 20% from top, 20% from
      // bottom. A section is "current" when this band overlaps it.
      rootMargin: "-20% 0px -20% 0px",
      threshold: [0, 0.25, 0.5, 0.75, 1],
    },
  );
  targets.forEach(({ el }) => observer.observe(el));
})();
