/**
 * Hero section enhancements: star field canvas + counter animation.
 */

function initHero() {
    initStarField();
    initCounter();
}

// --- Star field background ---
function initStarField() {
    const canvas = document.getElementById("star-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let width, height, stars;

    function resize() {
        width = canvas.width = canvas.offsetWidth;
        height = canvas.height = canvas.offsetHeight;
    }

    function createStars(count) {
        stars = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r: Math.random() * 1.2 + 0.3,
                opacity: Math.random() * 0.6 + 0.2,
                drift: Math.random() * 0.15 + 0.02,
                twinkleSpeed: Math.random() * 0.02 + 0.005,
                twinklePhase: Math.random() * Math.PI * 2
            });
        }
    }

    function draw(time) {
        ctx.clearRect(0, 0, width, height);

        for (const s of stars) {
            // Slow drift
            s.x += s.drift;
            if (s.x > width) s.x = 0;

            // Twinkle
            const twinkle = Math.sin(time * s.twinkleSpeed + s.twinklePhase) * 0.2 + 0.8;
            const alpha = s.opacity * twinkle;

            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200, 210, 230, ${alpha})`;
            ctx.fill();
        }

        requestAnimationFrame(draw);
    }

    resize();
    createStars(250);
    requestAnimationFrame(draw);

    window.addEventListener("resize", () => {
        resize();
        createStars(250);
    });
}

// --- Counter animation ---
function initCounter() {
    const el = document.getElementById("hero-count");
    if (!el) return;

    const target = 6718;
    const duration = 2200;

    // Wait until hero is visible
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            animateCount();
            observer.disconnect();
        }
    }, { threshold: 0.5 });

    observer.observe(el);

    function animateCount() {
        const start = performance.now();

        function tick(now) {
            const elapsed = now - start;
            const t = Math.min(elapsed / duration, 1);
            // Cubic ease out
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(eased * target).toLocaleString();

            if (t < 1) {
                requestAnimationFrame(tick);
            }
        }

        el.textContent = "0";
        requestAnimationFrame(tick);
    }
}
