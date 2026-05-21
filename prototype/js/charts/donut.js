/**
 * charts/donut.js — Orbit-class distribution donut (Chapter 3).
 *
 * A four-slice donut for LEO / MEO / GEO / Elliptical with a bold centre
 * label highlighting that 88.4% of satellites sit in LEO. Each slice has
 * a soft glow that intensifies on hover, plus a tooltip with the raw
 * count. The legend below maps colour → orbit class.
 *
 * Lectures: 6 (Mark & channel, perception).
 */

function drawOrbitDonut(data) {
  const container = d3.select("#orbit-donut");
  if (container.empty()) return;

  const size = 320;
  const radius = size / 2;
  const inner = radius * 0.55;

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${size} ${size}`)
    .append("g")
    .attr("transform", `translate(${radius},${radius})`);

  const color = d3
    .scaleOrdinal()
    .domain(data.map((d) => d.orbit))
    .range([COLORS.LEO, COLORS.GEO, COLORS.MEO, COLORS.Elliptical]);

  const pie = d3
    .pie()
    .value((d) => d.count)
    .sort(null)
    .padAngle(0.02);
  const arc = d3
    .arc()
    .innerRadius(inner)
    .outerRadius(radius - 10);
  const arcHover = d3
    .arc()
    .innerRadius(inner)
    .outerRadius(radius - 2);

  const tip = ensureTooltip();

  svg
    .selectAll("path")
    .data(pie(data))
    .join("path")
    .attr("d", arc)
    .attr("fill", (d) => color(d.data.orbit))
    .attr("fill-opacity", 0.15)
    .attr("stroke", (d) => color(d.data.orbit))
    .attr("stroke-width", 2)
    .style("filter", (d) => "drop-shadow(0 0 8px " + color(d.data.orbit) + "50)")
    .on("mouseenter", function (event, d) {
      d3.select(this).transition().duration(150).attr("d", arcHover)
        .attr("fill-opacity", 0.35)
        .style("filter", "drop-shadow(0 0 16px " + color(d.data.orbit) + "90)");
      tip
        .html(
          `<strong>${d.data.orbit}</strong><br>${d.data.count.toLocaleString()} (${d.data.pct}%)`,
        )
        .style("left", event.clientX + 10 + "px")
        .style("top", event.clientY - 30 + "px")
        .style("opacity", 1);
    })
    .on("mouseleave", function (event, d) {
      d3.select(this).transition().duration(150).attr("d", arc)
        .attr("fill-opacity", 0.15)
        .style("filter", "drop-shadow(0 0 8px " + color(d.data.orbit) + "50)");
      tip.style("opacity", 0);
    });

  // Center label
  svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "-0.2em")
    .attr("fill", "#e8eaf0")
    .attr("font-size", "28px")
    .attr("font-weight", "700")
    .attr("font-family", "Space Grotesk, sans-serif")
    .text("88.4%");

  svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "1.4em")
    .attr("fill", "#9ba3b5")
    .attr("font-size", "13px")
    .text("in LEO");

  // Legend
  const legend = container
    .append("div")
    .style("display", "flex")
    .style("justify-content", "center")
    .style("gap", "20px")
    .style("margin-top", "16px")
    .style("flex-wrap", "wrap");

  data.forEach((d) => {
    const item = legend
      .append("span")
      .style("display", "flex")
      .style("align-items", "center")
      .style("gap", "6px")
      .style("font-size", "0.85rem")
      .style("color", "#9ba3b5");

    item
      .append("span")
      .style("width", "12px")
      .style("height", "12px")
      .style("border-radius", "3px")
      .style("background", color(d.orbit))
      .style("display", "inline-block");

    item.append("span").text(`${d.orbit} (${d.pct}%)`);
  });
}
