/**
 * charts/countries.js — Top countries by satellite count (Chapter 2).
 *
 * A horizontal bar chart of the top 10 countries (excluding the "Others"
 * bucket), with the leader (USA) highlighted in the accent colour to
 * underline its 67.1% share. Horizontal orientation keeps long country
 * names legible (Lecture 7).
 */

function drawCountriesChart(data) {
  const container = d3.select("#countries-chart");
  if (container.empty()) return;

  // Filter out "Others" for the bar chart, show top 10
  const top10 = data.filter((d) => d.country !== "Others").slice(0, 10);

  const margin = { top: 10, right: 55, bottom: 20, left: 100 };
  const width = 460 - margin.left - margin.right;
  const height = 380 - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr(
      "viewBox",
      `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`,
    )
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(top10, (d) => d.count)])
    .range([0, width]);

  const y = d3
    .scaleBand()
    .domain(top10.map((d) => d.country))
    .range([0, height])
    .padding(0.25);

  svg
    .append("g")
    .attr("class", "grid")
    .call(d3.axisBottom(x).ticks(5).tickSize(height).tickFormat(""))
    .attr("transform", `translate(0,0)`);

  // Bars
  const tip = ensureTooltip();
  svg
    .selectAll(".bar")
    .data(top10)
    .join("rect")
    .attr("class", "bar")
    .attr("y", (d) => y(d.country))
    .attr("height", y.bandwidth())
    .attr("x", 0)
    .attr("width", 0)
    .attr("fill", (d, i) => (i === 0 ? COLORS.accent : COLORS.main))
    .attr("rx", 4)
    .on("mouseenter", function (event, d) {
      d3.select(this).attr("fill-opacity", 0.8);
      tip
        .html(
          `<strong>${d.country}</strong><br>${d.count.toLocaleString()} satellites`,
        )
        .style("left", event.clientX + 10 + "px")
        .style("top", event.clientY - 30 + "px")
        .style("opacity", 1);
    })
    .on("mouseleave", function () {
      d3.select(this).attr("fill-opacity", 1);
      tip.style("opacity", 0);
    })
    .transition()
    .duration(800)
    .delay((d, i) => i * 60)
    .attr("width", (d) => x(d.count));

  // Labels
  svg
    .selectAll(".bar-label")
    .data(top10)
    .join("text")
    .attr("class", "bar-label")
    .attr("x", (d) => x(d.count) + 6)
    .attr("y", (d) => y(d.country) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("fill", "#9ba3b5")
    .attr("font-size", "11px")
    .text((d) => d.count.toLocaleString());

  // Y axis (country names)
  svg
    .append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickSize(0))
    .select(".domain")
    .remove();

  // Linked view: the Chapter 3 mega-constellation isolator emits a
  // `constellation-changed` event whenever the active filter changes.
  // We toggle a .linked-country class on the matching bar so it gets a
  // white outline + glow, signalling "this country owns the constellation
  // you just isolated."
  window.addEventListener("constellation-changed", (e) => {
    const country = e.detail && e.detail.country;
    svg
      .selectAll(".bar")
      .classed("linked-country", (d) => !!country && d.country === country);
  });
}
