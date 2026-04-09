/**
 * charts.js — D3.js visualizations for Crowded Orbit.
 *
 * Lectures used:
 *  - Lecture 4 (D3.js basics, data-driven documents)
 *  - Lecture 5 (Interaction, transitions)
 *  - Lecture 6 (Perception, color, mark & channel)
 *  - Lecture 7 (Designing viz, do & don't)
 *  - Lecture 8 (Maps — future milestone)
 *  - Lecture 12 (Storytelling)
 */

const COLORS = {
  main: '#1a73e8',
  accent: '#e8710a',
  green: '#34a853',
  purple: '#9334e6',
  LEO: '#1a73e8',
  MEO: '#e8710a',
  GEO: '#34a853',
  Elliptical: '#9334e6',
};

const PURPOSE_COLORS = {
  Communications: '#1a73e8',
  'Earth Observation': '#34a853',
  'Technology Development': '#9334e6',
  Navigation: '#e8710a',
  'Space Science': '#e84a5f',
  Other: '#666',
};

let tooltip;

function ensureTooltip() {
  if (!tooltip) {
    tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'tooltip');
  }
  return tooltip;
}

/* ===========================================================
   1. CUMULATIVE TIMELINE CHART (Scrollytelling-driven)
   =========================================================== */

function drawTimelineChart(data) {
  const container = d3.select('#timeline-chart');
  if (container.empty()) return;

  const rect = container.node().getBoundingClientRect();
  const margin = { top: 30, right: 30, bottom: 50, left: 70 };
  const width = rect.width - margin.left - margin.right;
  const height = 420 - margin.top - margin.bottom;

  const svg = container
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([1974, 2023])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, 7000])
    .range([height, 0]);

  // Grid lines
  svg.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(y).ticks(6).tickSize(-width).tickFormat(''));

  // Axes
  svg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(10));

  svg.append('g')
    .attr('class', 'axis')
    .call(d3.axisLeft(y).ticks(6).tickFormat(d => d.toLocaleString()));

  // Area
  const area = d3.area()
    .x(d => x(d.year))
    .y0(height)
    .y1(d => y(d.cumulative))
    .curve(d3.curveMonotoneX);

  const areaPath = svg.append('path')
    .datum(data)
    .attr('fill', COLORS.main)
    .attr('fill-opacity', 0.2)
    .attr('d', area);

  // Line
  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.cumulative))
    .curve(d3.curveMonotoneX);

  const linePath = svg.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', COLORS.main)
    .attr('stroke-width', 3)
    .attr('d', line);

  // Annotation marker (updated by scroll steps)
  const marker = svg.append('circle')
    .attr('r', 6)
    .attr('fill', COLORS.accent)
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .style('opacity', 0);

  const markerLabel = svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', -16)
    .attr('fill', COLORS.accent)
    .attr('font-weight', 600)
    .attr('font-size', '14px')
    .style('opacity', 0);

  // Year highlights for each scroll step
  const stepYears = {
    1: 1974,
    2: 1998,
    3: 2018,
    4: 2021,
    5: 2023,
  };

  // Clip path for progressive reveal
  const clipRect = svg.append('defs')
    .append('clipPath')
    .attr('id', 'timeline-clip')
    .append('rect')
    .attr('y', 0)
    .attr('height', height + 10)
    .attr('width', width);

  areaPath.attr('clip-path', 'url(#timeline-clip)');
  linePath.attr('clip-path', 'url(#timeline-clip)');

  function updateToStep(step) {
    const targetYear = stepYears[step] || 2023;
    const clipWidth = x(targetYear);

    clipRect.transition()
      .duration(800)
      .attr('width', clipWidth + 5);

    const point = data.find(d => d.year === targetYear);
    if (point) {
      marker.transition().duration(400)
        .attr('cx', x(point.year))
        .attr('cy', y(point.cumulative))
        .style('opacity', 1);

      markerLabel.transition().duration(400)
        .attr('x', x(point.year))
        .attr('y', y(point.cumulative))
        .style('opacity', 1)
        .text(`${point.cumulative.toLocaleString()} satellites`);
    }
  }

  // Listen for scroll steps
  window.addEventListener('scrolly-step', (e) => {
    updateToStep(e.detail.step);
  });

  // Start at step 1
  updateToStep(1);

  // Hover interaction
  const tip = ensureTooltip();
  const hoverLine = svg.append('line')
    .attr('y1', 0).attr('y2', height)
    .attr('stroke', '#555').attr('stroke-dasharray', '4')
    .style('opacity', 0);

  svg.append('rect')
    .attr('width', width).attr('height', height)
    .attr('fill', 'transparent')
    .on('mousemove', function(event) {
      const [mx] = d3.pointer(event);
      const yearHover = Math.round(x.invert(mx));
      const d = data.find(p => p.year === yearHover);
      if (d) {
        hoverLine.attr('x1', x(d.year)).attr('x2', x(d.year)).style('opacity', 1);
        tip.html(`<strong>${d.year}</strong><br>${d.cumulative.toLocaleString()} satellites<br>+${d.count} that year`)
          .style('left', (event.clientX + 15) + 'px')
          .style('top', (event.clientY - 40) + 'px')
          .style('opacity', 1);
      }
    })
    .on('mouseleave', function() {
      hoverLine.style('opacity', 0);
      tip.style('opacity', 0);
    });
}

/* ===========================================================
   2. COUNTRIES BAR CHART
   =========================================================== */

function drawCountriesChart(data) {
  const container = d3.select('#countries-chart');
  if (container.empty()) return;

  // Filter out "Others" for the bar chart, show top 10
  const top10 = data.filter(d => d.country !== 'Others').slice(0, 10);

  const margin = { top: 10, right: 30, bottom: 20, left: 100 };
  const width = 460 - margin.left - margin.right;
  const height = 380 - margin.top - margin.bottom;

  const svg = container
    .append('svg')
    .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([0, d3.max(top10, d => d.count)])
    .range([0, width]);

  const y = d3.scaleBand()
    .domain(top10.map(d => d.country))
    .range([0, height])
    .padding(0.25);

  svg.append('g')
    .attr('class', 'grid')
    .call(d3.axisBottom(x).ticks(5).tickSize(height).tickFormat(''))
    .attr('transform', `translate(0,0)`);

  // Bars
  const tip = ensureTooltip();
  svg.selectAll('.bar')
    .data(top10)
    .join('rect')
    .attr('class', 'bar')
    .attr('y', d => y(d.country))
    .attr('height', y.bandwidth())
    .attr('x', 0)
    .attr('width', 0)
    .attr('fill', (d, i) => i === 0 ? COLORS.accent : COLORS.main)
    .attr('rx', 4)
    .on('mouseenter', function(event, d) {
      d3.select(this).attr('fill-opacity', 0.8);
      tip.html(`<strong>${d.country}</strong><br>${d.count.toLocaleString()} satellites`)
        .style('left', (event.clientX + 10) + 'px')
        .style('top', (event.clientY - 30) + 'px')
        .style('opacity', 1);
    })
    .on('mouseleave', function() {
      d3.select(this).attr('fill-opacity', 1);
      tip.style('opacity', 0);
    })
    .transition()
    .duration(800)
    .delay((d, i) => i * 60)
    .attr('width', d => x(d.count));

  // Labels
  svg.selectAll('.bar-label')
    .data(top10)
    .join('text')
    .attr('class', 'bar-label')
    .attr('x', d => x(d.count) + 6)
    .attr('y', d => y(d.country) + y.bandwidth() / 2)
    .attr('dy', '0.35em')
    .attr('fill', '#9ba3b5')
    .attr('font-size', '11px')
    .text(d => d.count.toLocaleString());

  // Y axis (country names)
  svg.append('g')
    .attr('class', 'axis')
    .call(d3.axisLeft(y).tickSize(0))
    .select('.domain').remove();
}

/* ===========================================================
   3. LORENZ CURVE
   =========================================================== */

function drawLorenzChart(data) {
  const container = d3.select('#lorenz-chart');
  if (container.empty()) return;

  const margin = { top: 20, right: 20, bottom: 50, left: 55 };
  const width = 400 - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  const svg = container
    .append('svg')
    .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([0, 100]).range([0, width]);
  const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);

  // Axes
  svg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => d + '%'));

  svg.append('g')
    .attr('class', 'axis')
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + '%'));

  // Axis labels
  svg.append('text')
    .attr('x', width / 2).attr('y', height + 40)
    .attr('text-anchor', 'middle')
    .attr('fill', '#9ba3b5').attr('font-size', '12px')
    .text('% of Operators');

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2).attr('y', -42)
    .attr('text-anchor', 'middle')
    .attr('fill', '#9ba3b5').attr('font-size', '12px')
    .text('% of Satellites');

  // Equality line
  svg.append('line')
    .attr('x1', 0).attr('y1', height)
    .attr('x2', width).attr('y2', 0)
    .attr('stroke', '#444').attr('stroke-dasharray', '6');

  // Lorenz curve
  const lorenzLine = d3.line()
    .x(d => x(d.pct_operators))
    .y(d => y(d.pct_satellites))
    .curve(d3.curveMonotoneX);

  // Shaded area between equality and Lorenz
  const areaGen = d3.area()
    .x(d => x(d.pct_operators))
    .y0(d => y(d.pct_operators))   // equality line
    .y1(d => y(d.pct_satellites))
    .curve(d3.curveMonotoneX);

  svg.append('path')
    .datum(data)
    .attr('fill', COLORS.accent)
    .attr('fill-opacity', 0.15)
    .attr('d', areaGen);

  svg.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', COLORS.accent)
    .attr('stroke-width', 2.5)
    .attr('d', lorenzLine);

  // Gini label
  svg.append('text')
    .attr('x', width * 0.55).attr('y', height * 0.6)
    .attr('fill', COLORS.accent)
    .attr('font-size', '16px')
    .attr('font-weight', '700')
    .text('Gini = 0.862');
}

/* ===========================================================
   4. ORBIT DONUT CHART
   =========================================================== */

function drawOrbitDonut(data) {
  const container = d3.select('#orbit-donut');
  if (container.empty()) return;

  const size = 320;
  const radius = size / 2;
  const inner = radius * 0.55;

  const svg = container
    .append('svg')
    .attr('viewBox', `0 0 ${size} ${size}`)
    .append('g')
    .attr('transform', `translate(${radius},${radius})`);

  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.orbit))
    .range([COLORS.LEO, COLORS.GEO, COLORS.MEO, COLORS.Elliptical]);

  const pie = d3.pie().value(d => d.count).sort(null).padAngle(0.02);
  const arc = d3.arc().innerRadius(inner).outerRadius(radius - 10);
  const arcHover = d3.arc().innerRadius(inner).outerRadius(radius - 2);

  const tip = ensureTooltip();

  svg.selectAll('path')
    .data(pie(data))
    .join('path')
    .attr('d', arc)
    .attr('fill', d => color(d.data.orbit))
    .attr('stroke', '#161b2e')
    .attr('stroke-width', 2)
    .on('mouseenter', function(event, d) {
      d3.select(this).transition().duration(150).attr('d', arcHover);
      tip.html(`<strong>${d.data.orbit}</strong><br>${d.data.count.toLocaleString()} (${d.data.pct}%)`)
        .style('left', (event.clientX + 10) + 'px')
        .style('top', (event.clientY - 30) + 'px')
        .style('opacity', 1);
    })
    .on('mouseleave', function() {
      d3.select(this).transition().duration(150).attr('d', arc);
      tip.style('opacity', 0);
    });

  // Center label
  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '-0.2em')
    .attr('fill', '#e8eaf0')
    .attr('font-size', '28px')
    .attr('font-weight', '700')
    .attr('font-family', 'Space Grotesk, sans-serif')
    .text('88.4%');

  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '1.4em')
    .attr('fill', '#9ba3b5')
    .attr('font-size', '13px')
    .text('in LEO');

  // Legend
  const legend = container.append('div')
    .style('display', 'flex')
    .style('justify-content', 'center')
    .style('gap', '20px')
    .style('margin-top', '16px')
    .style('flex-wrap', 'wrap');

  data.forEach(d => {
    const item = legend.append('span')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('gap', '6px')
      .style('font-size', '0.85rem')
      .style('color', '#9ba3b5');

    item.append('span')
      .style('width', '12px')
      .style('height', '12px')
      .style('border-radius', '3px')
      .style('background', color(d.orbit))
      .style('display', 'inline-block');

    item.append('span').text(`${d.orbit} (${d.pct}%)`);
  });
}

/* ===========================================================
   5. PURPOSE HORIZONTAL BAR CHART
   =========================================================== */

function drawPurposeChart(data) {
  const container = d3.select('#purpose-chart');
  if (container.empty()) return;

  const margin = { top: 10, right: 40, bottom: 20, left: 150 };
  const width = 460 - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  const svg = container
    .append('svg')
    .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count)])
    .range([0, width]);

  const y = d3.scaleBand()
    .domain(data.map(d => d.purpose))
    .range([0, height])
    .padding(0.3);

  const tip = ensureTooltip();

  svg.selectAll('.bar')
    .data(data)
    .join('rect')
    .attr('y', d => y(d.purpose))
    .attr('height', y.bandwidth())
    .attr('x', 0)
    .attr('width', 0)
    .attr('fill', d => PURPOSE_COLORS[d.purpose] || '#666')
    .attr('rx', 4)
    .on('mouseenter', function(event, d) {
      tip.html(`<strong>${d.purpose}</strong><br>${d.count.toLocaleString()} (${d.pct}%)`)
        .style('left', (event.clientX + 10) + 'px')
        .style('top', (event.clientY - 30) + 'px')
        .style('opacity', 1);
    })
    .on('mouseleave', function() { tip.style('opacity', 0); })
    .transition()
    .duration(800)
    .delay((d, i) => i * 80)
    .attr('width', d => x(d.count));

  svg.selectAll('.bar-label')
    .data(data)
    .join('text')
    .attr('x', d => x(d.count) + 6)
    .attr('y', d => y(d.purpose) + y.bandwidth() / 2)
    .attr('dy', '0.35em')
    .attr('fill', '#9ba3b5')
    .attr('font-size', '11px')
    .text(d => d.pct + '%');

  svg.append('g')
    .attr('class', 'axis')
    .call(d3.axisLeft(y).tickSize(0))
    .select('.domain').remove();
}

/* ===========================================================
   6. PURPOSE x ORBIT GROUPED BAR CHART
   =========================================================== */

function drawPurposeOrbitChart(data) {
  const container = d3.select('#purpose-orbit-chart');
  if (container.empty()) return;

  const orbits = ['LEO', 'MEO', 'GEO', 'Elliptical'];
  const purposes = data.map(d => d.purpose);
  const margin = { top: 40, right: 90, bottom: 20, left: 160 };
  const cellW = 140, cellH = 52;
  const width = orbits.length * cellW;
  const height = purposes.length * cellH;

  const svg = container
    .append('svg')
    .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Gather non-zero values for log color scale
  const allVals = [];
  data.forEach(d => orbits.forEach(o => { if (d[o] > 0) allVals.push(d[o]); }));

  const colorScale = d3.scaleSequentialLog()
    .domain([1, d3.max(allVals)])
    .interpolator(d3.interpolateBlues);

  const x = d3.scaleBand().domain(orbits).range([0, width]).padding(0.06);
  const y = d3.scaleBand().domain(purposes).range([0, height]).padding(0.06);

  const tip = ensureTooltip();

  // Draw cells
  data.forEach(d => {
    orbits.forEach(o => {
      const val = d[o];
      svg.append('rect')
        .attr('x', x(o)).attr('y', y(d.purpose))
        .attr('width', x.bandwidth()).attr('height', y.bandwidth())
        .attr('rx', 8)
        .attr('fill', val > 0 ? colorScale(val) : 'rgba(255,255,255,0.02)')
        .attr('stroke', 'rgba(255,255,255,0.05)')
        .attr('stroke-width', 1)
        .on('mouseenter', function(event) {
          d3.select(this).attr('stroke', '#fff').attr('stroke-width', 2);
          tip.html(`<strong>${d.purpose}</strong> in ${o}<br><span style="color:#e8710a;font-weight:700;">${val.toLocaleString()}</span> satellites`)
            .style('left', (event.clientX + 12) + 'px')
            .style('top', (event.clientY - 35) + 'px')
            .style('opacity', 1);
        })
        .on('mouseleave', function() {
          d3.select(this).attr('stroke', 'rgba(255,255,255,0.05)').attr('stroke-width', 1);
          tip.style('opacity', 0);
        });

      // Number label inside cell
      if (val > 0) {
        svg.append('text')
          .attr('x', x(o) + x.bandwidth() / 2)
          .attr('y', y(d.purpose) + y.bandwidth() / 2)
          .attr('text-anchor', 'middle').attr('dy', '0.35em')
          .attr('fill', val > 80 ? '#fff' : '#9ba3b5')
          .attr('font-size', val > 500 ? '14px' : '12px')
          .attr('font-weight', val > 500 ? '700' : '400')
          .style('pointer-events', 'none')
          .text(val.toLocaleString());
      }
    });
  });

  // Axes
  svg.append('g').attr('class', 'axis')
    .call(d3.axisLeft(y).tickSize(0)).select('.domain').remove();
  svg.append('g').attr('class', 'axis')
    .attr('transform', 'translate(0,-6)')
    .call(d3.axisTop(x).tickSize(0)).select('.domain').remove();

  // Legend
  const items = [
    { label: '4,000+', val: 4000 }, { label: '1,000', val: 1000 },
    { label: '100', val: 100 }, { label: '10', val: 10 }, { label: '1', val: 1 },
  ];
  const lg = svg.append('g').attr('transform', `translate(${width + 20}, ${height / 2 - 70})`);
  items.forEach((item, i) => {
    const g = lg.append('g').attr('transform', `translate(0,${i * 26})`);
    g.append('rect').attr('width', 14).attr('height', 14).attr('rx', 3).attr('fill', colorScale(item.val));
    g.append('text').attr('x', 20).attr('y', 11).attr('fill', '#9ba3b5').attr('font-size', '11px').text(item.label);
  });
}

/* ===========================================================
   HERO PARTICLE ANIMATION
   =========================================================== */

function drawHeroParticles() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const w = window.innerWidth;
  const h = window.innerHeight;

  const svg = d3.select(canvas)
    .append('svg')
    .attr('width', w)
    .attr('height', h);

  // Create orbiting dots to represent satellites
  const nParticles = 80;
  const particles = d3.range(nParticles).map(() => ({
    cx: w / 2,
    cy: h / 2,
    r: 150 + Math.random() * Math.min(w, h) * 0.35,
    angle: Math.random() * Math.PI * 2,
    speed: 0.0003 + Math.random() * 0.001,
    size: 1.5 + Math.random() * 3,
    opacity: 0.2 + Math.random() * 0.5,
  }));

  const dots = svg.selectAll('circle')
    .data(particles)
    .join('circle')
    .attr('r', d => d.size)
    .attr('fill', (d, i) => i % 5 === 0 ? COLORS.accent : COLORS.main)
    .attr('opacity', d => d.opacity);

  function animate() {
    particles.forEach(p => {
      p.angle += p.speed;
    });

    dots
      .attr('cx', d => d.cx + Math.cos(d.angle) * d.r)
      .attr('cy', d => d.cy + Math.sin(d.angle) * d.r * 0.4);

    requestAnimationFrame(animate);
  }

  animate();
}

// Export
window.drawTimelineChart = drawTimelineChart;
window.drawCountriesChart = drawCountriesChart;
window.drawLorenzChart = drawLorenzChart;
window.drawOrbitDonut = drawOrbitDonut;
window.drawPurposeChart = drawPurposeChart;
window.drawPurposeOrbitChart = drawPurposeOrbitChart;
window.drawHeroParticles = drawHeroParticles;
