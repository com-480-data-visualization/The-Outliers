/**
 * charts/heatmap.js — Purpose × orbit-class heatmap (Chapter 3).
 *
 * A log-scaled grid showing how satellites are distributed across orbit
 * classes (columns: LEO/MEO/GEO/Elliptical) and purposes (rows). A custom
 * dark-to-cyan colormap reads well on the space-themed background. A
 * docked info card in the top-right of the parent block shows the hovered
 * cell's purpose, orbit and count.
 *
 * Lectures: 6 (Mark & channel), 11 (Tabular data).
 */

function drawPurposeOrbitChart(data) {
  const container = d3.select("#purpose-orbit-chart");
  if (container.empty()) return;

  const orbits = ["LEO", "MEO", "GEO", "Elliptical"];
  const purposes = data.map((d) => d.purpose);
  const margin = { top: 40, right: 90, bottom: 5, left: 160 };
  const cellW = 140,
    cellH = 52;
  const width = orbits.length * cellW;
  const height = purposes.length * cellH;

  const svg = container
    .append("svg")
    .attr(
      "viewBox",
      `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`,
    )
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Gather non-zero values for color scale
  const allVals = [];
  data.forEach((d) =>
    orbits.forEach((o) => {
      if (d[o] > 0) allVals.push(d[o]);
    }),
  );

  // Custom dark-friendly palette: dark muted bg -> vibrant teal/cyan
  const colorScale = d3
    .scaleSequentialLog()
    .domain([1, d3.max(allVals)])
    .interpolator((t) => d3.interpolateRgb("#1a2235", "#00e5ff")(t));

  const x = d3.scaleBand().domain(orbits).range([0, width]).padding(0.06);
  const y = d3.scaleBand().domain(purposes).range([0, height]).padding(0.06);

  // Fixed info card in top-right of the parent .viz-block
  const parentBlock = d3
    .select("#purpose-orbit-chart")
    .node()
    .closest(".viz-block");
  d3.select(parentBlock).style("position", "relative");

  const heatmapInfo = d3
    .select(parentBlock)
    .append("div")
    .style("position", "absolute")
    .style("top", "16px")
    .style("right", "24px")
    .style("background", "rgba(15, 19, 32, 0.92)")
    .style("border", "1px solid rgba(0, 229, 255, 0.25)")
    .style("border-radius", "8px")
    .style("padding", "10px 14px")
    .style("min-width", "120px")
    .style("color", "#e8eaf0")
    .style("font-size", "0.78rem")
    .style("line-height", "1.5")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("transition", "opacity 0.2s ease")
    .style(
      "box-shadow",
      "0 4px 24px rgba(0,0,0,0.5), 0 0 30px rgba(0,229,255,0.08), 0 0 60px rgba(0,229,255,0.04)",
    )
    .style("backdrop-filter", "blur(8px)")
    .style("z-index", "10");

  // Draw cells
  data.forEach((d) => {
    orbits.forEach((o) => {
      const val = d[o];
      var cellColor = val > 0 ? colorScale(val) : "rgba(255,255,255,0.03)";
      var glowStrength = val > 1000 ? "60" : val > 100 ? "40" : "20";
      svg
        .append("rect")
        .attr("x", x(o))
        .attr("y", y(d.purpose))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("rx", 8)
        .attr("fill", val > 0 ? cellColor : "transparent")
        .attr("fill-opacity", val > 0 ? 0.12 : 0)
        .attr("stroke", val > 0 ? cellColor : "rgba(255,255,255,0.06)")
        .attr("stroke-width", val > 0 ? 1.5 : 1)
        .style("filter", val > 0 ? "drop-shadow(0 0 6px " + cellColor + glowStrength + ")" : "none")
        .on("mouseenter", function () {
          d3.select(this)
            .attr("stroke", "#00e5ff")
            .attr("stroke-width", 2)
            .attr("fill-opacity", 0.25)
            .style("filter", "drop-shadow(0 0 14px rgba(0,229,255,0.5))");
          heatmapInfo
            .html(
              "<strong>" + d.purpose + "</strong><br><span style='color:#9ba3b5;'>in</span> " + o + "<br><span style='color:#00e5ff;font-size:1rem;font-weight:700;'>" + val.toLocaleString() + "</span> <span style='color:#9ba3b5;'>satellites</span>",
            )
            .style("opacity", 1);
        })
        .on("mouseleave", function () {
          d3.select(this)
            .attr("stroke", val > 0 ? cellColor : "rgba(255,255,255,0.06)")
            .attr("stroke-width", val > 0 ? 1.5 : 1)
            .attr("fill-opacity", val > 0 ? 0.12 : 0)
            .style("filter", val > 0 ? "drop-shadow(0 0 6px " + cellColor + glowStrength + ")" : "none");
          heatmapInfo.style("opacity", 0);
        });

      // Number label - dark text on bright cells, white on dark
      if (val > 0) {
        // Above ~50, the cyan is bright enough to need dark text
        const textColor = val >= 50 ? "#0a0e1a" : "#e8eaf0";
        svg
          .append("text")
          .attr("x", x(o) + x.bandwidth() / 2)
          .attr("y", y(d.purpose) + y.bandwidth() / 2)
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .attr("fill", textColor)
          .attr("font-size", val > 500 ? "15px" : "12px")
          .attr("font-weight", val > 100 ? "800" : "600")
          .style("pointer-events", "none")
          .text(val.toLocaleString());
      }
    });
  });

  // Axes
  svg
    .append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickSize(0))
    .select(".domain")
    .remove();
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0,-6)")
    .call(d3.axisTop(x).tickSize(0))
    .select(".domain")
    .remove();

  // Legend
  const items = [
    { label: "4,000+", val: 4000 },
    { label: "1,000", val: 1000 },
    { label: "100", val: 100 },
    { label: "10", val: 10 },
    { label: "1-5", val: 2 },
  ];
  const lg = svg
    .append("g")
    .attr("transform", `translate(${width + 20}, ${height / 2 - 70})`);
  items.forEach((item, i) => {
    const g = lg.append("g").attr("transform", `translate(0,${i * 26})`);
    g.append("rect")
      .attr("width", 14)
      .attr("height", 14)
      .attr("rx", 3)
      .attr("fill", colorScale(item.val));
    g.append("text")
      .attr("x", 20)
      .attr("y", 11)
      .attr("fill", "#9ba3b5")
      .attr("font-size", "11px")
      .text(item.label);
  });
}
