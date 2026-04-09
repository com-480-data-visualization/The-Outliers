/**
 * globe.js — 3D Globe visualization using Globe.gl
 * Loads its own slim dataset (satellites-globe.json) with altitude + inclination.
 */

const ORBIT_COLORS = {
    LEO: '#1a73e8',
    MEO: '#e8710a',
    GEO: '#34a853',
    Elliptical: '#9334e6',
};

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

    // Mount globe
    const globe = Globe()
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
        .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
        .backgroundColor('rgba(0,0,0,0)')
        .showAtmosphere(true)
        .atmosphereColor('rgba(26, 115, 232, 0.25)')
        .atmosphereAltitude(0.18)
        .width(container.clientWidth)
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

    // Controls
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.4;
    globe.controls().enableZoom = true;
    globe.controls().minDistance = 120;
    globe.controls().maxDistance = 400;
    globe.pointOfView({ lat: 25, lng: 0, altitude: 2.2 }, 0);

    // Filter buttons
    document.querySelectorAll('.globe-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.globe-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            globe.pointsData(filter === 'all' ? allPoints : allPoints.filter(d => d.orbit_class === filter));
        });
    });

    // Slow rotation on hover
    container.addEventListener('mouseenter', () => { globe.controls().autoRotateSpeed = 0.1; });
    container.addEventListener('mouseleave', () => { globe.controls().autoRotateSpeed = 0.4; });

    // Resize
    window.addEventListener('resize', () => { globe.width(container.clientWidth); });

    console.log('Globe initialized');
}

window.initGlobe = initGlobe;
