/**
 * globe.js — Chapter 3 interactive 3D globe (Globe.gl).
 *
 * Loads its own slim dataset (`satellites-globe.json`) and renders the
 * 6,713 operational satellites at their real altitude and (random-longitude
 * but inclination-bounded) latitude on a textured Earth.
 *
 * Two composed filters drive what is visible at any time:
 *   - orbit filter:  All | LEO | MEO | GEO | Elliptical (button row)
 *   - year filter:   show satellites with launch_year <= sliderYear (slider
 *                    + play button under the globe)
 *
 * Both filters compose, so the user can ask "show LEO satellites launched
 * by 2018" by combining a button and the slider. The play button sweeps
 * the slider from min to max at ~3 years/sec, which is the cinematic
 * launch-history replay we use for the screencast.
 *
 * Lectures: 5 (interaction, linked views), 8 (maps), 12 (storytelling).
 */

const ORBIT_COLORS = {
    LEO: '#1a73e8',
    MEO: '#e8710a',
    GEO: '#34a853',
    Elliptical: '#9334e6',
};

// Each named constellation maps to the country that operates it. We dispatch
// a `constellation-changed` CustomEvent on window with this country so the
// Chapter 2 country bar chart can light up the matching bar.
const CONSTELLATION_COUNTRY = {
    Starlink: 'USA',
    OneWeb: 'United Kingdom',
    Iridium: 'USA',
    Galileo: 'ESA',
    Other: null,
    all: null,
};

// Mirrors the build_data classification thresholds. Used purely for sizing
// points on the globe (visual feedback, not physics).
function altitudeToVisual(alt_km) {
    if (!alt_km || alt_km <= 0) return 0.02;
    return Math.log1p(Math.min(alt_km, 50000) / 6371) * 0.42;
}

function prepareSatellitePoints(data) {
    return data
        .filter(d => d.altitude > 0 && d.inclination != null)
        .map(d => {
            const inc = Math.min(Math.abs(d.inclination), 180);
            const maxLat = Math.min(inc, 90);
            return {
                lat: (Math.random() * 2 - 1) * maxLat,
                lng: Math.random() * 360 - 180,
                alt: altitudeToVisual(d.altitude),
                size: d.orbit_class === 'GEO' ? 0.22 : d.orbit_class === 'MEO' ? 0.18 : 0.07,
                color: ORBIT_COLORS[d.orbit_class] || '#c9d1d9',
                orbit_class: d.orbit_class || 'Unknown',
                name: d.name || 'Unknown',
                purpose: d.purpose || 'Unknown',
                country: d.country || 'Unknown',
                altitude_km: Math.round(d.altitude),
                // null launch_year (1 row in current data) renders as if
                // year is unknown — we keep it visible at any slider position
                // so the running counter never drops below the year's truth.
                launch_year: d.launch_year ?? null,
                constellation: d.constellation || 'Other',
            };
        });
}

async function initGlobe() {
    const container = document.getElementById('globe-container');
    if (!container) return;
    if (typeof Globe === 'undefined') {
        console.warn('Globe.gl library not loaded');
        return;
    }

    // Load slim globe data
    let rawData;
    try {
        const res = await fetch('data/satellites-globe.json');
        rawData = await res.json();
    } catch (e) {
        console.error('Failed to load globe data:', e);
        return;
    }

    const allPoints = prepareSatellitePoints(rawData);
    console.log(`Globe: prepared ${allPoints.length} points`);

    // Mount globe. If the container hasn't laid out yet (e.g. fonts still
    // loading), clientWidth can be 0 here — we use a sane fallback and
    // attach a ResizeObserver below to catch the real value once layout
    // settles. Three.js dropped alpha support on Color, so we pass an
    // opaque hex for the atmosphere; opacity is handled by the renderer.
    const initialWidth = container.clientWidth || container.offsetWidth || 800;
    const globe = Globe()
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
        .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
        .backgroundColor('rgba(0,0,0,0)')
        .showAtmosphere(true)
        .atmosphereColor('#1a73e8')
        .atmosphereAltitude(0.18)
        .width(initialWidth)
        .height(550)
        (container);

    // Add satellite points
    globe
        .pointsData(allPoints)
        .pointLat('lat')
        .pointLng('lng')
        .pointAltitude('alt')
        .pointRadius('size')
        .pointColor('color')
        .pointLabel(d =>
            `<div style="background:rgba(22,27,46,0.95);padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);font-size:13px;color:#e8eaf0;font-family:Inter,sans-serif;">
                <strong>${d.name}</strong><br>
                <span style="color:${d.color};">${d.orbit_class}</span> &middot; ${d.altitude_km.toLocaleString()} km<br>
                ${d.purpose} &middot; ${d.country}
            </div>`)
        .pointsMerge(true);

    // Controls. We honour OS-level "reduce motion" preference and start with
    // auto-rotate off in that case (the user can still drag manually).
    const prefersReducedMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    globe.controls().autoRotate = !prefersReducedMotion;
    globe.controls().autoRotateSpeed = 0.4;
    globe.controls().enableZoom = true;
    globe.controls().minDistance = 120;
    globe.controls().maxDistance = 400;
    globe.pointOfView({ lat: 25, lng: 0, altitude: 2.2 }, 0);

    // ===== Composed filter state =====
    // Three filters apply at the same time. Each defaults to "no restriction".
    const yearMin = 1974;
    const yearMax = 2023;
    let orbitFilter = 'all';
    let yearFilter = yearMax;
    let constellationFilter = 'all';

    function applyFilters() {
        const filtered = allPoints.filter(d => {
            if (orbitFilter !== 'all' && d.orbit_class !== orbitFilter) return false;
            // null launch_year stays visible at any year — see prepareSatellitePoints.
            if (d.launch_year != null && d.launch_year > yearFilter) return false;
            if (constellationFilter !== 'all' && d.constellation !== constellationFilter) return false;
            return true;
        });
        globe.pointsData(filtered);
        updateCounter(filtered.length);
        return filtered.length;
    }

    function updateCounter(count) {
        const counter = document.getElementById('time-count');
        if (counter) counter.textContent = count.toLocaleString();
        const yearEl = document.getElementById('time-year');
        if (yearEl) yearEl.textContent = String(yearFilter);
    }

    // Helper: in a toggle-group, mark exactly one button active + aria-pressed.
    function setActiveInGroup(buttons, activeBtn) {
        buttons.forEach(b => {
            const isActive = b === activeBtn;
            b.classList.toggle('active', isActive);
            b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    // ===== Orbit-class filter buttons =====
    const orbitButtons = document.querySelectorAll('.globe-filter');
    orbitButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setActiveInGroup(orbitButtons, btn);
            orbitFilter = btn.dataset.filter;
            applyFilters();
        });
    });

    // ===== Mega-constellation isolator =====
    const constellationButtons = document.querySelectorAll('.constellation-filter');
    constellationButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setActiveInGroup(constellationButtons, btn);
            constellationFilter = btn.dataset.constellation;
            applyFilters();
            // Linked view: tell the Chapter 2 country bar chart which country
            // (if any) operates this constellation so it can light up.
            window.dispatchEvent(new CustomEvent('constellation-changed', {
                detail: {
                    constellation: constellationFilter,
                    country: CONSTELLATION_COUNTRY[constellationFilter] ?? null,
                },
            }));
        });
    });

    // ===== Time slider + play button =====
    const slider = document.getElementById('time-range');
    const playBtn = document.getElementById('time-play');
    const playLabel = playBtn ? playBtn.querySelector('.time-play-label') : null;
    const playIcon = playBtn ? playBtn.querySelector('.time-play-icon') : null;

    let playTimer = null;
    const PLAY_INTERVAL_MS = 330; // ~3 years/sec

    function setYear(y, fromUser) {
        yearFilter = Math.max(yearMin, Math.min(yearMax, y | 0));
        if (slider && +slider.value !== yearFilter) slider.value = String(yearFilter);
        applyFilters();
        // Manual interaction during playback pauses the auto-sweep so the
        // user is never fighting the timer for control of the slider.
        if (fromUser && playTimer !== null) stopPlay();
    }

    function startPlay() {
        if (playTimer !== null) return;
        // If we're already at the end, restart from the beginning so the
        // user can hit Play repeatedly without dragging the slider back.
        if (yearFilter >= yearMax) setYear(yearMin, false);
        if (playBtn) {
            playBtn.classList.add('is-playing');
            playBtn.setAttribute('aria-label', 'Pause launch history playback');
            if (playLabel) playLabel.textContent = 'Pause';
            if (playIcon) playIcon.textContent = '⏸';
        }
        playTimer = setInterval(() => {
            const next = yearFilter + 1;
            if (next > yearMax) {
                setYear(yearMax, false);
                stopPlay();
                return;
            }
            setYear(next, false);
        }, PLAY_INTERVAL_MS);
    }

    function stopPlay() {
        if (playTimer === null) return;
        clearInterval(playTimer);
        playTimer = null;
        if (playBtn) {
            playBtn.classList.remove('is-playing');
            playBtn.setAttribute('aria-label', 'Play launch history from 1974 to 2023');
            if (playLabel) playLabel.textContent = 'Play history';
            if (playIcon) playIcon.textContent = '▶';
        }
    }

    if (slider) {
        slider.addEventListener('input', () => setYear(+slider.value, true));
    }
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            if (playTimer === null) startPlay();
            else stopPlay();
        });
    }

    // Initial paint so the counter shows the real "satellites at 2023" value
    applyFilters();

    // Slow rotation on hover (only when auto-rotate is enabled)
    if (!prefersReducedMotion) {
        container.addEventListener('mouseenter', () => { globe.controls().autoRotateSpeed = 0.1; });
        container.addEventListener('mouseleave', () => { globe.controls().autoRotateSpeed = 0.4; });
    }

    // Resize. ResizeObserver tracks the container's actual rendered size,
    // which catches both window resizes AND late layout settling (fonts,
    // images). Without this, a container that measured 0 at init time
    // would never recover its real width.
    function resizeGlobe() {
        const w = container.clientWidth;
        if (w > 0) globe.width(w);
    }
    if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(resizeGlobe).observe(container);
    } else {
        window.addEventListener('resize', resizeGlobe);
    }
    // Belt and suspenders: run once after a microtask so we catch any
    // layout that wasn't ready synchronously.
    requestAnimationFrame(resizeGlobe);

    console.log('Globe initialized');
}

window.initGlobe = initGlobe;
