/* force.js
* A graph object implementing a force-directed graph using d3.js.
*
* Author: Peter Kerpedjiev <pkerp@tbi.univie.ac.at>
* Version: 0.1
* Date: 2014-10-15
*/

serverURL = "";

// custom ajax call
ajax = function(uri, method, data) {
  var request = {
    url: uri,
    type: method,
    contentType: "application/json",
    accepts: "application/json",
    cache: false,
    dataType: 'json',
    data: data,
    error: function(jqXHR) {
        console.log("ajax error " + jqXHR.status + jqXHR.responseText);
    }
  };
  return $.ajax(request);
};

function Graph(element) {
    var self = this;

    var fill = d3.scale.category20();

    self.svgW = 800;
    self.svgH = 600;

    // mouse event vars
    var mousedown_link = null,
        mousedown_node = null,
        mouseup_node = null;

    var xScale = d3.scale.linear()
    .domain([0,self.svgW]);
    var yScale = d3.scale.linear()
    .domain([0,self.svgH]);

    var graph = self.graph = {
        "nodes":[],
        "links":[]
    };
    
    self.linkStrengths = {
        "pseudoknot": 0.00,
        "protein_chain": 0.00,
        "chain_chain": 0.00,
        "intermolecule": 8.00,
        "other": 8.00
    };
    
    self.displayParameters = {
        "nodeStrokeWidth": 0.8,
        "nodeStrokeWidthDefault": 0.8,
        "nodeLabelFillDefault":  d3.rgb(50,50,50),
        "nodeLabelFill":  d3.rgb(50,50,50),
        "linkOpacityDefault": 0.8,
        "linkOpacity": 0.8,
        "labelLinkOpacityDefault": 0.8,
        "labelTextFillDefault": d3.rgb(50,50,50),
        "labelTextFill": d3.rgb(50,50,50),
        "labelNodeFillDefault": 'white',
        "labelNodeFill": 'white',
        "backgroundColorDefault": "white",
        "backgroundColor": "white",
    };

    self.colorScheme = 'structure';
    self.customColors = {};
    self.animation = true;
    // don't listen to events because a model window is open somewhere
    self.deaf = false;
    self.rnas = {};
    self.extraLinks = []; //store links between different RNAs

    self.addRNA = function(rnaGraph) {
        // Add an RNAGraph, which contains nodes and links as part of the
        // structure
        // Each RNA will have uid to identify it
        // when it is modified, it is replaced in the global list of RNAs
        self.rnas[rnaGraph.uid] = rnaGraph;
        self.recalculateGraph();
    };

    self.recalculateGraph = function(rnaGraph) {
        // Condense all of the individual RNAs into one
        // collection of nodes and links
        graph.nodes = [];
        graph.links = [];
        //console.log('self.rnas', self.rnas);
        for (var uid in self.rnas) {
            graph.nodes = self.graph.nodes.concat(self.rnas[uid].nodes);
            graph.links = self.graph.links.concat(self.rnas[uid].links);

            //console.log('graph.nodes:', graph.nodes);
        }

        // Create a lookup table so that we can access each node
        // based on its uid. This will be used to create the links
        // between different RNAs
        var uids_to_nodes = {};
        for (var i = 0; i < graph.nodes.length; i++)
            uids_to_nodes[graph.nodes[i].uid] = graph.nodes[i];

        console.log('self.extraLinks:', self.extraLinks);
        for (i = 0; i < self.extraLinks.length; i++) {
            // the actual node objects may have changed, so we hae to recreate
            // the extra links based on the uids
            self.extraLinks[i].source = uids_to_nodes[self.extraLinks[i].source.uid];
            self.extraLinks[i].target = uids_to_nodes[self.extraLinks[i].target.uid];

            console.log('pushing:', self.extraLinks[i]);
            graph.links.push(self.extraLinks[i]);
        }

        //console.log('graph:', graph);
    };

    self.addNodes = function addNodes(json) {
        // add a new set of nodes from a json file

        // Resolve the sources and targets of the links so that they
        // are not just indeces into an array
        json.links.forEach(function(entry) {
            if (typeof entry.source == "number") entry.source = json.nodes[entry.source];
            if (typeof entry.target == "number") entry.target = json.nodes[entry.target];
        });

        // Get the maximum x and y values of the current graph
        // so that we don't place a new structure on top of the
        // old one
        if (graph.nodes.length > 0) {
            max_x = d3.max(graph.nodes.map(function(d) {return d.x;}));
            max_y = d3.max(graph.nodes.map(function(d) {return d.y;}));
        } else {
            max_x = 0;
            max_y = 0;
        }

        json.nodes.forEach(function(entry) {
            if (!(entry.rna.uid in self.rnas)) {
                self.rnas[entry.rna.uid] = entry.rna;
            }

            entry.x += max_x;
            //entry.y += max_y;

            entry.px += max_x;
            //entry.py += max_y;
        });

        r = new RNAGraph('','');
        r.nodes = json.nodes;
        r.links = json.links;

        //console.log('r', r);

        //self.addRNA(r);
        self.recalculateGraph();

        update();
        self.center_view();
    };

    self.addCustomColors = function addCustomColors(json) {
        // Add a json file containing the custom colors
        self.customColors = json;
    };

    self.clearNodes = function clearNodes() {
        graph.nodes = [];
        graph.links = [];

        self.rnas = {};
        self.extraLinks = [];

        update();
    };

    function setSize() {
        var svgW = $(element).width();
        var svgH = $(element).height();

        self.svgW = svgW;
        self.svgH = svgH;

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

    function change_colors(molecule_colors, d, scale) {
        if (molecule_colors.hasOwnProperty(d.num)) {
            val = parseFloat(molecule_colors[d.num]);
            console.log('d.num', d.num, 'val', val);

            if (isNaN(val)) {
                // passed in color is not a scalar, so 
                // treat it as a color
                return molecule_colors[d.num];
            } else {
                // the user passed in a float, let's use a colormap
                // to convert it to a color
                return scale(val);
            }
        } else {
            return 'white';
        }
    }

    self.changeColorScheme = function(newColorScheme) {
        var protein_nodes = vis_nodes.selectAll('[node_type=protein]');

        protein_nodes.style('fill', 'grey')
                    .style('fill-opacity', 0.5)
                    .attr('r', function(d) { return Math.sqrt(d.size); });

                    /*
        var fake_nodes = vis_nodes.seletAll('[node_type=fake]');
        fake_nodes.style('fill', 'transparent');
        */

        var nodes = vis_nodes.selectAll('[node_type=nucleotide]');
        var scale;
        data = nodes.data();
        self.colorScheme = newColorScheme;


        if (newColorScheme == 'sequence') {
            scale = d3.scale.ordinal()
            .range(['#dbdb8d', '#98df8a', '#ff9896', '#aec7e8', '#aec7e8'])
            .domain(['A','C','G','U','T']);
            nodes.style('fill', function(d) { 
                return scale(d.name);
            });

        } else if (newColorScheme == "structure") {
            scale = d3.scale.category10()
            .domain(['s','m','i','e','t','h','x'])
            .range(['lightgreen', '#ff9896', '#dbdb8d', 'lightsalmon',
                   'lightcyan', 'lightblue', 'transparent']);
                   nodes.style('fill', function(d) { 
                       return scale(d.elem_type);
                   });

        } else if (newColorScheme == 'positions') {
            nodes.style('fill', function(d) { 
                scale = d3.scale.linear()
                .range(["#98df8a", "#dbdb8d", "#ff9896"])
                .interpolate(d3.interpolateLab)
                .domain([1, 1 + (d.rna.rna_length - 1) / 2, d.rna.rna_length]);

                return scale(d.num);
            });
        } else if (newColorScheme == 'custom') {
            // scale to be used in case the user passes scalar
            // values rather than color names
            scale = d3.scale.linear()
            .range(['white', 'steelblue'])
            .interpolate(d3.interpolateLab)
            .domain([0, 1]);


            //console.log(self.customColors);

            nodes.style('fill', function(d) {
                if (typeof self.customColors == 'undefined') {
                    return 'white';
                } 
                console.log('d.struct_name:', d.struct_name);
                
                if (self.customColors.hasOwnProperty(d.struct_name) &&
                    self.customColors[d.struct_name].hasOwnProperty(d.num)) {
                    // if a molecule name is specified, it supercedes the default colors
                    // (for which no molecule name has been specified)
                    molecule_colors = self.customColors[d.struct_name];
                    return change_colors(molecule_colors, d, scale);
                } else if (self.customColors.hasOwnProperty('')) {
                    molecule_colors = self.customColors[''];
                    console.log('molecule_colors:', molecule_colors);
                    return change_colors(molecule_colors, d, scale);
                }

                return 'white';
            });
        }
    };

    function mousedown() {

    }

    function mousemove() {
        if (!mousedown_node) return;

        mpos = d3.mouse(vis.node());
        // update drag line
        drag_line
        .attr("x1", mousedown_node.x)
        .attr("y1", mousedown_node.y)
        .attr("x2", mpos[0])
        .attr("y2", mpos[1]);

    }

    function mouseup() {
        if (mousedown_node) {
            drag_line
            .attr("class", "drag_line_hidden");
        }

        // clear mouse event vars
        resetMouseVars();
        //update()
    }
    //adapt size to window changes:
    window.addEventListener("resize", setSize, false);

    zoomer = d3.behavior.zoom().
        scaleExtent([0.1,10]).
        on("zoom", redraw);

    d3.select(element).select("svg").remove();

    var svg = d3.select(element)
    .append("svg:svg")
    .attr("width", self.svgW)
    .attr("height", self.svgH)
    .attr("id", 'plotting-area');

    var svg_graph = svg.append('svg:g')
    .call(zoomer)
    .on('mousemove', mousemove)
    .on('mousedown', mousedown)
    .on('mouseup', mouseup);

    var rect = svg_graph.append('svg:rect')
    .attr('width', self.svgW)
    .attr('height', self.svgH)
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

    self.center_view = function() {
        // Center the view on the molecule(s) and scale it so that everything
        // fits in the window

        //no molecules, nothing to do
        if (graph.nodes.length === 0)
            return;

        // Get the bounding box
        min_x = d3.min(graph.nodes.map(function(d) {return d.x;}));
        min_y = d3.min(graph.nodes.map(function(d) {return d.y;}));

        max_x = d3.max(graph.nodes.map(function(d) {return d.x;}));
        max_y = d3.max(graph.nodes.map(function(d) {return d.y;}));


        // The width and the height of the molecule
        mol_width = max_x - min_x;
        mol_height = max_y - min_y;

        // how much larger the drawing area is than the width and the height
        width_ratio = self.svgW / mol_width;
        height_ratio = self.svgH / mol_height;

        // we need to fit it in both directions, so we scale according to
        // the direction in which we need to shrink the most
        min_ratio = Math.min(width_ratio, height_ratio) * 0.8;

        // the new dimensions of the molecule
        new_mol_width = mol_width * min_ratio;
        new_mol_height = mol_height * min_ratio;

        // translate so that it's in the center of the window
        x_trans = -(min_x) * min_ratio + (self.svgW - new_mol_width) / 2;
        y_trans = -(min_y) * min_ratio + (self.svgH - new_mol_height) / 2;


        // do the actual moving
        vis.attr("transform",
                 "translate(" + [x_trans, y_trans] + ")" + " scale(" + min_ratio + ")");

        // tell the zoomer what we did so that next we zoom, it uses the
        // transformation we entered here
        zoomer.translate([x_trans, y_trans ]);
        zoomer.scale(min_ratio);

    };

    var force = d3.layout.force()
    .charge(function(d) { if (d.node_type == 'pseudo') 
            return 0; 
        else 
            return 0;})
    .friction(0.35)
    .linkDistance(function(d) { return 18 * d.value; })
    .linkStrength(function(d) { if (d.link_type in self.linkStrengths) {
                                  return self.linkStrengths[d.link_type];
                                } else {
                                  return self.linkStrengths.other; }
    })
    .gravity(0.000)
    .nodes(graph.nodes)
    .links(graph.links)
    .chargeDistance(110)
    .size([self.svgW, self.svgH]);

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
        //
        rnaView.animation(true);
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
        if (self.deaf)
            // lalalalal, not listening
            return;

        if (shift_keydown) return;
        key_is_down = true;
        //console.log(d3.event.keyCode);
        switch (d3.event.keyCode) {
            case 16:
                shift_keydown = true;
                break;
            case 67: //c
                self.center_view();
                break;
            case 32:
                if (self.animation) {
                  rnaView.animation(false);
                } else {
                  rnaView.animation(true);
                }
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
        return d.uid;
    };

    node_key = function(d) {
        key = d.uid;
        return key;
    };
    
    self.startAnimation = function() {
      self.animation = true;
      vis.selectAll('g.gnode')
        .call(drag);
      force.start();
    };
    
    self.stopAnimation = function() {
      self.animation = false;
      vis.selectAll('g.gnode')
           .on('mousedown.drag', null);
      force.stop();
    };
    
    self.setFriction = function(value) {
      force.friction(value);
    };
    
    self.setGravity = function(value) {
      force.gravity(value);
    };
    
    self.setPseudoknotStrength = function(value) {
      self.linkStrength.pseudoknot = value;
      update();
    };
    
    self.displayBackground = function(value) {
      if (value === true) {
        self.displayParameters.backgroundColor=self.displayParameters.backgroundColorDefault;
      } else {
        self.displayParameters.backgroundColor='transparent';
      }
      rect.attr('fill', self.displayParameters.backgroundColor);
      //vis_nodes.selectAll('[label_type=label]').attr('fill', self.displayParameters["backgroundColor"]);
    };
    
    self.displayNumbering = function(value) {
      if (value === true) {
        self.displayParameters.labelTextFill=self.displayParameters.labelTextFillDefault;
        self.displayParameters.labelLinkOpacity=self.displayParameters.labelLinkOpacityDefault;
        self.displayParameters.labelNodeFill = self.displayParameters.labelNodeFillDefault;
      } else {
        self.displayParameters.labelTextFill='transparent';
        self.displayParameters.labelLinkOpacity=0;
        self.displayParameters.labelNodeFill = 'transparent';
      }
      //console.log('sd', self.displayParameters.labelNodeFill);
      //console.log(vis_nodes.selectAll('[node_type=label]'));
      vis_nodes.selectAll('[node_type=label]').style('fill', self.displayParameters.labelNodeFill);
      vis_nodes.selectAll('[label_type=label]').style('fill', self.displayParameters.labelTextFill);
      //console.log('opacity:', self.displayParameters.labelLinkOpacity);
      vis_links.selectAll('[link_type=label_link]').style('stroke-opacity', self.displayParameters.labelLinkOpacity);
    };
    
    self.displayNodeOutline = function(value) {
      if (value === true) {
        self.displayParameters.nodeStrokeWidth=self.displayParameters.nodeStrokeWidthDefault;
      } else {
        self.displayParameters.nodeStrokeWidth=0;
      }
      svg.selectAll('circle').style('stroke-width', self.displayParameters.nodeStrokeWidth);
    };
    
    self.displayNodeLabel = function(value) {
      if (value === true) {
        self.displayParameters.nodeLabelFill=self.displayParameters.nodeLabelFillDefault;
      } else {
        self.displayParameters.nodeLabelFill='transparent';
      }
      vis_nodes.selectAll('[label_type=nucleotide]').attr('fill', self.displayParameters.nodeLabelFill);
    };
    
    self.displayLinks = function(value) {
      if (value === true) {
        self.displayParameters.linkOpacity=self.displayParameters.linkOpacityDefault;
      } else {
        self.displayParameters.linkOpacity=0;
      }

      svg.selectAll("[link_type=real],[link_type=pseudoknot],[link_type=protein_chain],[link_type=chain_chain]").style('stroke-opacity', self.displayParameters.linkOpacity);
    };
    
    var update = function () {
        force.nodes(graph.nodes)
        .links(graph.links);
        
        if (self.animation) {
          force.start();
        }

        var all_links = vis_links.selectAll("line.link")
        .data(graph.links, link_key);

        link_lines = all_links.enter().append("svg:line");

        link_lines.append("svg:title")
        .text(link_key);

        link_lines.attr("class", "link")
        .style("stroke", "#999")
        .style("stroke-opacity", self.displayParameters.linkOpacity)
        .style("stroke-width", function(d) { 
            return 2;
        })
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; })
        .attr("link_type", function(d) { return d.link_type; } )
        .attr('pointer-events', function(d) { if (d.link_type == 'fake') return 'none'; else return 'all';});

            all_links.exit().each(function(d) { /*console.log('exiting', d);*/ }).remove();

            /* We don't need to update the positions of the stabilizing links */
            fake_links = vis_links.selectAll("[link_type=fake]");
            fake_links.style('stroke-width', 0);
            //fake_links.style('stroke', 'blue')

            basepair_links = vis_links.selectAll("[link_type=basepair]");
            basepair_links.style('stroke', 'red');

            intermolecule_links = vis_links.selectAll("[link_type=intermolecule]");
            intermolecule_links.style('stroke', 'blue');

            plink = vis_links.selectAll("[link_type=protein_chain],[link_type=chain_chain]");
            plink.style("stroke-dasharray", ("3,3"));

            xlink = vis_links.selectAll("[link_type=real],[link_type=pseudoknot],[link_type=protein_chain],[link_type=chain_chain],[link_type=label_link],[link_type=backbone],[link_type=basepair],[link_type=fake],[link_type=intermolecule]");
            //xlink = all_links;

            domain = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
            var colors = d3.scale.category10().domain(domain);

            node_mouseup = function(d) {
                if (mousedown_node) {
                    mouseup_node = d;

                    if (mouseup_node == mousedown_node) { resetMouseVars(); return; }
                    var new_link = {source: mousedown_node, target: mouseup_node, link_type: 'basepair', value: 1, uid:generateUUID()};

                    for (i = 0; i < graph.links.length; i++) {
                        if ((graph.links[i].source == mousedown_node)  || 
                            (graph.links[i].target == mousedown_node) ||
                           (graph.links[i].source == mouseup_node) ||
                           (graph.links[i].target == mouseup_node)) {

                                //console.log('graph.links[i].link_type', graph.links[i].link_type);

                                if (graph.links[i].link_type == 'basepair' || graph.links[i].link_type == 'pseudoknot') {
                                    console.log('basepair_exists');
                                    return;
                                }
                            }

                            if (((graph.links[i].source == mouseup_node)  && 
                                 (graph.links[i].target == mousedown_node)) ||
                                 ((graph.links[i].source == mousedown_node)  && 
                                  (graph.links[i].target == mouseup_node))) {
                                      if (graph.links[i].link_type == 'backbone') {
                                          console.log('backbone exists');
                                          return;
                                      }
                        }
                    }


                    // this means we have a new json, which means we have
                    // to recalculate the structure and change the colors
                    // appropriately
                    //
                    // send ajax request to forna
                    if (new_link.source.rna == new_link.target.rna) {
                        r = new_link.source.rna;
                        console.log('r', r);

                        r.pairtable[new_link.source.num] = new_link.target.num;
                        r.pairtable[new_link.target.num] = new_link.source.num;

                        positions = r.get_positions();
                        uids = r.get_uids();

                        r.recalculate_elements()
                        .elements_to_json()
                        .add_pseudoknots()
                        .add_positions(positions)
                        .add_uids(uids)
                        .reinforce_stems()
                        .reinforce_loops();

                    } else {
                        //Add an extra link
                        console.log('adding link:', new_link);
                        new_link.link_type = 'intermolecule';
                        self.extraLinks.push(new_link);
                        console.log('self.extraLinks');
                    }
                    self.recalculateGraph();
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

            };

            link_click = function(d) {
                if (!shift_keydown) {
                    return;
                }

                index = graph.links.indexOf(d);

                if (index > -1) {
                    //remove a link
                    //graph.links.splice(index, 1);

                    // there should be two cases
                    // 1. The link is within a single molecule
                    console.log('removing:', d);
                    console.log('self.rnas:', self.rnas);
                    console.log('d.source.rna:', d.source.rna);

                    if (d.source.rna == d.target.rna) {
                        r = d.source.rna;
                        console.log('r.pairtable', r.pairtable);

                        r.pairtable[d.source.num] = 0;
                        r.pairtable[d.target.num] = 0;

                        positions = r.get_positions();
                        uids = r.get_uids();

                        console.log('uids', uids);

                        r.recalculate_elements()
                        .elements_to_json()
                        .add_pseudoknots()
                        .add_positions(positions)
                        .add_uids(uids)
                        .reinforce_stems()
                        .reinforce_loops();

                    } else {
                        // 2. The link is between two different molecules
                        extraLinkIndex = self.extraLinks.indexOf(d);

                        console.log('extraLinkIndex:', extraLinkIndex);
                        self.extraLinks.splice(extraLinkIndex, 1);
                    }

                    self.recalculateGraph();
                }

                update();

            };

            var gnodes = vis_nodes.selectAll('g.gnode')
            .data(graph.nodes, node_key);
            //.attr('pointer-events', 'all');

            gnodes_enter = gnodes.enter()
            .append('g')
            .classed('noselect', true)
            .classed('gnode', true);
            //.each(function(d) { console.log('entering', d); })

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
                //node_fills.pseudo = 'transparent';
                node_fills.pseudo = 'transparent';
                node_fills.middle = 'transparent';

                return node_fills[d.node_type];
            };

            node_stroke = function(d) {
                node_strokes = {};

                node_strokes.nucleotide = 'gray';
                node_strokes.label = 'transparent';
                node_strokes.pseudo = 'transparent';
                node_strokes.middle = 'transparent';

                return node_strokes[d.node_type];
            };

            node_tooltip = function(d) {
                node_tooltips = {};

                node_tooltips.nucleotide = d.num;
                node_tooltips.label = '';
                node_tooltips.pseudo = '';
                node_tooltips.middle = '';

                return node_tooltips[d.node_type];
            };


            xlink.on('click', link_click);

            circle_update = gnodes.select('circle');
            //console.log('circle_update:', circle_update);

            
            var node = gnodes_enter.append("svg:circle")
            .attr("class", "node")
            .attr("r", function(d) {if (d.node_type == 'middle') return 0; else return 6;})
            .attr("node_type", function(d) { return d.node_type; })
            .style("stroke", node_stroke)
            .style('stroke-width', self.displayParameters.nodeStrokeWidth)
            .style("fill", node_fill);
            
            var labels = gnodes_enter.append("text")
            .text(function(d) { return d.name; })
            .attr('text-anchor', 'middle')
            .attr('font-size', 8.0)
            .attr('font-weight', 'bold')
            .attr('y', 2.5)
            .attr('fill', self.displayParameters.nodeLabelFill)
            .attr('class', 'node-label')
            .attr("label_type", function(d) { return d.node_type; })
            .append("svg:title")
            .text(function(d) { return d.num; });

            node.append("svg:title")
            .text(function(d) { return d.num; });

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
            
        self.changeColorScheme(self.colorScheme);

        if (self.animation) {
          force.start();
        }
    };
    
    setPlottingArea();
    setSize();
}
