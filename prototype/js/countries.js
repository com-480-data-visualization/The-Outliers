/**
 * Countries bar chart: top 15 countries by satellite count.
 */

function initCountries(data) {
    const container = document.getElementById("countries-chart");
    if (!container) return;

    const margin = { top: 20, right: 80, bottom: 30, left: 160 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;

    const svg = d3.select("#countries-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Aggregate by country
    const countryCounts = d3.rollup(data, v => v.length, d => d.country);
    const sorted = Array.from(countryCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);

    const total = data.length;

    // Scales
    const y = d3.scaleBand()
        .domain(sorted.map(d => d[0]))
        .range([0, height])
        .padding(0.25);

    const x = d3.scaleLinear()
        .domain([0, d3.max(sorted, d => d[1]) * 1.1])
        .range([0, width]);

    // Grid
    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisBottom(x)
            .tickSize(height)
            .tickFormat("")
        )
        .call(g => g.select(".domain").remove());

    // Axes
    svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y))
        .call(g => g.select(".domain").remove());

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(",")));

    // Tooltip
    const tooltip = d3.select("body").append("div").attr("class", "tooltip");

    // Bars
    svg.selectAll(".bar")
        .data(sorted)
        .join("rect")
        .attr("class", "bar")
        .attr("y", d => y(d[0]))
        .attr("height", y.bandwidth())
        .attr("x", 0)
        .attr("width", 0)
        .attr("rx", 3)
        .attr("fill", (d, i) => i === 0 ? "#e8710a" : "#1a73e8")
        .attr("opacity", 0.85)
        .on("mouseover", function (event, d) {
            d3.select(this).attr("opacity", 1);
            const pct = (d[1] / total * 100).toFixed(1);
            tooltip.style("opacity", 1)
                .html(`<strong>${d[0]}</strong><br>
                       Satellites: <span class="accent">${d[1].toLocaleString()}</span><br>
                       Share: <span class="accent">${pct}%</span>`);
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 40) + "px");
        })
        .on("mouseleave", function () {
            d3.select(this).attr("opacity", 0.85);
            tooltip.style("opacity", 0);
        })
        .transition()
        .duration(800)
        .delay((d, i) => i * 50)
        .ease(d3.easeCubicOut)
        .attr("width", d => x(d[1]));

    // Value labels
    svg.selectAll(".bar-label")
        .data(sorted)
        .join("text")
        .attr("class", "bar-label")
        .attr("y", d => y(d[0]) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("fill", "#8b949e")
        .attr("font-size", "11px")
        .attr("x", d => x(d[1]) + 8)
        .attr("opacity", 0)
        .text(d => d[1].toLocaleString())
        .transition()
        .duration(800)
        .delay((d, i) => i * 50 + 400)
        .attr("opacity", 1);
}
