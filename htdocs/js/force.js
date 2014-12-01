/* force.js
* A graph object implementing a force-directed graph using d3.js.
*
* Author: Peter Kerpedjiev <pkerp@tbi.univie.ac.at>
* Version: 0.1
* Date: 2014-10-15
*/

function Graph() {
    var self = this;

    var w = 679,
    h = 600,
    fill = d3.scale.category20();

    // mouse event vars
    var mousedown_link = null,
        mousedown_node = null,
        mouseup_node = null;

    var xScale = d3.scale.linear()
    .domain([0,w]);
    var yScale = d3.scale.linear()
    .domain([0,h]);

    var graph = self.graph = {
        "nodes":[],
        "links":[]
    };

    self.customColors = {};
    self.extraLinks = {}

    self.addNodes = function addNodes(json) {
        // add a new set of nodes from a json file

        // offset the source and target since we already
        // have a number of nodes present
        // self will have to be changed if we start removing 
        // nodes
        json.links.forEach(function(entry) {
            entry.source += graph.nodes.length;
            entry.target += graph.nodes.length;
        });

        graph.nodes = graph.nodes.concat(json.nodes);
        graph.links = graph.links.concat(json.links);

        console.log('graph.nodes', graph.nodes)
        console.log('graph.links', graph.links)

        console.log('graph.nodes.length', graph.nodes.length)
        console.log('graph.links.length', graph.links.length)

        update();
    };

    self.addCustomColors = function addCustomColors(json) {
        // Add a json file containing the custom colors
        self.customColors = json;
        console.log("customcolors:", self.customColors);
    };

    self.clearNodes = function clearNodes() {
        graph.nodes = [];
        graph.links = [];

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

        svg.attr("width", svgW)
        .attr("height", svgH);
    }

    self.changeColorScheme = function(newColorScheme) {
        var nodes = vis_nodes.selectAll('[node_type=nucleotide]');
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
        } else if (newColorScheme == 'custom') {
            // scale to be used in case the user passes scalar
            // values rather than color names
            var scale = d3.scale.linear()
            .range(['white', 'steelblue'])
            .interpolate(d3.interpolateLab)
            .domain([0, 1]);

            nodes.style('fill', function(d) {
                if (typeof self.customColors == 'undefined') {
                    return 'white';
                } else if (self.customColors.hasOwnProperty(d.struct_name)) {
                    //is the molecule name in the custom colors object
                    molecule_colors = self.customColors[d.struct_name];

                    console.log('d.id', d.id);

                    if (molecule_colors.hasOwnProperty(d.id)) {
                        val = parseFloat(molecule_colors[d.id]);

                        if (isNaN(val)) {
                            // passed in color is not a scalar, so 
                            // treat it as a color
                            return molecule_colors[d.id];
                        } else {
                            // the user passed in a float, let's use a colormap
                            // to convert it to a color
                            return scale(val);
                        }
                    }
                }

                return 'white';
            });
        }
    };

    function mousedown() {

    }

    function mousemove() {
        if (!mousedown_node) return;

        //console.log('mousedown_node:', mousedown_node);
        mpos = d3.mouse(vis.node());
        // update drag line
        drag_line
        .attr("x1", mousedown_node.x)
        .attr("y1", mousedown_node.y)
        .attr("x2", mpos[0])
        .attr("y2", mpos[1]);

    }

    function mouseup() {
        console.log('mouseup');
        if (mousedown_node) {
            drag_line
            .attr("class", "drag_line_hidden");
        }

        console.log('clearing mouse vars');
        // clear mouse event vars
        resetMouseVars();
        //update()
    }
    //adapt size to window changes:
    window.addEventListener("resize", setSize, false);

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
    .call(zoomer)
    .on('mousemove', mousemove)
    .on('mousedown', mousedown)
    .on('mouseup', mouseup);

    var rect = svg_graph.append('svg:rect')
    .attr('width', w)
    .attr('height', h)
    .attr('fill', 'white')
    .attr('stroke', 'transparent')
    .attr('stroke-width', 1)
    //.attr("pointer-events", "all")
    .attr("id", "zrect");

    var vis = svg_graph.append("svg:g");
    var vis_links = vis.append("svg:g");
    var vis_nodes = vis.append("svg:g");

    function redraw() {
        vis.attr("transform",
                 "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
    }

    var force = d3.layout.force()
    .charge(function(d) { if (d.node_type == 'pseudo') 
            return -200; 
        else 
            return -80;})
    .linkDistance(function(d) { return 18 * d.value; })
    .linkStrength(function(d) { if (d.link_type == 'pseudoknot') 
                  { return 0.0; }
            else if (d.link_type == 'protein_chain')
                { return 0.02; }
            else
                { return 8; } })
    .gravity(0.002)
    .nodes(graph.nodes)
    .links(graph.links)
    .chargeDistance(110)
    .friction(0.95)
    .size([w, h]);

    // line displayed when dragging new nodes
    var drag_line = vis.append("line")
    .attr("class", "drag_line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", 0)
    .attr("y2", 0);

    function resetMouseVars() {
        mousedown_node = null;
        mouseup_node = null;
        mousedown_link = null;
    }


    var shift_keydown = false;

    function dragstarted(d) {
        d3.event.sourceEvent.stopPropagation();
        //d3.select(self).classed("dragging", true);
    }

    function dragged(d) {

    }

    function dragended(d) {
        //d3.select(self).classed("dragging", false);
    }

    var drag = force.drag()
    .origin(function(d) { return d; })
    .on("dragstart", dragstarted)
    .on("drag", dragged)
    .on("dragend", dragended);

    function keydown() {
        if (shift_keydown) return;
        //console.log('keydown', d3.event.keyCode);
        key_is_down = true;
        switch (d3.event.keyCode) {
            case 16:
                shift_keydown = true;
                break;
        }

        if (shift_keydown) {
            svg_graph.call(zoomer)
            .on("mousedown.zoom", null)
            .on("touchstart.zoom", null)
            .on("touchmove.zoom", null)
            .on("touchend.zoom", null);

            //svg_graph.on('zoom', null);
            vis.selectAll('g.gnode')
            .on('mousedown.drag', null);
        }
    }

    function keyup() {
        shift_keydown = false;

        svg_graph.call(zoomer);

        vis.selectAll('g.gnode')
        .call(drag);
    }

    d3.select(window)
    .on('keydown', keydown)
    .on('keyup', keyup);

    link_key = function(d) {
        key = d.link_type + "," + d.source.index + "," + d.target.index;
        return key;
    };
    var update = function () {
        force.nodes(graph.nodes)
        .links(graph.links)
        .start();

        console.log('prev_graph.links')
        var all_links = vis_links.selectAll("line.link")
        .data(graph.links, link_key);

        link_lines = all_links.enter().append("svg:line");

        link_lines.append("svg:title")
        .text(link_key);

        link_lines.attr("class", "link")
        .style("stroke", "#999")
        .style("stroke-opacity", 0.8)
        .style("stroke-width", function(d) { 
            return 2;
            //return Math.sqrt(d.value); 
            if (d.value != 1) return 0;
            else return Math.sqrt(d.value); })
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; })
        .attr("link_type", function(d) { return d.link_type; } )
        .attr('pointer-events', function(d) { if (d.link_type == 'fake') return 'none'; else return 'all';});

            console.log(vis_links.selectAll("line.link"))
            all_links.exit().remove();

            console.log(vis_links.selectAll("line.link"))
            console.log('nodes')
            console.log(graph.nodes);
            console.log(force.nodes());

            /* We don't need to update the positions of the stabilizing links */
            fake_links = vis_links.selectAll("[link_type=fake]")
            fake_links.style('stroke-width', 0);
            console.log('fake_links', fake_links)

            xlink = vis_links.selectAll("[link_type=real],[link_type=pseudoknot],[link_type=protein_chain]");
            //link = all_links;
            console.log('graph_link:', graph.links);
            console.log("link:", xlink);

            domain = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
            var colors = d3.scale.category10().domain(domain);

            node_mouseup = function(d) {
                if (mousedown_node) {
                    mouseup_node = d;

                    if (mouseup_node == mousedown_node) { resetMouseVars(); return; }
                    var new_link = {source: mousedown_node, target: mouseup_node, link_type: 'real', value: 1};
                    graph.links.push(new_link);

                    //throw new Error("Something went badly wrong!");

                    update();
                }
            };

            node_mousedown = function(d) {
                if (!shift_keydown) {
                    return;
                }
                mousedown_node = d;

                drag_line
                .attr("class", "drag_line")
                .attr("x1", mousedown_node.x)
                .attr("y1", mousedown_node.y)
                .attr("x2", mousedown_node.x)
                .attr("y2", mousedown_node.y);

                //gnodes.attr('pointer-events',  'none');

                /*
                console.log('mousedown dragline:', drag_line)

                update();
                */
            };

            link_click = function(d) {
                console.log('link click', d)
                if (!shift_keydown) {
                    return;
                }

                index = graph.links.indexOf(d);
                console.log('index', index)

                if (index > -1) {
                    graph.links.splice(index, 1);
                }

                update();

            }

            var gnodes = vis_nodes.selectAll('g.gnode')
            .data(graph.nodes)
            //.attr('pointer-events', 'all');

            gnodes_enter = gnodes.enter()
            .append('g')
            .classed('noselect', true)
            .classed('gnode', true)

            gnodes_enter
            .call(drag)
            .on('mousedown', node_mousedown)
            .on('mousedrag', function(d) {})
            .on('mouseup', node_mouseup)
            .transition()
            .duration(750)
            .ease("elastic")
            .attr("r", 6.5);

            node_fill = function(d) {
                node_fills = {};

                node_fills.nucleotide = 'white';
                node_fills.label = 'white';
                node_fills.pseudo = 'transparent';

                return node_fills[d.node_type];
            };

            node_stroke = function(d) {
                node_strokes = {};

                node_strokes.nucleotide = 'grey';
                node_strokes.label = 'transparent';
                node_strokes.pseudo = 'transparent';

                return node_strokes[d.node_type];
            };

            node_tooltip = function(d) {
                node_tooltips = {};

                node_tooltips.nucleotide = d.id;
                node_tooltips.label = '';
                node_tooltips.pseudot = '';

                return node_tooltips[d.node_type];
            };


            xlink.on('click', link_click);

            var node = gnodes_enter.append("svg:circle")
            .attr("class", "node")
            .attr("r", function(d) {if (d.node_type == 'pseudo') return 1; else return 6;})
            .attr("node_type", function(d) { return d.node_type; })
            .style("stroke", node_stroke)
            .style('stroke-width', 0.8)
            .style("fill", node_fill);

            var labels = gnodes_enter.append("text")
            .text(function(d) { return d.name; })
            .attr('text-anchor', 'middle')
            .attr('font-size', 8.0)
            .attr('font-weight', 'bold')
            .attr('y', 2.5)
            .attr('fill', d3.rgb(50,50,50))
            .attr('class', 'node-label')
            .append("svg:title")
            .text(function(d) { return d.id; });

            node.append("svg:title")
            .text(function(d) { return d.id; });

            gnodes.exit().remove();

            force.on("tick", function() {
                xlink.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) {  return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

                // Translate the groups
                gnodes.attr("transform", function(d) { 
                    return 'translate(' + [d.x, d.y] + ')'; 
                });
            });

        force
        .start();
    };

    setSize();
}
