/**
 * charts/world-map.js — Chapter 2 world choropleth map.
 *
 * Colors every country by how many operational satellites it owns. Uses
 * the Natural-Earth-friendly Equal Earth projection (modern equal-area)
 * so country sizes are not distorted. Counts are log-scaled (because USA
 * has 4,509 sats and most countries have fewer than 10) and mapped onto
 * a dark-navy → accent-blue ramp that matches the rest of the palette.
 *
 * Linked view: when the Chapter 3 mega-constellation isolator dispatches
 * `constellation-changed`, we light up the corresponding country here
 * (a glowing white outline). This is the same wiring the country bar
 * chart already uses; both views now react together.
 *
 * Data loaded at runtime from world-atlas (TopoJSON, 100 KB cached) and
 * unpacked with topojson-client (both via CDN, loaded via <script> tags
 * in index.html).
 *
 * Lectures: 6 (color), 7 (designing viz), 8 (maps — the rubric coverage
 * for this lecture), 11 (tabular data joined to a geographic feature
 * collection).
 */

// UCS uses some country names that differ from world-atlas's properties.name
// (which mostly tracks the UN's "preferred English short name"). Anything
// not in this map falls through unchanged, which works for the common case
// (Germany, France, India, Japan, ...). Aggregates that are NOT a single
// country (ESA, Multinational, joint "A/B" missions) are explicitly excluded
// from the map — they still show in the bar chart.
const COUNTRY_NAME_MAP = {
  USA: "United States of America",
  Russia: "Russia",
  "South Korea": "South Korea",
  "North Korea": "North Korea",
  "Czech Republic": "Czech Republic",
  "United Arab Emirates": "United Arab Emirates",
};

const NON_COUNTRY_KEYS = new Set([
  "ESA",
  "Multinational",
  "Unknown",
]);

async function drawWorldMap(countryCounts) {
  const container = d3.select("#world-map-chart");
  if (container.empty()) return;
  if (typeof topojson === "undefined") {
    console.warn("world-map: topojson-client not loaded");
    return;
  }

  // ---------- Load TopoJSON ----------
  let worldTopo;
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json",
    );
    worldTopo = await res.json();
  } catch (e) {
    console.warn("world-map: failed to load world-atlas TopoJSON", e);
    return;
  }
  const countries = topojson.feature(
    worldTopo,
    worldTopo.objects.countries,
  ).features;

  // ---------- Build name → count lookup ----------
  // We merge UCS country labels with world-atlas names, drop the non-country
  // entries (ESA, Multinational, slashed joints), and accumulate just in
  // case multiple UCS labels collapse to the same world-atlas country.
  const countByName = new Map();
  for (const d of countryCounts) {
    if (NON_COUNTRY_KEYS.has(d.country)) continue;
    if (d.country.includes("/")) continue; // joint missions skipped on the map
    const mapped = COUNTRY_NAME_MAP[d.country] || d.country;
    countByName.set(mapped, (countByName.get(mapped) || 0) + d.count);
  }
  const maxCount = d3.max(Array.from(countByName.values())) || 1;

  // ---------- Color scale ----------
  // Log-scaled because the long tail is brutal (4,509 vs single digits).
  // Dark navy base (almost invisible on the page background) ramps up to
  // the project's main blue. Countries with no data stay at a neutral
  // landmass color so they read as "land" not as "zero".
  const colorScale = d3
    .scaleSequentialLog()
    .domain([1, maxCount])
    .interpolator(d3.interpolateRgb("#15233e", "#1a73e8"));
  const noDataColor = "#0d1422";

  // ---------- Render ----------
  const VIEW_W = 960;
  const VIEW_H = 480;
  const projection = d3
    .geoEqualEarth()
    .fitSize([VIEW_W, VIEW_H - 30], { type: "Sphere" });
  const path = d3.geoPath().projection(projection);

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${VIEW_W} ${VIEW_H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("class", "world-map-svg");

  // Sphere outline (subtle halo around the globe boundary)
  svg
    .append("path")
    .datum({ type: "Sphere" })
    .attr("class", "world-map-sphere")
    .attr("d", path)
    .attr("fill", "rgba(26, 115, 232, 0.04)")
    .attr("stroke", "rgba(26, 115, 232, 0.25)")
    .attr("stroke-width", 0.8);

  // Graticule lines (very faint — give the projection texture without
  // competing with the country fills)
  svg
    .append("path")
    .datum(d3.geoGraticule10())
    .attr("class", "world-map-graticule")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", "rgba(255, 255, 255, 0.04)")
    .attr("stroke-width", 0.5);

  // Country paths
  const tip = ensureTooltip();
  const paths = svg
    .append("g")
    .attr("class", "world-map-countries")
    .selectAll("path")
    .data(countries)
    .join("path")
    .attr("class", "world-country")
    .attr("d", path)
    .attr("fill", (d) => {
      const c = countByName.get(d.properties.name);
      return c ? colorScale(c) : noDataColor;
    })
    .attr("stroke", "rgba(0, 0, 0, 0.45)")
    .attr("stroke-width", 0.5)
    .on("mouseenter", function (event, d) {
      const c = countByName.get(d.properties.name) || 0;
      const pct = ((c / 6713) * 100).toFixed(1);
      tip
        .html(
          `<strong>${d.properties.name}</strong><br>` +
            `${c.toLocaleString()} satellite${c === 1 ? "" : "s"}<br>` +
            `<span style="color:#9ba3b5;">${pct}% of global fleet</span>`,
        )
        .style("left", event.clientX + 12 + "px")
        .style("top", event.clientY - 30 + "px")
        .style("opacity", 1);
    })
    .on("mousemove", function (event) {
      tip
        .style("left", event.clientX + 12 + "px")
        .style("top", event.clientY - 30 + "px");
    })
    .on("mouseleave", function () {
      tip.style("opacity", 0);
    });

  // ---------- Legend (log gradient bar) ----------
  // 5 stops aligned to roughly log-spaced values: 1, 10, 100, 1k, 4.5k.
  const legendW = 220;
  const legendH = 10;
  const legendX = VIEW_W - legendW - 16;
  const legendY = VIEW_H - 24;

  const defs = svg.append("defs");
  const grad = defs
    .append("linearGradient")
    .attr("id", "world-map-gradient")
    .attr("x1", "0%")
    .attr("x2", "100%");
  const stops = [0, 0.25, 0.5, 0.75, 1];
  stops.forEach((s) => {
    grad
      .append("stop")
      .attr("offset", `${s * 100}%`)
      .attr("stop-color", colorScale(Math.pow(maxCount, s)));
  });

  const legend = svg
    .append("g")
    .attr("transform", `translate(${legendX}, ${legendY})`);
  legend
    .append("rect")
    .attr("width", legendW)
    .attr("height", legendH)
    .attr("rx", 2)
    .attr("fill", "url(#world-map-gradient)");

  const legendTicks = [1, 10, 100, 1000, Math.round(maxCount)];
  legendTicks.forEach((v) => {
    const t = Math.log(v) / Math.log(maxCount);
    const tx = t * legendW;
    legend
      .append("text")
      .attr("x", tx)
      .attr("y", legendH + 14)
      .attr("text-anchor", "middle")
      .attr("fill", "#9ba3b5")
      .attr("font-size", 10)
      .attr("font-family", "Inter, sans-serif")
      .text(v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v);
  });
  legend
    .append("text")
    .attr("x", 0)
    .attr("y", -6)
    .attr("fill", "#9ba3b5")
    .attr("font-size", 10)
    .attr("letter-spacing", "0.06em")
    .attr("font-family", "Inter, sans-serif")
    .text("SATELLITES (LOG SCALE)");

  // ---------- Linked view ----------
  // When the user picks Starlink / OneWeb / etc. on the Chapter 3 globe,
  // light up the corresponding country here.
  window.addEventListener("constellation-changed", (e) => {
    const country = e.detail && e.detail.country;
    const mapped = country ? COUNTRY_NAME_MAP[country] || country : null;
    paths.classed(
      "linked-country-map",
      (d) => !!mapped && d.properties.name === mapped,
    );
  });
}
