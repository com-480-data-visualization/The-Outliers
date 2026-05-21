/**
 * charts/future.js — Chapter 4 "The Next Decade" projection chart.
 *
 * Two horizontal stacked bars rendered on the same X-scale so their
 * lengths are directly comparable:
 *   1. Operational satellites as of January 2023 (the dataset snapshot).
 *   2. Filings logged with regulators for deployment by ~2030.
 *
 * The 2030 bar dwarfs the 2023 one (~12×) which is the entire point. A
 * soft pulsing glow on the 2023 bar marks "you are here" so the reader
 * does not miss it next to the much longer 2030 bar.
 *
 * Numbers sourced from publicly filed paperwork as of late 2024:
 *   Starlink: 42,000 (FCC: 12,000 Gen1 + 30,000 Gen2)
 *   China (Guowang + Qianfan): 26,992 (ITU filings)
 *   OneWeb Gen2: 6,372 (UK Space Agency filings)
 *   Project Kuiper (Amazon): 3,236 (FCC)
 *   Other small constellations (AST SpaceMobile, Telesat, etc.): ~3,200
 *
 * Lectures: 6 (mark & channel — bar length encodes count), 7 (designing
 * viz), 12 (storytelling — closing the narrative arc).
 */

const FUTURE_DATA = {
  current: {
    label: "Operational, January 2023",
    total: 6713,
    segments: [
      { family: "Starlink", count: 3395, color: "#1a73e8" },
      { family: "OneWeb", count: 502, color: "#e8710a" },
      { family: "Other", count: 2816, color: "#5b6478" },
    ],
  },
  projected: {
    label: "Filed with regulators, by ~2030",
    total: 81841,
    segments: [
      { family: "Starlink Gen1 + Gen2", count: 42000, color: "#1a73e8" },
      { family: "China (Guowang + Qianfan)", count: 26992, color: "#34a853" },
      { family: "OneWeb Gen2", count: 6372, color: "#e8710a" },
      { family: "Project Kuiper (Amazon)", count: 3236, color: "#9334e6" },
      { family: "Other small constellations", count: 3241, color: "#5b6478" },
    ],
  },
};

function drawFutureChart() {
  const container = d3.select("#future-chart");
  if (container.empty()) return;

  const VIEW_W = 960;
  const VIEW_H = 320;
  const margin = { top: 36, right: 24, bottom: 110, left: 24 };
  const innerW = VIEW_W - margin.left - margin.right;
  const innerH = VIEW_H - margin.top - margin.bottom;

  // Stacked-bar rows. Top row is the 2023 actuals (small); bottom row is
  // the 2030 filings (large, sets the scale).
  const ROW_H = 46;
  const ROW_GAP = 38;
  const labelOffset = 22;
  const row1Y = labelOffset;
  const row2Y = row1Y + ROW_H + ROW_GAP + labelOffset;

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${VIEW_W} ${VIEW_H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Shared X scale across both bars — that's what makes the length
  // comparison honest. Domain is the LARGER total, so the 2023 bar comes
  // out at ~8% of the visible width.
  const x = d3
    .scaleLinear()
    .domain([0, FUTURE_DATA.projected.total])
    .range([0, innerW]);

  const tip = ensureTooltip();

  function drawBar(rowData, yTop, rowKey) {
    // Row label
    svg
      .append("text")
      .attr("x", 0)
      .attr("y", yTop - 8)
      .attr("fill", "#9ba3b5")
      .attr("font-size", 12)
      .attr("font-family", "Inter, sans-serif")
      .attr("letter-spacing", "0.04em")
      .attr("text-transform", "uppercase")
      .text(rowData.label.toUpperCase());

    // Row total (right-aligned)
    svg
      .append("text")
      .attr("x", innerW)
      .attr("y", yTop - 8)
      .attr("text-anchor", "end")
      .attr("fill", "#e8eaf0")
      .attr("font-size", 13)
      .attr("font-family", "Space Grotesk, sans-serif")
      .attr("font-weight", 700)
      .text(`${rowData.total.toLocaleString()} satellites`);

    // Faint track behind the bar so the user sees the full domain
    svg
      .append("rect")
      .attr("x", 0)
      .attr("y", yTop)
      .attr("width", innerW)
      .attr("height", ROW_H)
      .attr("rx", 8)
      .attr("fill", "rgba(255,255,255,0.03)")
      .attr("stroke", "rgba(255,255,255,0.06)");

    // Stacked segments
    let xCursor = 0;
    const rowGroup = svg
      .append("g")
      .attr("class", rowKey === "current" ? "future-now-glow" : "");

    rowData.segments.forEach((seg) => {
      const segW = x(seg.count);
      const segG = rowGroup.append("g");

      segG
        .append("rect")
        .attr("x", xCursor)
        .attr("y", yTop)
        .attr("width", 0)
        .attr("height", ROW_H)
        .attr("rx", 8)
        .attr("fill", seg.color)
        .attr("fill-opacity", 0.88)
        .attr("stroke", seg.color)
        .attr("stroke-width", 1)
        .on("mouseenter", function (event) {
          d3.select(this).attr("fill-opacity", 1);
          const pct = ((seg.count / rowData.total) * 100).toFixed(1);
          tip
            .html(
              `<strong>${seg.family}</strong><br>` +
                `${seg.count.toLocaleString()} satellites<br>` +
                `<span style="color:#9ba3b5;">${pct}% of ${rowKey === "current" ? "today" : "2030 filings"}</span>`,
            )
            .style("left", event.clientX + 12 + "px")
            .style("top", event.clientY - 30 + "px")
            .style("opacity", 1);
        })
        .on("mouseleave", function () {
          d3.select(this).attr("fill-opacity", 0.88);
          tip.style("opacity", 0);
        })
        .transition()
        .duration(900)
        .delay(rowKey === "current" ? 0 : 700)
        .ease(d3.easeCubicOut)
        .attr("width", segW);

      // Inline label if the segment is wide enough to fit one
      if (segW > 110) {
        segG
          .append("text")
          .attr("x", xCursor + 10)
          .attr("y", yTop + ROW_H / 2 + 4)
          .attr("fill", "#fff")
          .attr("font-size", 12)
          .attr("font-family", "Inter, sans-serif")
          .attr("font-weight", 600)
          .attr("opacity", 0)
          .text(`${seg.family} · ${seg.count.toLocaleString()}`)
          .transition()
          .duration(500)
          .delay(rowKey === "current" ? 600 : 1400)
          .attr("opacity", 1);
      }

      xCursor += segW;
    });
  }

  drawBar(FUTURE_DATA.current, row1Y, "current");
  drawBar(FUTURE_DATA.projected, row2Y, "projected");

  // Legend below the bars — only the projected segments, since current
  // shares the same colors but a sparser set.
  const legendY = row2Y + ROW_H + 28;
  const legend = svg
    .append("g")
    .attr("transform", `translate(0, ${legendY})`);

  const legendSpacing = innerW / FUTURE_DATA.projected.segments.length;
  FUTURE_DATA.projected.segments.forEach((seg, i) => {
    const g = legend
      .append("g")
      .attr("transform", `translate(${i * legendSpacing}, 0)`);
    g.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("rx", 2)
      .attr("fill", seg.color);
    g.append("text")
      .attr("x", 18)
      .attr("y", 10)
      .attr("fill", "#9ba3b5")
      .attr("font-size", 11)
      .attr("font-family", "Inter, sans-serif")
      .text(seg.family);
  });
}
