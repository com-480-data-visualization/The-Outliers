# Milestone 2 - Crowded Orbit

## Project Goal

Crowded Orbit is a scrollytelling website that reveals how Earth's orbit transformed from an empty frontier into a crowded, unequal infrastructure. The user scrolls through a guided narrative that progressively answers three questions: how fast did orbit fill up, who controls it, and where does the congestion concentrate. After the guided story, the site opens into free exploration where users can filter by country, purpose, and orbit type.

## Visualization Sketches

**Section 1: Timeline (Scrollytelling)**
The opening section pairs a scroll-driven narrative on the left with a cumulative area chart on the right. As the user scrolls, the chart animates from 1974 to 2022, revealing the dramatic acceleration after 2019 when mega-constellations began launching.

![Timeline wireframe](../../img/wireframes/01_timeline.png)

**Section 2: World Map (Country Ownership)**
An interactive choropleth or proportional symbol map shows which countries operate the most satellites. Clicking a country opens a tooltip with its satellite count, top operator, and primary purpose.

![World map wireframe](../../img/wireframes/02_worldmap.png)

**Section 3: Orbital Structure (Interactive Scatter)**
An altitude vs. inclination scatter plot reveals the physical structure of orbital space. Filter chips let users toggle LEO, MEO, GEO, and Elliptical orbits. Annotations highlight key clusters (Starlink, sun-synchronous, GPS/Galileo, the GEO belt).

![Orbital structure wireframe](../../img/wireframes/03_orbital.png)

**Section 4: Purpose Breakdown (Stacked Bar)**
A stacked horizontal bar chart shows how satellite purposes distribute across orbital classes. Hovering a bar reveals a tooltip with counts and context.

![Purpose breakdown wireframe](../../img/wireframes/04_purpose.png)

**Section 5: Operator Concentration (Bar + Lorenz Curve)**
A bar chart of the top operators sits alongside a Lorenz curve quantifying ownership inequality. The Gini coefficient (0.862) is displayed as a key narrative moment.

![Operator concentration wireframe](../../img/wireframes/05_concentration.png)

## Tools and Lectures

| Visualization | Tools | Relevant Lectures |
|---|---|---|
| Scrollytelling timeline | D3.js transitions, Scrollama.js | L4 (D3.js), L5 (Interaction, filtering) |
| World map | D3-geo, TopoJSON | L8 (Maps) |
| Orbital scatter | D3.js SVG, custom scales | L4 (D3.js), L6 (Perception, marks and channels) |
| Purpose stacked bar | D3.js stacked bar | L5 (Interaction, filtering, aggregation) |
| Operator concentration | D3.js bar + line chart | L6 (Perception), L11 (Tabular data) |

**Additional libraries:** Scrollama.js (scroll detection), TopoJSON (map data), D3-scale-chromatic (color palettes).

## Core Visualization (MVP)

These pieces form the minimal viable product that delivers the project narrative:

- Scrollytelling timeline showing the acceleration of satellite launches over time
- World map with satellite counts per country (choropleth or proportional symbols)
- Orbit class distribution (bar chart or simple layered view)
- Purpose breakdown by orbital class (stacked bar)

## Extra Ideas (Can Be Dropped)

These features would enhance the experience but are not required for the story to work:

- 3D globe using Three.js instead of a 2D map
- Animated orbital shell with individual satellite dots orbiting
- Lorenz curve with animated Gini coefficient calculation
- Country comparison mode (select two countries side by side)
- Search and filter by individual satellite name

## Functional Prototype

The initial website skeleton is available in the [`website/`](../../website/) folder. It includes:

- A scrollytelling structure using Scrollama.js with section triggers
- The timeline visualization (cumulative launches) as the first working D3 chart
- A dark space-themed design
- Placeholder sections for the remaining visualizations
- Data loaded from a preprocessed JSON export of the EDA notebook

To run locally:
```
cd website
python -m http.server 8080
```
Then open `http://localhost:8080`.
