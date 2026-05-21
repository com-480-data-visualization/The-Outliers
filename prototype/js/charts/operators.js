/**
 * charts/operators.js — Top-10 operators bar chart with deep-dive drawer.
 *
 * Renders a horizontal bar chart of the ten largest operators (Chapter 2).
 * Each bar is clickable; clicking opens a side drawer with that operator's
 * launch timeline (cumulative sparkline), orbit-class mix, purpose mix,
 * primary country and KPIs. The drawer closes via its close button, the
 * dim scrim, or the Escape key.
 *
 * Data: `top_operators` (list of {operator, count}) drives the bar chart;
 *       `operator_details` (dict keyed by operator name) drives the drawer.
 *
 * Lectures: 5 (interaction, linked views), 6 (mark & channel),
 *           7 (designing viz).
 */

function drawOperatorsChart(topOperators, operatorDetails) {
  const container = d3.select("#operators-chart");
  if (container.empty()) return;

  const TOTAL_SATS = 6713; // for the "% of all active" KPI in the drawer

  const margin = { top: 12, right: 70, bottom: 12, left: 130 };
  const width = 900 - margin.left - margin.right;
  const rowH = 30;
  const height = topOperators.length * rowH;

  const svg = container
    .append("svg")
    .attr(
      "viewBox",
      `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`,
    )
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(topOperators, (d) => d.count)])
    .range([0, width]);

  const y = d3
    .scaleBand()
    .domain(topOperators.map((d) => d.operator))
    .range([0, height])
    .padding(0.3);

  svg
    .append("g")
    .attr("class", "grid")
    .call(d3.axisBottom(x).ticks(5).tickSize(height).tickFormat(""));

  // Bars (clickable). SpaceX (the leader) gets the accent colour, matching
  // the convention used by the countries chart for "the dominant entry".
  svg
    .selectAll(".op-bar")
    .data(topOperators)
    .join("rect")
    .attr("class", "op-bar")
    .attr("role", "button")
    .attr("tabindex", 0)
    .attr("aria-label", (d) => `Open ${d.operator} deep dive, ${d.count.toLocaleString()} satellites`)
    .attr("y", (d) => y(d.operator))
    .attr("height", y.bandwidth())
    .attr("x", 0)
    .attr("width", 0)
    .attr("fill", (d, i) => (i === 0 ? COLORS.accent : COLORS.main))
    .attr("fill-opacity", 0.85)
    .attr("rx", 4)
    .on("click", (event, d) => openOperatorDrawer(d, operatorDetails, TOTAL_SATS))
    .on("keydown", function (event, d) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openOperatorDrawer(d, operatorDetails, TOTAL_SATS);
      }
    })
    .transition()
    .duration(700)
    .delay((d, i) => i * 50)
    .attr("width", (d) => x(d.count));

  // Count labels at the end of each bar
  svg
    .selectAll(".op-count")
    .data(topOperators)
    .join("text")
    .attr("class", "bar-label")
    .attr("x", (d) => x(d.count) + 6)
    .attr("y", (d) => y(d.operator) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("fill", "#9ba3b5")
    .attr("font-size", "11px")
    .text((d) => d.count.toLocaleString());

  // Operator names on the y-axis. Made clickable too so the entire row
  // (label + bar) feels selectable.
  svg
    .append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickSize(0))
    .selectAll("text")
    .attr("class", "op-label")
    .style("cursor", "pointer")
    .on("click", (event, name) => {
      const op = topOperators.find((o) => o.operator === name);
      if (op) openOperatorDrawer(op, operatorDetails, TOTAL_SATS);
    });

  svg.select(".axis").select(".domain").remove();
}

/* =========================================================
   Deep-dive drawer
   ========================================================= */

function openOperatorDrawer(opSummary, operatorDetails, totalSats) {
  const drawer = document.getElementById("operator-drawer");
  if (!drawer) return;
  const detail = operatorDetails[opSummary.operator];
  if (!detail) return;

  // Header
  document.getElementById("op-drawer-title").textContent = detail.name;
  document.getElementById("op-drawer-country").textContent =
    detail.country || "Unknown";
  const years =
    detail.first_launch && detail.latest_launch
      ? detail.first_launch === detail.latest_launch
        ? `${detail.first_launch}`
        : `${detail.first_launch} → ${detail.latest_launch}`
      : "—";
  document.getElementById("op-drawer-years").textContent = years;

  // KPIs
  document.getElementById("op-drawer-count").textContent =
    detail.count.toLocaleString();
  const pct = ((detail.count / totalSats) * 100).toFixed(1);
  document.getElementById("op-drawer-pct").textContent = `${pct}%`;
  document.getElementById("op-drawer-orbits").textContent = String(
    (detail.orbit_distribution || []).length,
  );

  // Charts inside the drawer (each replaces previous contents)
  renderSparkline(detail.launch_timeline);
  renderBarRows(
    "op-drawer-orbit-bars",
    detail.orbit_distribution,
    "orbit",
    (k) => COLORS[k] || COLORS.main,
  );
  renderBarRows(
    "op-drawer-purpose-bars",
    detail.purpose_distribution,
    "purpose",
    (k) => PURPOSE_COLORS[k] || "#666",
  );

  // Open with animation and focus management
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  const panel = drawer.querySelector(".op-drawer-panel");
  if (panel) panel.focus();
  // Lock the underlying page scroll. If Lenis is running, stop() pauses
  // its rAF loop; otherwise fall back to native overflow:hidden.
  if (window.lenis && typeof window.lenis.stop === "function") {
    window.lenis.stop();
  } else {
    document.body.style.overflow = "hidden";
  }
}

function closeOperatorDrawer() {
  const drawer = document.getElementById("operator-drawer");
  if (!drawer) return;
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  if (window.lenis && typeof window.lenis.start === "function") {
    window.lenis.start();
  } else {
    document.body.style.overflow = "";
  }
}

/* Mini cumulative-launches sparkline rendered inside the drawer. */
function renderSparkline(timeline) {
  const host = d3.select("#op-drawer-timeline");
  host.selectAll("*").remove();
  if (!timeline || !timeline.length) {
    host.append("p").attr("class", "viz-note").text("No launch data.");
    return;
  }

  const margin = { top: 12, right: 12, bottom: 22, left: 36 };
  const W = 380;
  const H = 130;
  const w = W - margin.left - margin.right;
  const h = H - margin.top - margin.bottom;

  const svg = host
    .append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleLinear()
    .domain(d3.extent(timeline, (d) => d.year))
    .range([0, w]);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(timeline, (d) => d.cumulative)])
    .nice()
    .range([h, 0]);

  // Area + line
  svg
    .append("path")
    .datum(timeline)
    .attr("fill", COLORS.main)
    .attr("fill-opacity", 0.18)
    .attr(
      "d",
      d3
        .area()
        .x((d) => x(d.year))
        .y0(h)
        .y1((d) => y(d.cumulative))
        .curve(d3.curveMonotoneX),
    );

  svg
    .append("path")
    .datum(timeline)
    .attr("fill", "none")
    .attr("stroke", COLORS.main)
    .attr("stroke-width", 2)
    .attr(
      "d",
      d3
        .line()
        .x((d) => x(d.year))
        .y((d) => y(d.cumulative))
        .curve(d3.curveMonotoneX),
    );

  // Last-point marker + label so the user immediately reads the final total
  const last = timeline[timeline.length - 1];
  svg
    .append("circle")
    .attr("cx", x(last.year))
    .attr("cy", y(last.cumulative))
    .attr("r", 4)
    .attr("fill", COLORS.accent)
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5);

  // Axes
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${h})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(Math.min(4, timeline.length))
        .tickFormat(d3.format("d")),
    );
  svg
    .append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(3).tickFormat((d) => d.toLocaleString()));
}

/* Horizontal stacked-style mini bars. Used for orbit and purpose mixes. */
function renderBarRows(hostId, rows, kind, colorFn) {
  const host = document.getElementById(hostId);
  if (!host) return;
  host.innerHTML = "";
  if (!rows || !rows.length) {
    const empty = document.createElement("p");
    empty.className = "viz-note";
    empty.textContent = "No data.";
    host.appendChild(empty);
    return;
  }
  const max = d3.max(rows, (r) => r.count) || 1;
  rows.forEach((r) => {
    const label = kind === "orbit" ? r.orbit : r.purpose;
    const value = r.count;
    const pct = (value / max) * 100;

    const row = document.createElement("div");
    row.className = "op-bar-row";
    row.innerHTML = `
      <span class="op-bar-row-label">${label}</span>
      <div class="op-bar-row-track">
        <div class="op-bar-row-fill" style="width:${pct.toFixed(1)}%;background:${colorFn(label)};"></div>
      </div>
      <span class="op-bar-row-value">${value.toLocaleString()}</span>
    `;
    host.appendChild(row);
  });
}

/* Drawer close handlers — attached once, on DOM ready. */
function initOperatorDrawer() {
  const drawer = document.getElementById("operator-drawer");
  if (!drawer) return;
  drawer.querySelectorAll("[data-op-close]").forEach((el) => {
    el.addEventListener("click", closeOperatorDrawer);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("is-open")) {
      closeOperatorDrawer();
    }
  });
}

// Auto-init on script load (idempotent)
if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOperatorDrawer);
  } else {
    initOperatorDrawer();
  }
}
