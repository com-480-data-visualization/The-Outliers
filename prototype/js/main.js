/**
 * main.js — Entry point. Loads data and initializes all components.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Boot the hero 3D Earth + satellite scene
  if (typeof initJourney === 'function') {
    initJourney();
  }

  // 2D canvas visuals: page-wide twinkle dust + dense hero starfield
  drawPageStars();
  drawHeroParticles();

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
      drawPurposeOverTimeChart(data.cumulative_purpose_by_year);
      drawCountriesChart(data.top_countries);
      drawWorldMap(data.country_counts);
      drawLorenzChart(data.lorenz_curve);
      drawOperatorsChart(data.top_operators, data.operator_details);
      drawCountryPurposeChart(data.country_purpose_matrix);
      drawOrbitDonut(data.orbit_distribution);
      drawPurposeChart(data.purpose_breakdown);
      drawPurposeOrbitChart(data.purpose_by_orbit);
      drawFutureChart();
    })
    .catch(e => console.error('Failed to load satellite data:', e));
});
