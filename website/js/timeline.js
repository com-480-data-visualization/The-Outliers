/**
 * Timeline visualization: cumulative satellite launches over time.
 * Drawn with D3.js, animated via Scrollama steps.
 */

function initTimeline(data) {
    const container = document.getElementById("timeline-chart");
    if (!container) return;

    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;

    const svg = d3.select("#timeline-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Aggregate launches by year
    const yearCounts = d3.rollup(data, v => v.length, d => d.launch_year);
    const years = Array.from(yearCounts.keys()).filter(y => y != null).sort((a, b) => a - b);

    let cumulative = 0;
    const timelineData = years.map(year => {
        cumulative += yearCounts.get(year);
        return { year, count: yearCounts.get(year), cumulative };
    });

    // Scales
    const x = d3.scaleLinear()
        .domain(d3.extent(timelineData, d => d.year))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(timelineData, d => d.cumulative) * 1.05])
        .range([height, 0]);

    // Grid lines
    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat("")
        );

    // Axes
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).tickFormat(d3.format(",")).ticks(6));

    // Area
    const area = d3.area()
        .x(d => x(d.year))
        .y0(height)
        .y1(d => y(d.cumulative))
        .curve(d3.curveMonotoneX);

    const areaPath = svg.append("path")
        .datum(timelineData)
        .attr("fill", "rgba(26, 115, 232, 0.15)")
        .attr("d", area);

    // Line
    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.cumulative))
        .curve(d3.curveMonotoneX);

    const linePath = svg.append("path")
        .datum(timelineData)
        .attr("fill", "none")
        .attr("stroke", "#1a73e8")
        .attr("stroke-width", 2.5)
        .attr("d", line);

    // Animate: clip path that reveals progressively
    const clipRect = svg.append("clipPath")
        .attr("id", "timeline-clip")
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("height", height + margin.top)
        .attr("width", 0);

    areaPath.attr("clip-path", "url(#timeline-clip)");
    linePath.attr("clip-path", "url(#timeline-clip)");

    // Starlink annotation line (hidden initially)
    const starlinkLine = svg.append("line")
        .attr("x1", x(2019))
        .attr("x2", x(2019))
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "#e8710a")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "6,4")
        .attr("opacity", 0);

    const starlinkLabel = svg.append("text")
        .attr("x", x(2019) + 8)
        .attr("y", 30)
        .attr("fill", "#e8710a")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .text("Starlink begins")
        .attr("opacity", 0);

    // Tooltip
    const tooltip = d3.select("body").append("div").attr("class", "tooltip");
    const hoverLine = svg.append("line")
        .attr("y1", 0).attr("y2", height)
        .attr("stroke", "#c9d1d9").attr("stroke-width", 1)
        .attr("stroke-dasharray", "3,3").attr("opacity", 0);
    const hoverDot = svg.append("circle")
        .attr("r", 4).attr("fill", "#1a73e8")
        .attr("stroke", "#fff").attr("stroke-width", 1.5).attr("opacity", 0);

    // Hover interaction
    svg.append("rect")
        .attr("width", width).attr("height", height)
        .attr("fill", "transparent")
        .on("mousemove", function (event) {
            const [mx] = d3.pointer(event);
            const yearVal = Math.round(x.invert(mx));
            const d = timelineData.find(t => t.year === yearVal);
            if (!d) return;

            hoverLine.attr("x1", x(d.year)).attr("x2", x(d.year)).attr("opacity", 0.5);
            hoverDot.attr("cx", x(d.year)).attr("cy", y(d.cumulative)).attr("opacity", 1);

            tooltip.style("opacity", 1)
                .html(`<strong>${d.year}</strong><br>
                       Launched: <span class="accent">${d.count.toLocaleString()}</span><br>
                       Total: <span class="accent">${d.cumulative.toLocaleString()}</span>`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 40) + "px");
        })
        .on("mouseleave", function () {
            hoverLine.attr("opacity", 0);
            hoverDot.attr("opacity", 0);
            tooltip.style("opacity", 0);
        });

    // Step thresholds (what year to reveal up to per scroll step)
    const stepYears = [1995, 2010, 2019, 2023];

    // Expose update function for scrollama
    window.updateTimeline = function (stepIndex) {
        const targetYear = stepYears[Math.min(stepIndex, stepYears.length - 1)];
        const targetX = x(targetYear);

        clipRect.transition()
            .duration(800)
            .ease(d3.easeCubicOut)
            .attr("width", targetX);

        // Show starlink annotation on step 3+
        const showStarlink = stepIndex >= 2 ? 1 : 0;
        starlinkLine.transition().duration(400).attr("opacity", showStarlink * 0.7);
        starlinkLabel.transition().duration(400).attr("opacity", showStarlink);
    };

    // Start with first step visible
    window.updateTimeline(0);
}
