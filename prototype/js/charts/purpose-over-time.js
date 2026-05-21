/**
 * charts/purpose-over-time.js — Cumulative satellites by purpose, stacked
 * area chart (Chapter 1).
 *
 * Companion view to the cumulative-launches timeline above it: same X-axis
 * (years 1974–2022) but the y-values are the running totals split by
 * canonical purpose. The visual finding it makes obvious: Communications
 * was a modest band through 2018, then explodes to dominate the chart
 * post-2019 as Starlink and OneWeb launch their megaconstellations.
 *
 * Lectures: 4 (D3 stacks), 6 (color, mark & channel), 7 (designing viz),
 *           12 (storytelling, Freytag's pyramid).
 */

function drawPurposeOverTimeChart(data) {
  const container = d3.select("#purpose-over-time-chart");
  if (container.empty()) return;

  const rect = container.node().getBoundingClientRect();
  const margin = { top: 24, right: 130, bottom: 50, left: 70 };
  const width = Math.max(640, rect.width) - margin.left - margin.right;
  const height = 380 - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Stack order: bottom = Other, top = Communications. Reverse-painted so
  // the blue Communications band sits visually on top, where its post-2019
  // explosion reads loudest.
  const stackOrder = [
    "Other",
    "Space Science",
    "Navigation",
    "Technology Development",
    "Earth Observation",
    "Communications",
  ];

  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.year))
    .range([0, width]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => stackOrder.reduce((s, k) => s + d[k], 0))])
    .nice()
    .range([height, 0]);

  // Grid
  svg
    .append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(6).tickSize(-width).tickFormat(""));

  // Axes
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(8));

  svg
    .append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(6).tickFormat((d) => d.toLocaleString()));

  // Stack
  const stackGen = d3.stack().keys(stackOrder);
  const series = stackGen(data);

  const area = d3
    .area()
    .x((d) => x(d.data.year))
    .y0((d) => y(d[0]))
    .y1((d) => y(d[1]))
    .curve(d3.curveMonotoneX);

  // Paint each layer with its palette colour. Fill at 0.45 opacity so the
  // overlap with the gridlines and the axis ticks stays readable.
  svg
    .selectAll(".purpose-layer")
    .data(series)
    .join("path")
    .attr("class", "purpose-layer")
    .attr("fill", (d) => PURPOSE_COLORS[d.key] || "#666")
    .attr("fill-opacity", 0.62)
    .attr("stroke", (d) => PURPOSE_COLORS[d.key] || "#666")
    .attr("stroke-width", 1)
    .attr("stroke-opacity", 0.85)
    .attr("d", area);

  // Annotation: 2019 — the year megaconstellation launches began in earnest.
  const annoYear = 2019;
  if (data.find((d) => d.year === annoYear)) {
    svg
      .append("line")
      .attr("x1", x(annoYear))
      .attr("x2", x(annoYear))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#9ba3b5")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4 4")
      .attr("opacity", 0.6);

    svg
      .append("text")
      .attr("x", x(annoYear))
      .attr("y", -8)
      .attr("text-anchor", "middle")
      .attr("fill", "#9ba3b5")
      .attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif")
      .text("Starlink era →");
  }

  // Legend (right side, top-down in painted order)
  const legend = svg
    .append("g")
    .attr("transform", `translate(${width + 16}, 0)`);

  const legendOrder = stackOrder.slice().reverse();
  legendOrder.forEach((key, i) => {
    const g = legend
      .append("g")
      .attr("transform", `translate(0, ${i * 22})`);

    g.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("rx", 2)
      .attr("fill", PURPOSE_COLORS[key] || "#666")
      .attr("fill-opacity", 0.62)
      .attr("stroke", PURPOSE_COLORS[key] || "#666")
      .attr("stroke-width", 1);

    g.append("text")
      .attr("x", 18)
      .attr("y", 10)
      .attr("fill", "#9ba3b5")
      .attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif")
      .text(key);
  });

  // Hover: vertical guide + shared tooltip listing the year's breakdown.
  const tip = ensureTooltip();
  const guide = svg
    .append("line")
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "#fff")
    .attr("stroke-opacity", 0.4)
    .attr("stroke-dasharray", "3 4")
    .style("opacity", 0);

  svg
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "transparent")
    .on("mousemove", function (event) {
      const [mx] = d3.pointer(event);
      const year = Math.round(x.invert(mx));
      const d = data.find((p) => p.year === year);
      if (!d) return;
      guide
        .attr("x1", x(d.year))
        .attr("x2", x(d.year))
        .style("opacity", 1);

      const total = stackOrder.reduce((s, k) => s + d[k], 0);
      const rows = legendOrder
        .map((k) => {
          const v = d[k];
          const pct = total > 0 ? ((v / total) * 100).toFixed(0) : "0";
          const color = PURPOSE_COLORS[k] || "#666";
          return `<div style="display:flex;align-items:center;gap:8px;margin-top:2px;">
            <span style="width:10px;height:10px;background:${color};border-radius:2px;display:inline-block;"></span>
            <span style="flex:1;">${k}</span>
            <span style="color:#9ba3b5;font-variant-numeric:tabular-nums;">${v.toLocaleString()} (${pct}%)</span>
          </div>`;
        })
        .join("");
      tip
        .html(
          `<div style="min-width:230px;">
            <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px;">${d.year}</div>
            ${rows}
            <div style="border-top:1px solid rgba(255,255,255,0.12);margin-top:6px;padding-top:4px;display:flex;justify-content:space-between;">
              <span>Total</span><span style="font-weight:600;">${total.toLocaleString()}</span>
            </div>
          </div>`,
        )
        .style("left", event.clientX + 15 + "px")
        .style("top", event.clientY - 40 + "px")
        .style("opacity", 1);
    })
    .on("mouseleave", function () {
      guide.style("opacity", 0);
      tip.style("opacity", 0);
    });
}
