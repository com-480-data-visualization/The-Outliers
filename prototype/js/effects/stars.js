/**
 * effects/stars.js — Twinkling star-field background animations.
 *
 * Two canvas-based star fields:
 *  - drawPageStars()    draws the full-page fixed background star field.
 *  - drawHeroParticles() draws a denser inner star field inside the hero.
 *
 * Both share the same code structure: a deterministic-ish set of small
 * dots with a slow horizontal drift and a sinusoidal twinkle. Cheap to
 * run because every star is just a single arc per frame and there are
 * only 300 of them per layer.
 */

function drawHeroParticles() {
  var container = document.getElementById("hero-canvas");
  if (!container) return;

  var cvs = document.createElement("canvas");
  cvs.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  container.appendChild(cvs);

  var ctx = cvs.getContext("2d");
  var w, h, stars;

  function resize() {
    w = cvs.width = container.offsetWidth;
    h = cvs.height = container.offsetHeight;
  }

  function createStars() {
    stars = [];
    for (var i = 0; i < 300; i++) {
      stars.push({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.4 + 0.2,
        opacity: Math.random() * 0.6 + 0.15,
        drift: Math.random() * 0.12 + 0.01,
        twinkleSpeed: Math.random() * 0.015 + 0.003,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  function draw(time) {
    ctx.clearRect(0, 0, w, h);
    for (var j = 0; j < stars.length; j++) {
      var s = stars[j];
      s.x += s.drift;
      if (s.x > w) s.x = 0;
      var twinkle = Math.sin(time * s.twinkleSpeed + s.twinklePhase) * 0.25 + 0.75;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(200, 215, 240, " + (s.opacity * twinkle) + ")";
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  resize();
  createStars();
  requestAnimationFrame(draw);
  window.addEventListener("resize", function() { resize(); createStars(); });
}

function drawPageStars() {
  var canvas = document.getElementById("page-stars");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  var w, h, stars;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function createStars() {
    stars = [];
    for (var i = 0; i < 300; i++) {
      stars.push({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.4 + 0.2,
        opacity: Math.random() * 0.6 + 0.15,
        drift: Math.random() * 0.12 + 0.01,
        twinkleSpeed: Math.random() * 0.015 + 0.003,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  function draw(time) {
    ctx.clearRect(0, 0, w, h);
    for (var j = 0; j < stars.length; j++) {
      var s = stars[j];
      s.x += s.drift;
      if (s.x > w) s.x = 0;
      var twinkle = Math.sin(time * s.twinkleSpeed + s.twinklePhase) * 0.25 + 0.75;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(200, 215, 240, " + (s.opacity * twinkle) + ")";
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  resize();
  createStars();
  requestAnimationFrame(draw);
  window.addEventListener("resize", function() { resize(); createStars(); });
}
