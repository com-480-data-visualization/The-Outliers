/**
 * charts/country-purpose.js — Chapter 2 country × purpose specialization
 * heatmap.
 *
 * Rows = top 10 countries (by total satellites). Columns = the 6 canonical
 * purpose categories. Each cell is the count of that country's satellites
 * dedicated to that purpose, colored on a log scale so the small numbers
 * still register against the dominant USA-Communications block (3,793).
 *
 * The viz reveals geopolitical *specialization*, not just *volume*:
 *   - USA leans Communications (Starlink, OneWeb-USA, Iridium)
 *   - China leans Earth Observation (Gaofen, Yaogan series)
 *   - UK leans Communications (OneWeb)
 *   - ESA leans Navigation (Galileo)
 *   - Germany leans Technology Development (research satellites)
 *
 * Same visual language as the Chapter 3 Purpose × Orbit heatmap so the
 * two read as a family.
 *
 * Lectures: 6 (mark & channel), 7 (designing viz), 11 (tabular data).
 */

function drawCountryPurposeChart(matrix) {
  const container = d3.select("#country-purpose-chart");
  if (container.empty()) return;

  const purposes = [
    "Communications",
    "Earth Observation",
    "Technology Development",
    "Navigation",
    "Space Science",
    "Other",
  ];
  const countries = matrix.map((d) => d.country);

  const margin = { top: 50, right: 90, bottom: 12, left: 150 };
  const cellW = 110;
  const cellH = 38;
  const width = purposes.length * cellW;
  const height = countries.length * cellH;

  const svg = container
    .append("svg")
    .attr(
      "viewBox",
      `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`,
    )
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Gather non-zero values for the color scale domain
  const allVals = [];
  matrix.forEach((row) => {
    purposes.forEach((p) => {
      if (row[p] > 0) allVals.push(row[p]);
    });
  });

  // Same dark-navy → cyan ramp as the Purpose × Orbit heatmap, so the two
  // charts share visual vocabulary.
  const colorScale = d3
    .scaleSequentialLog()
    .domain([1, d3.max(allVals)])
    .interpolator((t) => d3.interpolateRgb("#1a2235", "#00e5ff")(t));

  const x = d3.scaleBand().domain(purposes).range([0, width]).padding(0.06);
  const y = d3.scaleBand().domain(countries).range([0, height]).padding(0.06);

  // Floating info card in the top-right of the parent block (mirrors the
  // Purpose × Orbit heatmap pattern).
  const parentBlock = d3
    .select("#country-purpose-chart")
    .node()
    .closest(".viz-block");
  d3.select(parentBlock).style("position", "relative");

  const infoCard = d3
    .select(parentBlock)
    .append("div")
    .attr("class", "country-purpose-info")
    .style("position", "absolute")
    .style("top", "16px")
    .style("right", "24px")
    .style("background", "rgba(15, 19, 32, 0.92)")
    .style("border", "1px solid rgba(0, 229, 255, 0.25)")
    .style("border-radius", "8px")
    .style("padding", "10px 14px")
    .style("min-width", "140px")
    .style("color", "#e8eaf0")
    .style("font-size", "0.78rem")
    .style("line-height", "1.5")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("transition", "opacity 0.2s ease")
    .style(
      "box-shadow",
      "0 4px 24px rgba(0,0,0,0.5), 0 0 30px rgba(0,229,255,0.08)",
    )
    .style("backdrop-filter", "blur(8px)")
    .style("z-index", "10");

  // Cells
  matrix.forEach((row) => {
    purposes.forEach((p) => {
      const val = row[p];
      const cellColor =
        val > 0 ? colorScale(val) : "rgba(255, 255, 255, 0.03)";
      const glowStrength =
        val > 1000 ? "60" : val > 100 ? "40" : val > 0 ? "20" : "00";

      svg
        .append("rect")
        .attr("x", x(p))
        .attr("y", y(row.country))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("rx", 8)
        .attr("fill", val > 0 ? cellColor : "transparent")
        .attr("fill-opacity", val > 0 ? 0.14 : 0)
        .attr("stroke", val > 0 ? cellColor : "rgba(255, 255, 255, 0.06)")
        .attr("stroke-width", val > 0 ? 1.5 : 1)
        .style(
          "filter",
          val > 0
            ? "drop-shadow(0 0 6px " + cellColor + glowStrength + ")"
            : "none",
        )
        .on("mouseenter", function () {
          d3.select(this)
            .attr("stroke", "#00e5ff")
            .attr("stroke-width", 2)
            .attr("fill-opacity", 0.28)
            .style("filter", "drop-shadow(0 0 14px rgba(0, 229, 255, 0.5))");
          // Total satellites for this country across all purposes — used
          // to compute the share that this cell represents.
          const rowTotal = purposes.reduce((sum, k) => sum + row[k], 0);
          const pct =
            rowTotal > 0 ? ((val / rowTotal) * 100).toFixed(1) : "0.0";
          infoCard
            .html(
              `<strong>${row.country}</strong><br>` +
                `<span style="color:#9ba3b5;">for</span> ${p}<br>` +
                `<span style="color:#00e5ff;font-size:1rem;font-weight:700;">${val.toLocaleString()}</span> ` +
                `<span style="color:#9ba3b5;">satellites</span><br>` +
                `<span style="color:#9ba3b5;font-size:0.72rem;">${pct}% of ${row.country}'s fleet</span>`,
            )
            .style("opacity", 1);
        })
        .on("mouseleave", function () {
          d3.select(this)
            .attr("stroke", val > 0 ? cellColor : "rgba(255, 255, 255, 0.06)")
            .attr("stroke-width", val > 0 ? 1.5 : 1)
            .attr("fill-opacity", val > 0 ? 0.14 : 0)
            .style(
              "filter",
              val > 0
                ? "drop-shadow(0 0 6px " + cellColor + glowStrength + ")"
                : "none",
            );
          infoCard.style("opacity", 0);
        });

      // Cell value label
      if (val > 0) {
        const textColor = val >= 100 ? "#0a0e1a" : "#e8eaf0";
        svg
          .append("text")
          .attr("x", x(p) + x.bandwidth() / 2)
          .attr("y", y(row.country) + y.bandwidth() / 2)
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .attr("fill", textColor)
          .attr("font-size", val > 500 ? "14px" : "11px")
          .attr("font-weight", val > 100 ? "800" : "600")
          .style("pointer-events", "none")
          .text(val.toLocaleString());
      }
    });
  });

  // Y axis (country names)
  svg
    .append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickSize(0))
    .select(".domain")
    .remove();

  // X axis on top (purpose names) — rotated 0deg since columns are wide
  const topAxis = svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0,-8)")
    .call(d3.axisTop(x).tickSize(0));
  topAxis.select(".domain").remove();
  // Wrap "Technology Development" onto two lines so the label fits the
  // column without spilling into its neighbours.
  topAxis.selectAll("text").each(function () {
    const t = d3.select(this);
    if (t.text() === "Technology Development") {
      t.text(null);
      t.append("tspan").attr("x", 0).attr("dy", "-0.4em").text("Technology");
      t.append("tspan").attr("x", 0).attr("dy", "1.1em").text("Development");
    } else if (t.text() === "Earth Observation") {
      t.text(null);
      t.append("tspan").attr("x", 0).attr("dy", "-0.4em").text("Earth");
      t.append("tspan").attr("x", 0).attr("dy", "1.1em").text("Observation");
    } else if (t.text() === "Space Science") {
      t.text(null);
      t.append("tspan").attr("x", 0).attr("dy", "-0.4em").text("Space");
      t.append("tspan").attr("x", 0).attr("dy", "1.1em").text("Science");
    }
  });

  // Legend (right side)
  const legendItems = [
    { label: "1,000+", val: 1000 },
    { label: "100", val: 100 },
    { label: "10", val: 10 },
    { label: "1-5", val: 2 },
  ];
  const lg = svg
    .append("g")
    .attr("transform", `translate(${width + 20}, ${height / 2 - 55})`);
  legendItems.forEach((item, i) => {
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
