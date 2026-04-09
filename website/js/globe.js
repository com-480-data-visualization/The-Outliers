/**
 * 3D Globe visualization using Globe.gl
 * Shows 6,718 satellites at their orbital positions using real altitude + inclination data.
 */

// Compressed altitude scale: maps real km to visual globe units
// Log scale keeps LEO, MEO, GEO all visible as distinct layers
function altitudeToVisual(alt_km) {
    if (!alt_km || alt_km <= 0) return 0.02;
    const clamped = Math.min(alt_km, 50000); // cap extreme outliers
    return Math.log1p(clamped / 6371) * 0.42;
}

// Orbit class colors (matching CSS palette)
const ORBIT_COLORS = {
    "LEO": "#1a73e8",
    "MEO": "#e8710a",
    "GEO": "#34a853",
    "Elliptical": "#9334e6"
};

// Prepare satellite data for Globe.gl points
function prepareSatellitePoints(data) {
    return data
        .filter(d => d.altitude && d.inclination != null)
        .map(d => {
            // Clamp inclination to valid range
            const inc = Math.min(Math.abs(d.inclination), 180);
            // Max latitude a satellite reaches equals its inclination
            const maxLat = Math.min(inc, 90);
            // Random latitude within the orbital envelope
            const lat = (Math.random() * 2 - 1) * maxLat;
            const lng = Math.random() * 360 - 180;

            return {
                lat,
                lng,
                alt: altitudeToVisual(d.altitude),
                size: d.orbit_class === "GEO" ? 0.22 : (d.orbit_class === "MEO" ? 0.18 : 0.07),
                color: ORBIT_COLORS[d.orbit_class] || "#c9d1d9",
                orbit_class: d.orbit_class,
                name: d.name,
                purpose: d.purpose || "Unknown",
                country: d.country || "Unknown",
                altitude_km: Math.round(d.altitude)
            };
        });
}

function initGlobe(data) {
    const container = document.getElementById("globe-container");
    if (!container || typeof Globe === "undefined") {
        console.warn("Globe.gl not available or container not found");
        return;
    }

    const allPoints = prepareSatellitePoints(data);
    let activeFilter = "all";

    const globe = new Globe(container)
        .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-night.jpg")
        .backgroundImageUrl("https://unpkg.com/three-globe/example/img/night-sky.png")
        .backgroundColor("rgba(13, 17, 23, 0)")
        .showAtmosphere(true)
        .atmosphereColor("rgba(26, 115, 232, 0.3)")
        .atmosphereAltitude(0.2)
        .pointsData(allPoints)
        .pointLat("lat")
        .pointLng("lng")
        .pointAltitude("alt")
        .pointRadius("size")
        .pointColor("color")
        .pointLabel(d =>
            `<div style="background:#161b22;padding:8px 12px;border-radius:6px;border:1px solid #30363d;font-size:13px;color:#c9d1d9;">
                <strong style="color:#f0f6fc;">${d.name}</strong><br>
                <span style="color:${d.color};">${d.orbit_class}</span> &middot; ${d.altitude_km.toLocaleString()} km<br>
                ${d.purpose} &middot; ${d.country}
            </div>`)
        .pointsMerge(true)
        .width(container.clientWidth)
        .height(600);

    // Auto-rotate
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.4;
    globe.controls().enableZoom = true;
    globe.controls().minDistance = 150;
    globe.controls().maxDistance = 500;

    // Initial camera angle (slightly tilted)
    globe.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 0);

    console.log(`Globe initialized with ${allPoints.length} satellite points`);

    // Filter buttons
    const filterBtns = document.querySelectorAll(".globe-filter");
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            activeFilter = btn.dataset.filter;
            const filtered = activeFilter === "all"
                ? allPoints
                : allPoints.filter(d => d.orbit_class === activeFilter);

            globe.pointsData(filtered);
        });
    });

    // Pause auto-rotate on hover, resume on leave
    container.addEventListener("mouseenter", () => {
        globe.controls().autoRotateSpeed = 0.1;
    });
    container.addEventListener("mouseleave", () => {
        globe.controls().autoRotateSpeed = 0.4;
    });

    // Handle resize
    window.addEventListener("resize", () => {
        globe.width(container.clientWidth);
    });

    return globe;
}
