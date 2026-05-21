/**
 * charts/shared.js — Colour palettes and the shared tooltip helper.
 *
 * COLORS is the project-wide brand palette plus the LEO/MEO/GEO/Elliptical
 * orbit-class colours used across every chart and the 3D globe.
 *
 * PURPOSE_COLORS maps each satellite purpose category to its visual hue.
 *
 * ensureTooltip() returns the single global tooltip <div>, creating it on
 * first call. Every chart that needs hover info reuses this one node so we
 * never accumulate orphaned tooltips in the DOM.
 *
 * Lectures: 6 (Perception, color), 7 (Designing viz).
 */

const COLORS = {
  main: "#1a73e8",
  accent: "#e8710a",
  green: "#34a853",
  purple: "#9334e6",
  LEO: "#1a73e8",
  MEO: "#e8710a",
  GEO: "#34a853",
  Elliptical: "#9334e6",
};

const PURPOSE_COLORS = {
  Communications: "#1a73e8",
  "Earth Observation": "#34a853",
  "Technology Development": "#9334e6",
  Navigation: "#e8710a",
  "Space Science": "#e84a5f",
  Other: "#666",
};

let tooltip;

function ensureTooltip() {
  if (!tooltip) {
    tooltip = d3.select("body").append("div").attr("class", "tooltip");
  }
  return tooltip;
}
