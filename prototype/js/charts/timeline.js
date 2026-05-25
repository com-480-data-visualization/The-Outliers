/**
 * charts/timeline.js — Cumulative satellite-launch timeline (Chapter 1).
 *
 * An area + line chart of the cumulative satellite count from 1974 to 2023.
 * The chart is "scrollytelling-driven": a clip-path reveal grows from left
 * to right in response to scrolly-step events, and an orange marker jumps
 * to each step's target year. A vertical hover line lets the user inspect
 * any year directly.
 *
 * Lectures: 4 (D3 basics), 5 (Interaction), 12 (Storytelling).
 */

function drawTimelineChart(data) {
  const container = d3.select("#timeline-chart");
  if (container.empty()) return;

  const rect = container.node().getBoundingClientRect();
  const margin = { top: 30, right: 30, bottom: 50, left: 70 };
  const width = rect.width - margin.left - margin.right;
  const height = 420 - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([1974, 2023]).range([0, width]);

  const y = d3.scaleLinear().domain([0, 7000]).range([height, 0]);

  // Grid lines
  svg
    .append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(6).tickSize(-width).tickFormat(""));

  // Axes
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(10));

  svg
    .append("g")
    .attr("class", "axis")
    .call(
      d3
        .axisLeft(y)
        .ticks(6)
        .tickFormat((d) => d.toLocaleString()),
    );

  // Area
  const area = d3
    .area()
    .x((d) => x(d.year))
    .y0(height)
    .y1((d) => y(d.cumulative))
    .curve(d3.curveMonotoneX);

  const areaPath = svg
    .append("path")
    .datum(data)
    .attr("fill", COLORS.main)
    .attr("fill-opacity", 0.2)
    .attr("d", area);

  // Line
  const line = d3
    .line()
    .x((d) => x(d.year))
    .y((d) => y(d.cumulative))
    .curve(d3.curveMonotoneX);

  const linePath = svg
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", COLORS.main)
    .attr("stroke-width", 3)
    .attr("d", line);

  // Annotation marker (updated by scroll steps)
  const marker = svg
    .append("circle")
    .attr("r", 6)
    .attr("fill", COLORS.accent)
    .attr("stroke", "#fff")
    .attr("stroke-width", 2)
    .style("opacity", 0);

  const markerLabel = svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr("dy", -16)
    .attr("fill", COLORS.accent)
    .attr("font-weight", 600)
    .attr("font-size", "14px")
    .style("opacity", 0);

  // Year highlights for each scroll step
  const stepYears = {
    1: 1974,
    2: 1998,
    3: 2018,
    4: 2021,
    5: 2023,
  };

  // Clip path for progressive reveal
  const clipRect = svg
    .append("defs")
    .append("clipPath")
    .attr("id", "timeline-clip")
    .append("rect")
    .attr("y", 0)
    .attr("height", height + 10)
    .attr("width", width);

  areaPath.attr("clip-path", "url(#timeline-clip)");
  linePath.attr("clip-path", "url(#timeline-clip)");

  // Last year present in the dataset. The final step's "ideal" year (2023)
  // is past the data, so we resolve any target year to the nearest row
  // at-or-before it. That way the marker lands on a real data point even
  // when the step's notional year overshoots the dataset.
  const lastRow = data[data.length - 1];

  function findRowAtOrBefore(year) {
    let best = data[0];
    for (let i = 0; i < data.length; i++) {
      if (data[i].year <= year) best = data[i];
      else break;
    }
    return best;
  }

  function updateToStep(step) {
    const targetYear = stepYears[step] || lastRow.year;
    const point = findRowAtOrBefore(targetYear);
    // Reveal the area/line up to the marker's actual location, not the
    // notional step year — otherwise the line would extend a year past
    // where the dot can sit.
    const clipWidth = x(point.year);

    clipRect
      .transition()
      .duration(800)
      .attr("width", clipWidth + 5);

    marker
      .transition()
      .duration(400)
      .attr("cx", x(point.year))
      .attr("cy", y(point.cumulative))
      .style("opacity", 1);

    markerLabel
      .transition()
      .duration(400)
      .attr("x", x(point.year))
      .attr("y", y(point.cumulative))
      .style("opacity", 1)
      .text(`${point.cumulative.toLocaleString()} satellites`);
  }

  // Listen for scroll steps
  window.addEventListener("scrolly-step", (e) => {
    updateToStep(e.detail.step);
  });

  // Start at step 1
  updateToStep(1);

  // Hover interaction
  const tip = ensureTooltip();
  const hoverLine = svg
    .append("line")
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "#555")
    .attr("stroke-dasharray", "4")
    .style("opacity", 0);

  svg
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "transparent")
    .on("mousemove", function (event) {
      const [mx] = d3.pointer(event);
      const yearHover = Math.round(x.invert(mx));
      const d = data.find((p) => p.year === yearHover);
      if (d) {
        hoverLine
          .attr("x1", x(d.year))
          .attr("x2", x(d.year))
          .style("opacity", 1);
        tip
          .html(
            `<strong>${d.year}</strong><br>${d.cumulative.toLocaleString()} satellites<br>+${d.count} that year`,
          )
          .style("left", event.clientX + 15 + "px")
          .style("top", event.clientY - 40 + "px")
          .style("opacity", 1);
      }
    })
    .on("mouseleave", function () {
      hoverLine.style("opacity", 0);
      tip.style("opacity", 0);
    });
}
