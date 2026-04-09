/**
 * main.js — Entry point. Loads data and initializes all components.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Fire visuals that don't need data immediately
  drawPageStars();
  drawHeroParticles();
  drawTitleOrbits();

  // Initialize 3D globe immediately (loads its own data)
  if (typeof initGlobe === 'function') {
    initGlobe();
  }

  // Initialize scrollytelling observers
  initScrollytelling();
  initStatCounters();

  // Load pre-aggregated data, then draw charts
  fetch('data/satellites.json')
    .then(res => res.json())
    .then(data => {
      drawTimelineChart(data.cumulative_launches);
      drawCountriesChart(data.top_countries);
      drawLorenzChart(data.lorenz_curve);
      drawOrbitDonut(data.orbit_distribution);
      drawPurposeChart(data.purpose_breakdown);
      drawPurposeOrbitChart(data.purpose_by_orbit);
    })
    .catch(e => console.error('Failed to load satellite data:', e));
});
