/**
 * charts/lorenz.js — Lorenz curve of operator inequality (Chapter 2).
 *
 * Plots the share of satellites controlled by the bottom X% of operators.
 * The dashed diagonal is perfect equality; the shaded gap to the curve is
 * the inequality. Annotated with the Gini coefficient (0.862).
 *
 * Lectures: 6 (Mark & channel), 11 (Tabular data).
 */

function drawLorenzChart(data) {
  const container = d3.select("#lorenz-chart");
  if (container.empty()) return;

  const margin = { top: 20, right: 20, bottom: 50, left: 55 };
  const width = 400 - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr(
      "viewBox",
      `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`,
    )
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([0, 100]).range([0, width]);
  const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);

  // Axes
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(5)
        .tickFormat((d) => d + "%"),
    );

  svg
    .append("g")
    .attr("class", "axis")
    .call(
      d3
        .axisLeft(y)
        .ticks(5)
        .tickFormat((d) => d + "%"),
    );

  // Axis labels
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .attr("fill", "#9ba3b5")
    .attr("font-size", "12px")
    .text("% of Operators");

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -42)
    .attr("text-anchor", "middle")
    .attr("fill", "#9ba3b5")
    .attr("font-size", "12px")
    .text("% of Satellites");

  // Equality line
  svg
    .append("line")
    .attr("x1", 0)
    .attr("y1", height)
    .attr("x2", width)
    .attr("y2", 0)
    .attr("stroke", "#444")
    .attr("stroke-dasharray", "6");

  // Lorenz curve
  const lorenzLine = d3
    .line()
    .x((d) => x(d.pct_operators))
    .y((d) => y(d.pct_satellites))
    .curve(d3.curveMonotoneX);

  // Shaded area between equality and Lorenz
  const areaGen = d3
    .area()
    .x((d) => x(d.pct_operators))
    .y0((d) => y(d.pct_operators)) // equality line
    .y1((d) => y(d.pct_satellites))
    .curve(d3.curveMonotoneX);

  svg
    .append("path")
    .datum(data)
    .attr("fill", COLORS.accent)
    .attr("fill-opacity", 0.15)
    .attr("d", areaGen);

  svg
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", COLORS.accent)
    .attr("stroke-width", 2.5)
    .attr("d", lorenzLine);

  // Gini label
  svg
    .append("text")
    .attr("x", width * 0.55)
    .attr("y", height * 0.6)
    .attr("fill", COLORS.accent)
    .attr("font-size", "16px")
    .attr("font-weight", "700")
    .text("Gini = 0.862");
}
