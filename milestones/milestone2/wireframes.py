"""
Generate wireframe mockups for Milestone 2 document.
Each wireframe is a schematic sketch of a planned visualization.
"""
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import numpy as np
import os

os.makedirs("../img/wireframes", exist_ok=True)

# Shared style
DARK_BG = "#0d1117"
CARD_BG = "#161b22"
ACCENT = "#1a73e8"
ACCENT2 = "#e8710a"
GREEN = "#34a853"
PURPLE = "#9334e6"
TEXT = "#c9d1d9"
MUTED = "#8b949e"


def setup_ax(ax, title=""):
    ax.set_facecolor(CARD_BG)
    ax.tick_params(colors=MUTED, labelsize=8)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["bottom"].set_color(MUTED)
    ax.spines["left"].set_color(MUTED)
    if title:
        ax.set_title(title, color=TEXT, fontsize=11, fontweight="bold", pad=10)


# ============================================================
# 1. HERO + SCROLLYTELLING TIMELINE
# ============================================================
fig = plt.figure(figsize=(10, 6), facecolor=DARK_BG)

# Simulate the scroll layout: left = narrative text, right = chart
gs = fig.add_gridspec(1, 2, width_ratios=[1, 2], wspace=0.05)

# Left: narrative column
ax_text = fig.add_subplot(gs[0])
ax_text.set_facecolor(DARK_BG)
ax_text.set_xlim(0, 1)
ax_text.set_ylim(0, 1)
ax_text.axis("off")

# Simulated scroll text blocks
scroll_texts = [
    "In 1974, only a\nhandful of satellites\norbited Earth...",
    "By 2010, the number\nhad grown steadily\nto ~1,000...",
    "Then in 2019,\nmega-constellations\nchanged everything.",
]
for i, txt in enumerate(scroll_texts):
    y = 0.78 - i * 0.32
    alpha = 1.0 if i == 2 else 0.35
    ax_text.text(0.1, y, txt, color=TEXT, fontsize=9, alpha=alpha,
                 va="top", linespacing=1.5)

ax_text.text(0.1, 0.95, "SCROLL NARRATIVE", color=MUTED, fontsize=7,
             fontweight="bold", alpha=0.6)

# Right: cumulative chart
ax_chart = fig.add_subplot(gs[1])
setup_ax(ax_chart, "Cumulative Operational Satellites")

x = np.arange(1974, 2023)
y = np.concatenate([
    np.linspace(20, 200, 15),
    np.linspace(200, 800, 15),
    np.linspace(800, 1200, 9),
    np.linspace(1200, 6700, 10),
])
ax_chart.fill_between(x, y, color=ACCENT, alpha=0.2)
ax_chart.plot(x, y, color=ACCENT, linewidth=2)
ax_chart.axvline(x=2019, color=ACCENT2, linestyle="--", linewidth=1, alpha=0.7)
ax_chart.text(2019.5, 5500, "Starlink\nbegins", color=ACCENT2, fontsize=8, fontweight="bold")
ax_chart.set_xlabel("Year", color=MUTED, fontsize=9)
ax_chart.set_ylabel("Satellites", color=MUTED, fontsize=9)

# Scroll indicator
ax_chart.annotate("", xy=(0.02, 0.15), xytext=(0.02, 0.3),
                  xycoords="axes fraction", textcoords="axes fraction",
                  arrowprops=dict(arrowstyle="->", color=MUTED, lw=1.5))
ax_chart.text(0.02, 0.32, "scroll", transform=ax_chart.transAxes,
              color=MUTED, fontsize=7, ha="center")

fig.suptitle("Section 1: Timeline (Scrollytelling)", color=TEXT, fontsize=13,
             fontweight="bold", y=0.98)
plt.savefig("../img/wireframes/01_timeline.png", bbox_inches="tight",
            facecolor=DARK_BG, dpi=150)
plt.close()


# ============================================================
# 2. WORLD MAP
# ============================================================
fig, ax = plt.subplots(figsize=(10, 5.5), facecolor=DARK_BG)
ax.set_facecolor(DARK_BG)
ax.axis("off")

# Simplified world outline (rectangular projection mockup)
from matplotlib.patches import Ellipse

# Draw a rough world outline
world = Ellipse((0.5, 0.45), 0.85, 0.6, fill=False, edgecolor=MUTED,
                linewidth=1, linestyle="--", transform=ax.transAxes)
ax.add_patch(world)

# Simulated country hotspots with varying sizes
hotspots = [
    (0.27, 0.55, 45, ACCENT, "USA"),       # North America
    (0.52, 0.55, 15, GREEN, "UK"),          # Europe
    (0.70, 0.48, 22, ACCENT2, "China"),     # East Asia
    (0.60, 0.35, 8, PURPLE, "India"),       # South Asia
    (0.48, 0.60, 10, GREEN, "EU"),          # Central Europe
    (0.75, 0.30, 6, MUTED, "Japan"),        # Japan
]
for x, y, size, color, label in hotspots:
    ax.scatter(x, y, s=size*20, c=color, alpha=0.6, transform=ax.transAxes,
               edgecolors="white", linewidths=0.5)
    ax.text(x, y - 0.05, label, color=TEXT, fontsize=7, ha="center",
            transform=ax.transAxes, alpha=0.8)

# Legend
ax.text(0.05, 0.12, "Circle size = number of satellites", color=MUTED,
        fontsize=8, transform=ax.transAxes)
ax.text(0.05, 0.06, "Click a country to explore its satellites",
        color=MUTED, fontsize=8, transform=ax.transAxes, style="italic")

# Tooltip mockup
tooltip_box = FancyBboxPatch((0.72, 0.65), 0.22, 0.22, boxstyle="round,pad=0.02",
                              facecolor=CARD_BG, edgecolor=ACCENT, linewidth=1,
                              transform=ax.transAxes)
ax.add_patch(tooltip_box)
ax.text(0.73, 0.83, "United States", color=TEXT, fontsize=9, fontweight="bold",
        transform=ax.transAxes)
ax.text(0.73, 0.78, "4,511 satellites (67.1%)", color=ACCENT, fontsize=8,
        transform=ax.transAxes)
ax.text(0.73, 0.73, "Top: SpaceX (3,349)", color=MUTED, fontsize=7,
        transform=ax.transAxes)
ax.text(0.73, 0.69, "Main: Communications", color=MUTED, fontsize=7,
        transform=ax.transAxes)

fig.suptitle("Section 2: World Map (Country Satellite Ownership)", color=TEXT,
             fontsize=13, fontweight="bold", y=0.98)
plt.savefig("../img/wireframes/02_worldmap.png", bbox_inches="tight",
            facecolor=DARK_BG, dpi=150)
plt.close()


# ============================================================
# 3. ORBITAL STRUCTURE
# ============================================================
fig, ax = plt.subplots(figsize=(10, 6), facecolor=DARK_BG)
setup_ax(ax, "Orbital Structure: Altitude vs. Inclination")

# Simulate clusters
np.random.seed(42)
# Starlink cluster
n1 = 300
x1 = np.random.normal(53, 2, n1)
y1 = np.random.normal(530, 20, n1)
ax.scatter(x1, y1, s=3, c=ACCENT, alpha=0.3, edgecolors="none")

# Sun-sync cluster
n2 = 150
x2 = np.random.normal(97, 2, n2)
y2 = np.random.normal(600, 80, n2)
ax.scatter(x2, y2, s=3, c=ACCENT, alpha=0.3, edgecolors="none")

# OneWeb
n3 = 40
x3 = np.random.normal(88, 1, n3)
y3 = np.random.normal(1200, 30, n3)
ax.scatter(x3, y3, s=5, c=GREEN, alpha=0.4, edgecolors="none")

# GEO band
n4 = 60
x4 = np.random.uniform(0, 15, n4)
y4 = np.random.normal(35786, 50, n4)
ax.scatter(x4, y4, s=8, c=GREEN, alpha=0.5, edgecolors="none")

# MEO (GPS)
n5 = 30
x5 = np.random.normal(55, 3, n5)
y5 = np.random.normal(20200, 200, n5)
ax.scatter(x5, y5, s=8, c=ACCENT2, alpha=0.5, edgecolors="none")

# Annotations
bbox = dict(boxstyle="round,pad=0.3", facecolor=CARD_BG, edgecolor="none", alpha=0.9)
ax.annotate("Starlink\n~530 km", xy=(53, 530), fontsize=9, fontweight="bold",
            color=ACCENT2, xytext=(20, 1500),
            arrowprops=dict(arrowstyle="->", color=ACCENT2, lw=1), bbox=bbox)
ax.annotate("GEO belt\n~35,786 km", xy=(7, 35786), fontsize=9, fontweight="bold",
            color=GREEN, xytext=(30, 10000),
            arrowprops=dict(arrowstyle="->", color=GREEN, lw=1), bbox=bbox)
ax.annotate("GPS/Galileo\n~20,200 km", xy=(55, 20200), fontsize=9, fontweight="bold",
            color=ACCENT2, xytext=(75, 25000),
            arrowprops=dict(arrowstyle="->", color=ACCENT2, lw=1), bbox=bbox)

# Orbit band shading
ax.axhspan(160, 2000, alpha=0.05, color=ACCENT)
ax.text(105, 1000, "LEO", color=ACCENT, fontsize=9, fontweight="bold", alpha=0.7)
ax.axhspan(2000, 35000, alpha=0.03, color=ACCENT2)
ax.text(105, 15000, "MEO", color=ACCENT2, fontsize=9, fontweight="bold", alpha=0.7)

ax.set_xlabel("Inclination (degrees)", color=MUTED, fontsize=9)
ax.set_ylabel("Altitude (km)", color=MUTED, fontsize=9)
ax.set_xlim(-5, 115)
ax.set_ylim(100, 45000)
ax.set_yscale("log")

# Filter chips mockup
for i, (label, col) in enumerate([("LEO", ACCENT), ("MEO", ACCENT2),
                                    ("GEO", GREEN), ("Elliptical", PURPLE)]):
    chip = FancyBboxPatch((0.02 + i*0.12, 1.10), 0.10, 0.05,
                           boxstyle="round,pad=0.01", facecolor=col, alpha=0.3,
                           edgecolor=col, linewidth=1, transform=ax.transAxes,
                           clip_on=False)
    ax.add_patch(chip)
    ax.text(0.07 + i*0.12, 1.125, label, color=TEXT, fontsize=7,
            ha="center", transform=ax.transAxes, fontweight="bold",
            clip_on=False)

fig.suptitle("Section 3: Orbital Structure (Interactive Scatter)", color=TEXT,
             fontsize=13, fontweight="bold", y=1.05)
plt.savefig("../img/wireframes/03_orbital.png", bbox_inches="tight",
            facecolor=DARK_BG, dpi=150)
plt.close()


# ============================================================
# 4. PURPOSE BREAKDOWN
# ============================================================
fig, ax = plt.subplots(figsize=(10, 5.5), facecolor=DARK_BG)
setup_ax(ax, "")

purposes = ["Communications", "Earth Obs.", "Tech Dev.", "Navigation",
            "Space Science", "Other"]
leo_vals = [4200, 1100, 360, 30, 80, 50]
meo_vals = [0, 0, 0, 130, 5, 5]
geo_vals = [560, 10, 5, 0, 15, 10]

y_pos = np.arange(len(purposes))
bars1 = ax.barh(y_pos, leo_vals, height=0.5, color=ACCENT, alpha=0.8, label="LEO")
bars2 = ax.barh(y_pos, meo_vals, height=0.5, left=leo_vals, color=ACCENT2, alpha=0.8, label="MEO")
left2 = [l + m for l, m in zip(leo_vals, meo_vals)]
bars3 = ax.barh(y_pos, geo_vals, height=0.5, left=left2, color=GREEN, alpha=0.8, label="GEO")

ax.set_yticks(y_pos)
ax.set_yticklabels(purposes, color=TEXT, fontsize=9)
ax.set_xlabel("Number of satellites", color=MUTED, fontsize=9)
ax.legend(facecolor=CARD_BG, edgecolor=MUTED, labelcolor=TEXT, fontsize=8)

# Hover tooltip mockup
tooltip = FancyBboxPatch((0.55, 0.7), 0.25, 0.2, boxstyle="round,pad=0.02",
                          facecolor=CARD_BG, edgecolor=ACCENT, linewidth=1,
                          transform=ax.transAxes)
ax.add_patch(tooltip)
ax.text(0.56, 0.86, "Communications", color=TEXT, fontsize=9,
        fontweight="bold", transform=ax.transAxes)
ax.text(0.56, 0.81, "LEO: 4,200 | GEO: 560", color=ACCENT, fontsize=8,
        transform=ax.transAxes)
ax.text(0.56, 0.76, "71.8% of all satellites", color=MUTED, fontsize=7,
        transform=ax.transAxes)
ax.text(0.56, 0.72, "Driven by Starlink, OneWeb", color=MUTED, fontsize=7,
        transform=ax.transAxes)

fig.suptitle("Section 4: Purpose Breakdown (Stacked Bar)", color=TEXT,
             fontsize=13, fontweight="bold", y=0.98)
plt.savefig("../img/wireframes/04_purpose.png", bbox_inches="tight",
            facecolor=DARK_BG, dpi=150)
plt.close()


# ============================================================
# 5. OPERATOR CONCENTRATION
# ============================================================
fig = plt.figure(figsize=(10, 5.5), facecolor=DARK_BG)
gs = fig.add_gridspec(1, 2, width_ratios=[1.3, 1], wspace=0.3)

# Left: top operators bar chart
ax1 = fig.add_subplot(gs[0])
setup_ax(ax1, "Top Operators")

operators = ["SpaceX", "OneWeb", "Planet Labs", "Spire Global",
             "SES", "Iridium", "ISRO", "Boeing"]
counts = [3349, 542, 211, 170, 68, 66, 58, 45]

bars = ax1.barh(range(len(operators)), counts, color=ACCENT, alpha=0.8, height=0.6)
bars[0].set_color(ACCENT2)
ax1.set_yticks(range(len(operators)))
ax1.set_yticklabels(operators[::-1], color=TEXT, fontsize=8)
counts_rev = counts[::-1]
ax1.invert_yaxis()
ax1.set_xlabel("Satellites", color=MUTED, fontsize=9)

for bar, val in zip(bars, counts):
    ax1.text(bar.get_width() + 30, bar.get_y() + bar.get_height()/2,
             f"{val:,}", va="center", color=MUTED, fontsize=7)

# Right: Lorenz curve
ax2 = fig.add_subplot(gs[1])
setup_ax(ax2, "Ownership Inequality")

x_lorenz = np.linspace(0, 1, 100)
y_lorenz = x_lorenz ** 4.5  # approximate Gini ~0.86
ax2.plot(x_lorenz, y_lorenz, color=ACCENT, linewidth=2)
ax2.plot([0, 1], [0, 1], color=MUTED, linestyle="--", linewidth=1, alpha=0.5)
ax2.fill_between(x_lorenz, y_lorenz, x_lorenz, alpha=0.1, color=ACCENT)
ax2.set_xlabel("% of operators", color=MUTED, fontsize=9)
ax2.set_ylabel("% of satellites", color=MUTED, fontsize=9)
ax2.set_aspect("equal")

# Gini annotation
ax2.text(0.3, 0.7, "Gini = 0.862", color=ACCENT, fontsize=11,
         fontweight="bold", transform=ax2.transAxes)
ax2.text(0.3, 0.62, "Top 1% of operators\nown 50% of satellites",
         color=MUTED, fontsize=8, transform=ax2.transAxes)

fig.suptitle("Section 5: Operator Concentration", color=TEXT,
             fontsize=13, fontweight="bold", y=0.98)
plt.savefig("../img/wireframes/05_concentration.png", bbox_inches="tight",
            facecolor=DARK_BG, dpi=150)
plt.close()

print("All 5 wireframes generated in img/wireframes/")
