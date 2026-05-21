/**
 * effects/orbits.js — Hero title "satellite swarm" sphere animation.
 *
 * A Fibonacci-distributed cloud of 960 points orbits around the y-axis
 * just below the hero title. Each point spins at its own slightly-random
 * angular speed (alternating sign), so the cloud appears alive without
 * any global rotation. The 2D projection is a soft pseudo-3D: front-of-
 * sphere points get larger (depth dimming via the sin-of-angle term).
 *
 * Scrolling speeds up the rotation briefly and translates both the hero
 * content and the sphere centre by small parallax amounts, so the hero
 * lingers as the user starts to scroll.
 */

function drawTitleOrbits() {
  var canvas = document.getElementById("orbit-canvas");
  if (!canvas) return;

  (function() {
  var ctx = canvas.getContext("2d");
  var heroEl = document.getElementById("hero");
  var cw = heroEl ? heroEl.offsetWidth : 1200;
  var ch = heroEl ? heroEl.offsetHeight : 600;
  canvas.width = cw;
  canvas.height = ch;

  // Sphere center: below title
  var titleEl = document.querySelector(".hero-title");
  var titleRect = titleEl ? titleEl.getBoundingClientRect() : { left: cw * 0.3, right: cw * 0.7, bottom: ch * 0.4, width: cw * 0.4, height: 100 };
  var heroRect = heroEl.getBoundingClientRect();
  var sx = titleRect.left - heroRect.left + titleRect.width / 2;
  var sy = titleRect.bottom - heroRect.top + 100;
  var R = titleRect.height * 0.55;

  var NUM_POINTS = 960;

  // Seeded pseudo-random for deterministic results
  var seed = 12345;
  function seededRandom() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  // Fibonacci sphere: uniform point distribution with no overlapping
  var points = [];
  var goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < NUM_POINTS; i++) {
    var y = 1 - (i / (NUM_POINTS - 1)) * 2; // -1 to 1
    var radiusAtY = Math.sqrt(1 - y * y);
    var theta = goldenAngle * i;

    points.push({
      lat: Math.asin(y),
      lon: theta,
      ringR: radiusAtY * R,
      yOff: y * R,
      speed: (i % 2 === 0 ? 1 : -1) * (0.002 + seededRandom() * 0.002),
      angle: theta,
      size: 0.6 + seededRandom() * 0.9,
      color: seededRandom() < 0.2 ? "#e8710a" : "#1a73e8"
    });
  }

  var globalRot = 0;
  var speedMultiplier = 1;
  var scrollTimeout;

  // Hero parallax: sphere drifts down as the user scrolls. The old version
  // also translated .hero-content, but the cinematic intro owns its own
  // layout now, so we only adjust the sphere centre.
  //
  // The listener is rAF-coalesced (one read/write per frame max) and bails
  // out once the hero is offscreen — there's nothing to parallax once the
  // user is in the chapters below.
  var sphereBaseY = sy;
  var pending = false;
  var lastScrollY = 0;

  function onScrollFrame() {
    pending = false;
    var heroRect = heroEl ? heroEl.getBoundingClientRect() : null;
    if (heroRect && heroRect.bottom < -10) return; // hero gone — stop work
    sy = sphereBaseY + lastScrollY * 0.25;
  }

  window.addEventListener("scroll", function() {
    speedMultiplier = 4;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(function() { speedMultiplier = 1; }, 150);

    lastScrollY = window.scrollY;
    if (!pending) {
      pending = true;
      requestAnimationFrame(onScrollFrame);
    }
  }, { passive: true });

  function animate() {
    ctx.clearRect(0, 0, cw, ch);
    globalRot += 0.003;

    // Smoothly decay back to normal speed
    speedMultiplier += (1 - speedMultiplier) * 0.05;

    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      p.angle += p.speed * speedMultiplier;

      var dx = Math.cos(p.angle) * p.ringR;
      var dz = Math.sin(p.angle) * p.ringR * 0.35;

      var x = sx + dx;
      var y = sy + p.yOff + dz;

      // Depth based on front/back
      var zPos = Math.sin(p.angle);
      var dim = 0.55 + (zPos + 1) * 0.225;

      // Glow
      ctx.beginPath();
      ctx.arc(x, y, p.size * 3.5, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.round(dim * 25).toString(16).padStart(2, "0");
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(x, y, p.size * dim, 0, Math.PI * 2);
      ctx.globalAlpha = dim;
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(animate);
  }

  animate();
  })();
}
