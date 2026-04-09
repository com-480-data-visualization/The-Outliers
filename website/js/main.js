/**
 * Main entry point: load data, init visualizations, setup scrollama.
 */

(async function () {
    // Init hero immediately (no data needed)
    initHero();
    initAnimations();

    // Load satellite data
    const data = await d3.json("data/satellites.json");
    console.log(`Loaded ${data.length} satellites`);

    // Init D3 visualizations
    initTimeline(data);
    initCountries(data);

    // Lazy-load globe when orbital section approaches viewport
    const globeWrapper = document.getElementById("globe-wrapper");
    if (globeWrapper) {
        let globeInitialized = false;

        const globeObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !globeInitialized) {
                globeInitialized = true;
                initGlobe(data);
                globeObserver.disconnect();
            }
        }, {
            rootMargin: "500px 0px"
        });

        globeObserver.observe(globeWrapper);
    }

    // Setup Scrollama for the timeline section
    const scroller = scrollama();

    scroller
        .setup({
            step: "#scrolly-text .step",
            offset: 0.5,
            debug: false,
        })
        .onStepEnter(({ index, element }) => {
            d3.selectAll(".step").classed("is-active", false);
            d3.select(element).classed("is-active", true);

            if (window.updateTimeline) {
                window.updateTimeline(index);
            }
        });

    window.addEventListener("resize", scroller.resize);
})();
