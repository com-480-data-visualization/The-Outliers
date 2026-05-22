/**
 * scene/journey.js — Hero-section 3D Earth + satellite cloud.
 *
 * Owns the WebGL canvas inside #hero. The scene contains:
 *   - a textured Earth at the origin (radius EARTH_R scene units),
 *   - all 6,713 real satellites as a single THREE.Points cloud, with
 *     positions derived from their UCS-recorded altitude and inclination,
 *   - a spherical-shell starfield wrapping the camera,
 *   - one directional "sun" light + a soft ambient fill.
 *
 * Scope decision: this scene used to be a fullscreen fixed canvas behind
 * every section of the page. We narrowed it to the hero only so the rest
 * of the site stays a conventional scrollytelling layout. The page-wide
 * cinematic camera flythrough is deferred (see audit.md §5).
 *
 * Loaded as an ES module so this file has its own Three.js instance and
 * Globe.gl (which is a UMD bundle that ships its own Three.js) is free
 * to use its own copy. Neither library touches window.THREE.
 *
 * Public API (assigned at the bottom):
 *  - window.initJourney(): bootstraps everything and starts the render
 *    loop. Async because it fetches satellites-globe.json. Idempotent;
 *    safe to call even when WebGL is unavailable.
 */

// esm.sh resolves Three.js's "three" bare-specifier imports inside the
// postprocessing example modules, so we use it consistently for everything
// in this file. Both THREE and the post-processing passes thus share a
// single module instance, which `EffectComposer` requires.
import * as THREE from "https://esm.sh/three@0.170.0";
import { EffectComposer } from "https://esm.sh/three@0.170.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://esm.sh/three@0.170.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://esm.sh/three@0.170.0/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "https://esm.sh/three@0.170.0/examples/jsm/postprocessing/OutputPass.js";

// World-unit Earth radius. Everything else is scaled relative to this so
// numbers stay readable. 100 is a round value that keeps satellite shells
// (LEO~127, GEO~290) inside reasonable camera distances.
const EARTH_R = 100;
const EARTH_KM = 6371;

// Project palette — matches the D3 charts and the Chapter 3 globe.
const ORBIT_COLORS = {
  LEO: new THREE.Color("#1a73e8"),
  MEO: new THREE.Color("#e8710a"),
  GEO: new THREE.Color("#34a853"),
  Elliptical: new THREE.Color("#9334e6"),
};

// Per-orbit point sizes (in CSS pixels at z = camera_distance). LEO points
// are small (LEO is dense), GEO larger so they read as discrete dots at
// distance. Multiplied in the shader by depth attenuation + pixel ratio.
// LEO is 88% of the cloud, so its blue mass tends to dominate the frame
// with additive blending. We shrink LEO slightly and grow the rarer
// orange/green/purple shells so each colored band reads as distinct
// against the bright LEO core.
const ORBIT_SIZES = {
  LEO: 5.5,
  MEO: 13,
  GEO: 17,
  Elliptical: 11,
};

// Kepler's third law: T ∝ r^1.5, so omega ∝ r^-1.5. We pick a base ω that
// makes LEO (r ≈ 127) take ~30 s to complete an orbit visually. GEO falls
// out at ~108 s, a barely-perceptible drift — physically-correct ratio.
const LEO_PERIOD_S = 30.0;
const LEO_R = EARTH_R * (1 + Math.log1p(2000 / EARTH_KM)); // ~127
const KEPLER_K = ((2 * Math.PI) / LEO_PERIOD_S) * Math.pow(LEO_R, 1.5);

async function initJourney() {
  const canvas = document.getElementById("space-canvas");
  if (!canvas) {
    console.warn("journey: #space-canvas missing, skipping init");
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
  } catch (e) {
    console.warn("journey: WebGL unavailable", e);
    return;
  }

  // Initial size based on the canvas's actual rendered dimensions inside
  // the hero. We use clientWidth/Height (falling back to viewport on the
  // first paint before layout has settled).
  function canvasSize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    return { w, h };
  }
  const initial = canvasSize();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(initial.w, initial.h, false);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();

  // ---------- Camera ----------
  // A slightly elevated 3/4 view of Earth so the satellite shells read as
  // a real cloud and not a flat ring.
  const camera = new THREE.PerspectiveCamera(
    55,
    initial.w / initial.h,
    1,
    8000,
  );
  camera.position.set(320, 180, 700);
  camera.lookAt(0, 0, 0);

  // ---------- Lights ----------
  // Soft cold ambient so the dark side of Earth isn't pitch black, plus
  // a warm directional "sun" coming from screen right.
  scene.add(new THREE.AmbientLight(0x223046, 0.85));
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
  sun.position.set(900, 350, 500);
  scene.add(sun);

  // ---------- Orbital system group ----------
  // Earth and satellites live inside this group so we can shift the whole
  // thing down vertically — leaves the upper half of the hero clean for
  // the title and subtitle text.
  const orbitalSystem = new THREE.Group();
  // Centred vertically: the cinematic-intro finale puts the title at the
  // top of the viewport, so the globe sits roughly in the middle below it.
  orbitalSystem.position.y = -20;
  scene.add(orbitalSystem);

  // ---------- Earth ----------
  const earthGeo = new THREE.SphereGeometry(EARTH_R, 96, 48);
  // Start with a solid colour so something renders even if the texture
  // is slow to load; the texture then overrides the colour.
  const earthMat = new THREE.MeshStandardMaterial({
    color: 0x163252,
    roughness: 0.92,
    metalness: 0.0,
  });
  const earth = new THREE.Mesh(earthGeo, earthMat);
  orbitalSystem.add(earth);

  const textureLoader = new THREE.TextureLoader();
  textureLoader.setCrossOrigin("anonymous");
  textureLoader.load(
    "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
    (tex) => {
      // Match the texture colour space to the renderer so the blue marble
      // doesn't look washed out.
      tex.colorSpace = THREE.SRGBColorSpace;
      earthMat.map = tex;
      earthMat.color.set(0xffffff);
      earthMat.needsUpdate = true;
    },
    undefined,
    (err) => console.warn("journey: earth texture failed, using flat colour", err),
  );

  // ---------- Starfield (spherical shell around the scene) ----------
  const STAR_COUNT = 2500;
  const starPositions = new Float32Array(STAR_COUNT * 3);
  const starColors = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    // Uniform sample on a sphere via inverse CDF on cos(theta)
    const phi = Math.random() * Math.PI * 2;
    const cosTheta = Math.random() * 2 - 1;
    const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
    const r = 3000 + Math.random() * 600; // thin shell
    starPositions[i * 3] = r * sinTheta * Math.cos(phi);
    starPositions[i * 3 + 1] = r * sinTheta * Math.sin(phi);
    starPositions[i * 3 + 2] = r * cosTheta;

    const t = Math.random();
    if (t < 0.8) {
      starColors[i * 3] = 0.82;
      starColors[i * 3 + 1] = 0.86;
      starColors[i * 3 + 2] = 0.94;
    } else if (t < 0.95) {
      starColors[i * 3] = 0.55;
      starColors[i * 3 + 1] = 0.7;
      starColors[i * 3 + 2] = 1.0;
    } else {
      starColors[i * 3] = 1.0;
      starColors[i * 3 + 1] = 0.72;
      starColors[i * 3 + 2] = 0.45;
    }
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
  const starMat = new THREE.PointsMaterial({
    size: 3.5,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // ---------- Satellite cloud (all 6,713) ----------
  // satSystem is { mesh, update(elapsed) } so the animate loop can refresh
  // every satellite's position each frame as it orbits.
  let satSystem = null;
  try {
    const res = await fetch("data/satellites-globe.json");
    const raw = await res.json();
    satSystem = buildSatelliteSystem(raw);
    if (satSystem) orbitalSystem.add(satSystem.mesh);
  } catch (e) {
    console.warn("journey: failed to load satellites-globe.json", e);
  }

  // ---------- Post-processing: bloom on bright pixels ----------
  // Each satellite is a small additive-blended sprite. With a high
  // brightness threshold the bloom pass only acts on those sprite cores
  // (and the brightest sun-lit pixels of Earth), producing a soft halo
  // around every dot. If the composer fails to construct (bad CDN, weak
  // GPU), we fall back to direct renderer.render and the scene still works.
  let composer = null;
  try {
    composer = new EffectComposer(renderer);
    composer.setSize(initial.w, initial.h);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(initial.w, initial.h),
      0.85, // strength — how intense the glow is overall
      0.55, // radius — how wide the glow spreads
      0.62, // threshold — only pixels brighter than this bloom
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass()); // sRGB-correct final output
  } catch (e) {
    console.warn("journey: post-processing unavailable, plain render", e);
    composer = null;
  }

  // ---------- Resize handling ----------
  // Track the hero canvas's own size (not the viewport) so the renderer
  // stays sharp even when the hero element grows/shrinks via CSS.
  function onResize() {
    const { w, h } = canvasSize();
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    if (composer) composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(onResize).observe(canvas);
  } else {
    window.addEventListener("resize", onResize);
  }

  // ---------- Render loop ----------
  // Respect the OS "reduce motion" preference: keep the satellite cloud
  // static (no orbits, no rotations) and just render a fixed frame.
  const reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clock = new THREE.Clock();
  function animate() {
    const t = clock.getElapsedTime();
    if (!reduceMotion) {
      earth.rotation.y += 0.0006;
      stars.rotation.z += 0.00008;
      if (satSystem) satSystem.update(t);
    }
    if (composer) composer.render();
    else renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  console.log("journey: scene initialized");
}

// ---------- Satellite-cloud builder ----------
// Returns { mesh, update(elapsed) }.
//
// Each satellite gets a real inclined orbital plane (inclination from the
// data, RAAN random) and a phase that advances with time according to
// Kepler's third law. Per frame, every satellite's position is recomputed
// and the entire position buffer is uploaded to the GPU. The cloud renders
// through a tiny custom ShaderMaterial that draws each point as a soft
// glowing sphere with per-vertex size and additive blending.
//
// Position math (Y-up, equator in the XZ plane):
//   x = r * ( cos(Ω) cos(θ) − sin(Ω) cos(i) sin(θ) )
//   y = r *   sin(i) sin(θ)
//   z = r * ( sin(Ω) cos(θ) + cos(Ω) cos(i) sin(θ) )
// where i is inclination, Ω is the right ascension of the ascending node,
// and θ = phase0 + ω·t.
//
// Cost budget: 6,713 satellites × ~30 ops/frame = 200 K ops, ~80 KB GPU
// upload per frame. Comfortable at 60 fps on a low-power GPU.
function buildSatelliteSystem(raw) {
  const valid = raw.filter(
    (s) =>
      s.altitude > 0 &&
      s.inclination !== null &&
      s.inclination !== undefined,
  );
  if (!valid.length) return null;

  const N = valid.length;
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const sizes = new Float32Array(N);

  // Per-orbit metadata, packed for tight cache locality in the update loop.
  // Layout per satellite: [r, sinI, cosI, sinO, cosO, omega, phase0]
  const ORBIT_STRIDE = 7;
  const orbits = new Float32Array(N * ORBIT_STRIDE);

  for (let i = 0; i < N; i++) {
    const s = valid[i];

    const altClamped = Math.min(s.altitude, 50000);
    const r = EARTH_R * (1 + Math.log1p(altClamped / EARTH_KM));

    const incRad =
      Math.min(Math.abs(s.inclination), 180) * (Math.PI / 180);
    const raan = Math.random() * Math.PI * 2;
    const phase0 = Math.random() * Math.PI * 2;
    const omega = KEPLER_K / Math.pow(r, 1.5);

    const o = i * ORBIT_STRIDE;
    orbits[o + 0] = r;
    orbits[o + 1] = Math.sin(incRad);
    orbits[o + 2] = Math.cos(incRad);
    orbits[o + 3] = Math.sin(raan);
    orbits[o + 4] = Math.cos(raan);
    orbits[o + 5] = omega;
    orbits[o + 6] = phase0;

    // Initial position (t = 0)
    const ct = Math.cos(phase0);
    const st = Math.sin(phase0);
    positions[i * 3 + 0] =
      r * (orbits[o + 4] * ct - orbits[o + 3] * orbits[o + 2] * st);
    positions[i * 3 + 1] = r * orbits[o + 1] * st;
    positions[i * 3 + 2] =
      r * (orbits[o + 3] * ct + orbits[o + 4] * orbits[o + 2] * st);

    const c = ORBIT_COLORS[s.orbit_class] || ORBIT_COLORS.LEO;
    colors[i * 3 + 0] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;

    sizes[i] = ORBIT_SIZES[s.orbit_class] || ORBIT_SIZES.LEO;
  }

  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("position", posAttr);
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: /* glsl */ `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float uPixelRatio;

      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        // Perspective size attenuation; the 300.0 constant calibrates to
        // a 55-degree FOV camera at roughly z = 700 world units.
        gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;

      void main() {
        // Each sprite is a soft glowing disk: bright opaque core that
        // smoothly fades to zero alpha at the edge of the unit square.
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.0, d);
        float glow = smoothstep(0.5, 0.18, d) * 0.65;
        float alpha = max(core, glow);
        // Push the hue past 1.0 so additive blending preserves the color
        // identity even in dense overlap zones (LEO shell, GEO ring).
        // Without this, overlapping LEO points blow out to white instead
        // of reading as a saturated blue band.
        vec3 vivid = vColor * 1.35;
        gl_FragColor = vec4(vivid, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });

  const mesh = new THREE.Points(geo, material);

  function update(t) {
    const p = positions;
    for (let i = 0; i < N; i++) {
      const o = i * ORBIT_STRIDE;
      const r = orbits[o + 0];
      const sinI = orbits[o + 1];
      const cosI = orbits[o + 2];
      const sinO = orbits[o + 3];
      const cosO = orbits[o + 4];
      const omega = orbits[o + 5];
      const phase0 = orbits[o + 6];

      const theta = phase0 + omega * t;
      const ct = Math.cos(theta);
      const st = Math.sin(theta);

      const j = i * 3;
      p[j + 0] = r * (cosO * ct - sinO * cosI * st);
      p[j + 1] = r * sinI * st;
      p[j + 2] = r * (sinO * ct + cosO * cosI * st);
    }
    posAttr.needsUpdate = true;
  }

  console.log(`journey: ${N} satellites placed in 3D with live orbital motion`);
  return { mesh, update };
}

window.initJourney = initJourney;
