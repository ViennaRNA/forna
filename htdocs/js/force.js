function Graph() {

    var w = 679,
    h = 600,
    fill = d3.scale.category20();

    var xScale = d3.scale.linear()
    .domain([0,w]);
    var yScale = d3.scale.linear()
    .domain([0,h]);

    var graph = this.graph = {
        "nodes":[],
        "links":[]
    };

    this.addNodes = function addNodes(json) {
        // add a new set of nodes from a json file

        // offset the source and target since we already
        // have a number of nodes present
        // this will have to be changed if we start removing 
        // nodes
        json.links.forEach(function(entry) {
            entry.source += graph.nodes.length;
            entry.target += graph.nodes.length;
        });

        graph.nodes = graph.nodes.concat(json.nodes);
        graph.links = graph.links.concat(json.links);

        update();
    };

    this.clearNodes = function clearNodes() {
        graph.nodes = [];
        graph.nodes = [];

        update();
    };

    function setSize() {
        var svgStyles = window.getComputedStyle(svg.node());
        var svgW = parseInt(svgStyles.width);
        var svgH = parseInt(svgStyles.height);

        //Set the output range of the scales
        xScale.range([0, svgW]);
        yScale.range([0, svgH]);

        //re-attach the scales to the zoom behaviour
        zoomer.x(xScale)
        .y(yScale);

        //resize the background
        rect.attr("width", svgW)
        .attr("height", svgH);

    }

    this.changeColorScheme = function(newColorScheme) {
        var nodes = vis.selectAll('[node_type=nucleotide]');
        data = nodes.data();


        if (newColorScheme == 'sequence') {
            scale = d3.scale.ordinal()
            .range(['#dbdb8d', '#98df8a', '#ff9896', '#aec7e8'])
            .domain(['A','C','G','U']);
            nodes.style('fill', function(d) { 
                return scale(d.name);
            });

        } else if (newColorScheme == "structure") {
            scale = d3.scale.category10()
            .domain(['s','m','i','f','t','h','x'])
            .range(['lightgreen', '#ff9896', '#dbdb8d', 'lightsalmon',
                   'lightcyan', 'lightblue', 'transparent']);
                   nodes.style('fill', function(d) { 
                       return scale(d.elem_type);
                   });
        } else if (newColorScheme == 'positions') {
            data_values = data.map(function(d) { return d.id; });
            data_min = d3.min(data_values);
            data_max = d3.max(data_values);

            var scale = d3.scale.linear()
            .range(["#98df8a", "#dbdb8d", "#ff9896"])
            .interpolate(d3.interpolateLab)
            .domain([data_min, data_min + (data_max - data_min) / 2, data_max]);

            nodes.style('fill', function(d) { 
                return scale(d.id);
            });
        }


    };

    //adapt size to window changes:
    window.addEventListener("resize", setSize, false);


    function dragstarted(d) {
        d3.event.sourceEvent.stopPropagation();
        d3.select(this).classed("dragging", true);
    }

    function dragged(d) {
        //d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
        d3.select(this).parent().attr("transform", function(d) { 
            return 'translate(' + [d3.event.x, d3.event.y] + ')'; 
        });
    }

    function dragended(d) {
        d3.select(this).classed("dragging", false);
    }

    zoomer = d3.behavior.zoom().
        scaleExtent([0.1,10]).
        on("zoom", redraw);

    d3.select("#chart").select("svg").remove();

    var svg = d3.select("#chart")
    .append("svg:svg")
    .attr("width", w)
    .attr("height", h)
    .attr("id", 'plotting-area');

    var svg_graph = svg.append('svg:g')
    .call(zoomer);

    var rect = svg_graph.append('svg:rect')
    .attr('width', w)
    .attr('height', h)
    .attr('fill', 'white')
    .attr('stroke', 'transparent')
    .attr('stroke-width', 1)
    .attr("pointer-events", "all")
    .attr("id", "zrect");


    var vis = svg_graph.append("svg:g");

    function redraw() {
        vis.attr("transform",
                 "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
    }

    var force = d3.layout.force()
    .charge(-80)
    .linkDistance(function(d) { return 15 * d.value; })
    .linkStrength(function(d) { return 8; })
    .gravity(0.005)
    .nodes(graph.nodes)
    .links(graph.links)
    .chargeDistance(150)
    .friction(0.970)
    .size([w, h]);

    var update = function () {
        var link = vis.selectAll("line.link")
        .data(graph.links);

        console.log('graph.links:', graph.links)

        link.enter().append("svg:line")
        .attr("class", "link")
        .style("stroke", "#999")
        .style("stroke-opacity", 0.6)
        .style("stroke-width", function(d) { 
            //return Math.sqrt(d.value); 
            if (d.value != 1) return 0;
            else return Math.sqrt(d.value); })
        .attr("x1", function(d) { console.log("d", d, "d.source", d.source); return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

            link.exit().remove();

            domain = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
            var colors = d3.scale.category10().domain(domain);

            var drag = force.drag()
            .origin(function(d) { return d; })
            .on("dragstart", dragstarted)
            .on("drag", dragged)
            .on("dragend", dragended);

            var gnodes = vis.selectAll('g.gnode')
            .data(graph.nodes);

            gnodes.enter()
            .append('g')
            .attr("transform", function(d) {
                return 'translate(' + [d.x, d.y] + ')'; 
            })
            .classed('gnode', true)
            .call(drag);


            node_fill = function(d) {
                node_fills = {};

                node_fills.nucleotide = 'white';
                node_fills.label = 'white';
                node_fills.pseudo = 'transparent';

                return node_fills[d.node_type];
            };

            node_stroke = function(d) {
                node_strokes = {};

                node_strokes.nucleotide = 'white';
                node_strokes.label = 'white';
                node_strokes.pseudo = 'transparent';

                return node_strokes[d.node_type];
            };

            var node = gnodes.append("svg:circle")
            .attr("class", "node")
            .attr("r", 6)
            .attr("node_type", function(d) { return d.node_type; })
            .style("stroke", node_stroke)
            .style("fill", node_fill);

            var labels = gnodes.append("text")
            .text(function(d) { return d.name; })
            .attr('text-anchor', 'middle')
            .attr('font-size', 6.0)
            .attr('y', 2.5)
            .attr('fill', d3.rgb(50,50,50))
            .attr('class', 'node-label');

            //this.changeColorScheme('structure');

            node.append("svg:title")
            .text(function(d) { return d.name; });

            gnodes.exit().remove();

            vis.style("opacity", 1e-6)
            .transition()
            .duration(1000)
            .style("opacity", 1);


            force.on("tick", function() {
                link.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) {  return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

                // Translate the groups
                gnodes.attr("transform", function(d) { 
                    return 'translate(' + [d.x, d.y] + ')'; 
                });
            });


            setSize();

        force.nodes(graph.nodes)
        .links(graph.links)
        .start();
    };

}
