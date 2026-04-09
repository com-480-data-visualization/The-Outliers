/**
 * Scroll-triggered entrance animations using IntersectionObserver.
 */

function initAnimations() {
    const sections = document.querySelectorAll(".content-section");

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("in-view");
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    });

    sections.forEach(section => {
        observer.observe(section);
    });
}
