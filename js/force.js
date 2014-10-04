
var w = 800,
    h = 600,
    fill = d3.scale.category20();

var xScale = d3.scale.linear()
    .domain([0,w]);
var yScale = d3.scale.linear()
    .domain([0,h]);

function setSize() {
    var svgStyles = window.getComputedStyle(svg.node());
    var svgW = parseInt(svgStyles["width"]);
    var svgH = parseInt(svgStyles["height"]);
    console.log("setting size", svgW, svgH)
    
    //Set the output range of the scales
    xScale.range([0, svgW]);
    yScale.range([0, svgH]);
    
    //re-attach the scales to the zoom behaviour
    zoomer.x(xScale)
          .y(yScale);
    
    //resize the background
    rect.attr("width", svgW)
            .attr("height", svgH);
   
    //console.log(xScale.range(), yScale.range());
    //redraw();
}

//adapt size to window changes:
window.addEventListener("resize", setSize, false)


  function dragstarted(d) {
      d3.event.sourceEvent.stopPropagation();
      d3.select(this).classed("dragging", true);
  }

  function dragged(d) {
      d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
  }

  function dragended(d) {
      d3.select(this).classed("dragging", false);
  }

zoomer = d3.behavior.zoom().
        scaleExtent([0.1,10]).
        on("zoom", redraw);

var svg = d3.select("body")
          .append("svg:svg")
      .attr("width", w)
      .attr("height", h);

var graph = svg.append('svg:g')
  .call(zoomer);

var rect = graph.append('svg:rect')
    .attr('width', w)
    .attr('height', h)
    .attr('stroke-width', 1)
    .attr('fill', 'white')
    .attr('stroke', 'grey')
    .attr("pointer-events", "all");


var vis = graph.append("svg:g");

function redraw() {
  console.log("here", d3.event.translate, d3.event.scale);
  vis.attr("transform",
      "translate(" + d3.event.translate + ")"
      + " scale(" + d3.event.scale + ")");
}

d3.json("bp.json", function(error, json) {
  var force = d3.layout.force()
      .charge(-20)
      .linkDistance(function(d) { return 15 * d.value; })
      .linkStrength(function(d) { return 8; })
      .nodes(json.nodes)
      .links(json.links)
      .gravity(0.005)
      .chargeDistance(250)
      .friction(.970)
      .size([w, h])
      .start();

  var link = vis.selectAll("line.link")
      .data(json.links)
    .enter().append("svg:line")
      .attr("class", "link")
      .style("stroke-width", function(d) { 
          //return Math.sqrt(d.value); 
          if (d.value != 1) return 0;
          else return Math.sqrt(d.value); })
      .attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

  domain = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
      var colors = d3.scale.category10().domain(domain);

      var drag = force.drag()
      .origin(function(d) { return d; })
      .on("dragstart", dragstarted)
      .on("drag", dragged)
      .on("dragend", dragended);
    
  var node = vis.selectAll("circle.node")
      .data(json.nodes)
    .enter().append("svg:circle")
      .attr("class", "node")
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; })
      .attr("r", 5)
      .style("stroke", function(d) { if (domain.indexOf(d.color) == -1) {
          return "transparent";
      }
          else {return 'white';}
      })
  .style("fill", function(d) { if (domain.indexOf(d.color) == -1) {
      return 'transparent';
  } else {return colors(d.color); }})
      .call(drag);

  node.append("svg:title")
      .text(function(d) { return d.name; });

  vis.style("opacity", 1e-6)
    .transition()
      .duration(1000)
      .style("opacity", 1);

  
  force.on("tick", function() {
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
  });


  setSize();
});
