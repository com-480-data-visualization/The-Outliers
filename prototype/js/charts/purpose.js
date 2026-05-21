/**
 * charts/purpose.js — Satellite purpose vertical bar chart (Chapter 3).
 *
 * Six purpose categories ranked by count. Each bar has its own colour
 * (matched to PURPOSE_COLORS) and a soft glow that intensifies on hover.
 * Percentages are printed above each bar; rotated x-axis labels keep the
 * compact chart readable. The "Technology Development" label is wrapped
 * onto two lines to prevent the rotated text from overflowing.
 *
 * Lectures: 6 (Perception, color), 7 (Designing viz).
 */

function drawPurposeChart(data) {
  var container = d3.select("#purpose-chart");
  if (container.empty()) return;

  var margin = { top: 20, right: 10, bottom: 60, left: 50 };
  var width = 460 - margin.left - margin.right;
  var height = 500 - margin.top - margin.bottom;

  var svg = container
    .append("svg")
    .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var x = d3.scaleBand()
    .domain(data.map(function(d) { return d.purpose; }))
    .range([0, width])
    .padding(0.35);

  var y = d3.scaleLinear()
    .domain([0, d3.max(data, function(d) { return d.count; }) * 1.1])
    .range([height, 0]);

  // Grid
  svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""));

  var tip = ensureTooltip();

  // Bars
  svg.selectAll(".bar")
    .data(data)
    .join("rect")
    .attr("x", function(d) { return x(d.purpose); })
    .attr("width", x.bandwidth())
    .attr("y", height)
    .attr("height", 0)
    .attr("fill", function(d) { return PURPOSE_COLORS[d.purpose] || "#666"; })
    .attr("fill-opacity", 0.15)
    .attr("stroke", function(d) { return PURPOSE_COLORS[d.purpose] || "#666"; })
    .attr("stroke-width", 2)
    .style("filter", function(d) { return "drop-shadow(0 0 6px " + (PURPOSE_COLORS[d.purpose] || "#666") + "40)"; })
    .attr("rx", 6)
    .on("mouseenter", function(event, d) {
      d3.select(this).attr("fill-opacity", 0.3).style("filter", "drop-shadow(0 0 12px " + (PURPOSE_COLORS[d.purpose] || "#666") + "80)");
      tip.html("<strong>" + d.purpose + "</strong><br>" + d.count.toLocaleString() + " (" + d.pct + "%)")
        .style("left", (event.clientX + 10) + "px")
        .style("top", (event.clientY - 70) + "px")
        .style("opacity", 1);
    })
    .on("mouseleave", function(event, d) {
      d3.select(this).attr("fill-opacity", 0.15).style("filter", "drop-shadow(0 0 6px " + (PURPOSE_COLORS[d.purpose] || "#666") + "40)");
      tip.style("opacity", 0);
    })
    .transition()
    .duration(800)
    .delay(function(d, i) { return i * 100; })
    .ease(d3.easeCubicOut)
    .attr("y", function(d) { return y(d.count); })
    .attr("height", function(d) { return height - y(d.count); });

  // Percentage labels on top of bars
  svg.selectAll(".bar-label")
    .data(data)
    .join("text")
    .attr("x", function(d) { return x(d.purpose) + x.bandwidth() / 2; })
    .attr("y", function(d) { return y(d.count) - 8; })
    .attr("text-anchor", "middle")
    .attr("fill", "#e8eaf0")
    .attr("font-size", "12px")
    .attr("font-weight", "600")
    .text(function(d) { return d.pct + "%"; });

  // X axis with rotated labels
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).tickSize(0))
    .select(".domain").remove();

  svg.selectAll(".axis text")
    .attr("transform", "rotate(-40)")
    .style("text-anchor", "end")
    .attr("dx", "-0.6em")
    .attr("dy", "0.2em")
    .attr("font-size", "11px");

  // Wrap "Technology Development" onto two lines so the rotated label is shorter
  svg.selectAll(".axis text").each(function() {
    var t = d3.select(this);
    if (t.text() === "Technology Development") {
      t.text(null);
      t.append("tspan").attr("x", 0).attr("dy", "0em").text("Technology");
      t.append("tspan").attr("x", 0).attr("dy", "1.1em").text("Development");
    }
  });

  // Y axis
  svg.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(",")))
    .select(".domain").remove();
}
