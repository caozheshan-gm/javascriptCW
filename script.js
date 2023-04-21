
Promise.all([
    d3.csv("Formula1/circuits.csv"),
    d3.csv("Formula1/races.csv"),
    d3.csv("Formula1/status.csv"),
    d3.csv("Formula1/results.csv"),
]).then(([circuitsData, racesData, statusData, resultsData]) => {
    // Filter the total dangerous status IDs
    const dangerousStatusIds = [3, 4, 20, 56, 66, 73, 82, 100, 107, 137, 138, 139];

    const data = circuitsData.map(circuit => {
        const circuitRaces = racesData.filter(race => race.circuitId === circuit.circuitId);

        const dangerousSituations = dangerousStatusIds.map(id => ({
            id,
            count: resultsData.filter(result =>
                result.statusId == id && circuitRaces.some(race => race.raceId == result.raceId)
            ).length,
        }));

        const totalCount = dangerousSituations.reduce((sum, situation) => sum + situation.count, 0);
        const totalRaces = circuitRaces.length;
        const frequency = totalCount / totalRaces;


        return {
            circuit: circuit.name,
            count: totalCount,
            frequency: frequency,
            totalrace: totalRaces,
            country: circuit.country,
            radius: Math.sqrt(frequency * 200),
            lat: circuit.lat,
            lng: circuit.lng,
            dangerousSituations,
        };
    });

    console.log(data)



    // bubble chart
    const width = 900;
    const height = 650;
    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height+ 100);
    

    const simulation = d3.forceSimulation(data)
        .force("charge", d3.forceManyBody().strength(5))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(d => d.radius))
        .on("tick", ticked);



    const bubbleGroups = svg.selectAll("g")
        .data(data)
        .join("g")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))
        .on("click", displayDetails);
   

    const bubbles = bubbleGroups.append("circle")
        .attr("r", d => d.radius)
        .attr("fill", "steelblue");
    
    const labels = bubbleGroups.append("text")
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .text(d => d.circuit)
        .style("font-size", "10px")
        .style("fill", "white");
    

    function ticked() {
        bubbleGroups
            .attr("transform", d => `translate(${d.x}, ${d.y})`);
    }

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;

        simulation
            .force("x", null)
            .force("y", null)
            .alphaTarget(0.3)
            .restart();
    }

    function orderByFrequency() {
        simulation
            .force("x", d3.forceX(d => (data.sort((a, b) => b.frequency - a.frequency).indexOf(d) % 10) * 80 + 40))
            .force("y", d3.forceY(d => Math.floor(data.sort((a, b) => b.frequency - a.frequency).indexOf(d) / 10) * 80 + 40))
            .alphaTarget(1)
            .restart();
    }

    function orderByCount() {
        simulation
            .force("x", d3.forceX(d => (data.sort((a, b) => b.count - a.count).indexOf(d) % 10) * 80 + 40))
            .force("y", d3.forceY(d => Math.floor(data.sort((a, b) => b.count - a.count).indexOf(d) / 10) * 80 + 40))
            .alphaTarget(1)
            .restart();
    }
   
    // display the details of bubble
    function displayDetails(event, d) {
        drawPieChart(d);
        const details = d.dangerousSituations.map(situation => {
            const status = statusData.find(status => status.statusId == situation.id);
            return `${status.status}: ${situation.count}`;
        }).join("\n");

        alert(`Circuit: ${d.circuit}\nAverage accident per race: ${d.frequency}\nTotal race count: ${d.totalrace}\nTotal Accident Count: ${d.count}\n Latitude:${d.lat}\n Longitude:${d.lng}\n Country: ${d.country}\n\n${details}`);
    }


    //the pie chart shows the distribution of accidents in each circuit
    function drawPieChart(data) {

        d3.select("#pie-chart").remove();

        const pie = d3.pie()
            .value(d => d.count)
            .sort(null);
        
        const arc = d3.arc()
            .innerRadius(0)
            .outerRadius(100);
    
        const color = d3.scaleOrdinal(d3.schemeCategory10);
    
        const pieData = pie(data.dangerousSituations);
    
        const pieSvg = d3.select("#chart")
            .append("svg")
            .attr("width", 400)
            .attr("height", 500)
            .attr("id", "pie-chart");
    
        const pieGroup = pieSvg.append("g")
            .attr("transform", "translate(150, 150)");
            
    
        const pieSlices = pieGroup.selectAll("path")
            .data(pieData)
            .join("path")
            .attr("d", arc)
            .attr("fill", (d, i) => color(i));

        const legend = pieSvg.selectAll(".legend")
            .data(pie(data.dangerousSituations))
            .join("g")
            .attr("class", "legend")
            .attr("transform", (d, i) => `translate(${320},${20 + i * 20})`);
    
        legend.append("rect")
            .attr("width", 18)
            .attr("height", 18)
            .attr("fill", d => color(d.data.id));
    
        legend.append("text")
            .attr("x", -6)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "end")
            .style("font-size", "12px")
            .text(d => {
                const status = statusData.find(status => status.statusId == d.data.id);
                return `${status.status}`;
            });
    }


    document.getElementById("sort-button").addEventListener("click", orderByCount);
    document.getElementById("sort-button-frequency").addEventListener("click", orderByFrequency);

    //filter the data by country
    const uniqueCountries = [...new Set(data.map(d => d.country))];
    const filterSelect = d3.select("#filter")
        .append("select")
        .on("change", function() {
            const selectedCountry = this.value;
            bubbles.attr("fill", d => d.country === selectedCountry ? "red" : "steelblue");
        });

    filterSelect.selectAll("option")
        .data(uniqueCountries)
        .join("option")
        .attr("value", d => d)
        .text(d => d);

    filterSelect.insert("option", ":first-child")
        .attr("value", "")
        .text("All countries")
        .property("selected", true);

});







