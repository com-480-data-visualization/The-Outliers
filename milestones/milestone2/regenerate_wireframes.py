"""
Regenerate wireframes to match the actual website visualizations.
No chapter titles on the images themselves.
"""
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Ellipse
import numpy as np
import os

os.makedirs("../../img/wireframes", exist_ok=True)

DARK_BG = "#0d1117"
CARD_BG = "#161b22"
ACCENT = "#1a73e8"
ACCENT2 = "#e8710a"
GREEN = "#34a853"
PURPLE = "#9334e6"
TEXT = "#c9d1d9"
MUTED = "#8b949e"
CYAN = "#00e5ff"

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
# 02. TOP COUNTRIES BAR + LORENZ (single combined image)
# ============================================================
fig = plt.figure(figsize=(10, 5.5), facecolor=DARK_BG)
gs = fig.add_gridspec(1, 2, width_ratios=[1.3, 1], wspace=0.3)

# Left: top countries bar chart
ax1 = fig.add_subplot(gs[0])
setup_ax(ax1, "Top 15 Countries")

countries = ["USA", "China", "UK", "Russia", "Japan", "India", "Canada",
             "Germany", "Luxembourg", "Argentina", "France", "S. Korea",
             "Spain", "Israel", "Others"]
counts = [4510, 590, 440, 200, 95, 65, 55, 45, 40, 35, 32, 28, 25, 20, 538]

bars = ax1.barh(range(len(countries)), counts, color=ACCENT, alpha=0.8, height=0.6)
bars[0].set_color(ACCENT2)
ax1.set_yticks(range(len(countries)))
ax1.set_yticklabels(countries[::-1], color=TEXT, fontsize=7)
ax1.invert_yaxis()
ax1.set_xlabel("Satellites", color=MUTED, fontsize=9)

for bar, val in zip(bars, counts):
    ax1.text(bar.get_width() + 20, bar.get_y() + bar.get_height()/2,
             f"{val:,}", va="center", color=MUTED, fontsize=6)

# Right: Lorenz curve
ax2 = fig.add_subplot(gs[1])
setup_ax(ax2, "Operator Inequality")

x_lorenz = np.linspace(0, 1, 100)
y_lorenz = x_lorenz ** 4.5
ax2.plot(x_lorenz, y_lorenz, color=ACCENT2, linewidth=2)
ax2.plot([0, 1], [0, 1], color=MUTED, linestyle="--", linewidth=1, alpha=0.5)
ax2.fill_between(x_lorenz, y_lorenz, x_lorenz, alpha=0.1, color=ACCENT2)
ax2.set_xlabel("% of operators", color=MUTED, fontsize=9)
ax2.set_ylabel("% of satellites", color=MUTED, fontsize=9)
ax2.set_aspect("equal")

ax2.text(0.3, 0.7, "Gini = 0.862", color=ACCENT2, fontsize=11,
         fontweight="bold", transform=ax2.transAxes)
ax2.text(0.3, 0.62, "Top 1% of operators\nown 50% of satellites",
         color=MUTED, fontsize=8, transform=ax2.transAxes)

plt.savefig("../../img/wireframes/02_countries_lorenz.png", bbox_inches="tight",
            facecolor=DARK_BG, dpi=150)
plt.close()


# ============================================================
# 03. 3D GLOBE + HEATMAP (single combined image)
# ============================================================
fig = plt.figure(figsize=(12, 6), facecolor=DARK_BG)
gs = fig.add_gridspec(1, 2, width_ratios=[1, 1], wspace=0.15)

# Left: 3D Globe mockup
ax = fig.add_subplot(gs[0])
ax.set_facecolor(DARK_BG)
ax.set_xlim(-1.5, 1.5)
ax.set_ylim(-1.4, 1.5)
ax.set_aspect("equal")
ax.axis("off")

# Earth
earth = plt.Circle((0, 0), 0.35, facecolor="#0a1628", edgecolor="#1a3a5c", linewidth=1.5)
ax.add_patch(earth)

for r, alpha in [(0.38, 0.08), (0.42, 0.05), (0.48, 0.03)]:
    glow = plt.Circle((0, 0), r, facecolor="none", edgecolor=ACCENT, linewidth=1, alpha=alpha)
    ax.add_patch(glow)

# Orbital shells
for r, label, color in [(0.55, "LEO", ACCENT), (0.85, "MEO", ACCENT2), (1.15, "GEO", GREEN)]:
    ellipse = Ellipse((0, 0), r*2, r*1.2, fill=False, edgecolor=color,
                       linewidth=0.8, linestyle="--", alpha=0.3)
    ax.add_patch(ellipse)
    ax.text(r + 0.05, 0.02, label, color=color, fontsize=8, fontweight="bold", alpha=0.7)

# Satellite dots
np.random.seed(42)
for n, r_mean, r_std, s, c, a in [(200, 0.5, 0.08, 2, ACCENT, 0.4),
                                     (20, 0.8, 0.05, 8, ACCENT2, 0.6),
                                     (40, 1.1, 0.03, 10, GREEN, 0.6)]:
    angles = np.random.uniform(0, 2*np.pi, n)
    radii = np.random.normal(r_mean, r_std, n)
    ax.scatter(radii * np.cos(angles), radii * np.sin(angles) * 0.6,
               s=s, c=c, alpha=a, edgecolors="none")

# Filter buttons
for i, (label, col) in enumerate([("All", MUTED), ("LEO", ACCENT), ("MEO", ACCENT2),
                                    ("GEO", GREEN), ("Elliptical", PURPLE)]):
    chip = FancyBboxPatch((-0.8 + i*0.35, 1.2), 0.30, 0.15,
                           boxstyle="round,pad=0.02",
                           facecolor=col if i == 0 else CARD_BG,
                           edgecolor=col, linewidth=1, alpha=0.6)
    ax.add_patch(chip)
    ax.text(-0.65 + i*0.35, 1.275, label, color=TEXT, fontsize=7, ha="center", fontweight="bold")

# Tooltip
tooltip_box = FancyBboxPatch((0.55, -1.0), 0.85, 0.55, boxstyle="round,pad=0.03",
                              facecolor=CARD_BG, edgecolor=CYAN, linewidth=1)
ax.add_patch(tooltip_box)
ax.text(0.6, -0.55, "Starlink-1060", color=TEXT, fontsize=8, fontweight="bold")
ax.text(0.6, -0.7, "LEO | 550 km", color=ACCENT, fontsize=7)
ax.text(0.6, -0.83, "Communications | USA", color=MUTED, fontsize=7)

ax.set_title("3D Globe (6,718 satellites)", color=TEXT, fontsize=10, fontweight="bold", pad=25)

# Right: Purpose x Orbit Heatmap
ax2 = fig.add_subplot(gs[1])
ax2.set_facecolor(DARK_BG)
ax2.axis("off")

from matplotlib.colors import LinearSegmentedColormap
cyan_cmap = LinearSegmentedColormap.from_list("cyan_heat",
    ["#080c12", "#091a2a", "#0c3350", "#0e5575", "#11859e", "#18b8c8", CYAN])

orbits = ["LEO", "MEO", "GEO", "Elliptical"]
purposes = ["Communications", "Earth Obs.", "Tech Dev.", "Navigation", "Space Science"]
data = np.array([
    [4314, 20, 476, 13],
    [1102, 2, 47, 16],
    [344, 1, 15, 8],
    [0, 119, 33, 2],
    [79, 0, 1, 20],
], dtype=float)

max_log = np.log10(data.max())
def cell_intensity(val):
    if val <= 0:
        return 0.0
    return np.log10(max(val, 1)) / max_log

ax2.set_xlim(-1.2, len(orbits) - 0.3)
ax2.set_ylim(len(purposes) - 0.3, -0.8)

# Column headers
for j, orb in enumerate(orbits):
    ax2.text(j, -0.5, orb, ha="center", va="center", color=TEXT, fontsize=9, fontweight="bold")

# Row labels
for i, purp in enumerate(purposes):
    ax2.text(-1.1, i, purp, ha="left", va="center", color=TEXT, fontsize=8)

cell_w, cell_h = 0.85, 0.75
for i in range(len(purposes)):
    for j in range(len(orbits)):
        val = data[i, j]
        intensity = cell_intensity(val)
        color = cyan_cmap(intensity)
        edge_alpha = 0.3 + 0.7 * intensity
        edge_color = (*plt.matplotlib.colors.to_rgb(CYAN), edge_alpha)
        cell = FancyBboxPatch((j - cell_w/2, i - cell_h/2), cell_w, cell_h,
                               boxstyle="round,pad=0.05", facecolor=color,
                               edgecolor=edge_color, linewidth=1)
        ax2.add_patch(cell)
        if val <= 0:
            display_val = "\u2014"
            txt_color = MUTED
        else:
            display_val = f"{int(val):,}"
            txt_color = "white" if intensity > 0.4 else MUTED
        ax2.text(j, i, display_val, ha="center", va="center", color=txt_color,
                fontsize=10, fontweight="bold" if val > 100 else "normal")

ax2.set_title("Purpose by Orbit (Heatmap)", color=TEXT, fontsize=10, fontweight="bold", pad=10)

plt.savefig("../../img/wireframes/03_globe_heatmap.png", bbox_inches="tight",
            facecolor=DARK_BG, dpi=150)
plt.close()

print("Wireframes 02 and 03 regenerated as single combined images.")
