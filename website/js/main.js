/**
 * main.js — Entry point. Loads data and initializes all components.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Load pre-aggregated data
  let data;
  try {
    const res = await fetch('data/satellites.json');
    data = await res.json();
  } catch (e) {
    console.error('Failed to load satellite data:', e);
    return;
  }

  // Star fields
  drawPageStars();
  drawHeroParticles();

  // Initialize scrollytelling observers
  initScrollytelling();
  initStatCounters();

  // Draw all visualizations
  drawTimelineChart(data.cumulative_launches);
  drawCountriesChart(data.top_countries);
  drawLorenzChart(data.lorenz_curve);
  drawOrbitDonut(data.orbit_distribution);
  drawPurposeChart(data.purpose_breakdown);
  drawPurposeOrbitChart(data.purpose_by_orbit);

  // Initialize 3D globe when section is visible
  if (typeof initGlobe === 'function') {
    const globeEl = document.getElementById('globe-container');
    if (globeEl) {
      let globeLoaded = false;
      const obs = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !globeLoaded) {
          globeLoaded = true;
          initGlobe();
          obs.disconnect();
        }
      }, { threshold: 0.3 });
      obs.observe(globeEl);
    }
  }
});
