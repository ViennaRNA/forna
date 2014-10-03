var width = 1200,
    height = 800;

var color = d3.scale.category20();

var force = d3.layout.force()
    .charge(-120)
    .linkDistance(30)
    .size([width, height]);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

d3.json("bp.json", function(error, graph) {
  force
      .charge( function(d) {
          if (d.name == -1) {
              console.log(d)
              return 0;
            }
          else return -20; } )
      .linkDistance(function (d) {return 15 * d.value})
      .linkStrength(function (d) { return 8; })
      .nodes(graph.nodes)
      .links(graph.links)
      .gravity(0.005)
      .chargeDistance(250)
      .friction(.970)
      .alpha(10)
      .start();

  var link = svg.selectAll(".link")
      .data(graph.links)
    .enter().append("line")
      .attr("class", "link")
      .style("stroke-width", function(d) { 
            return Math.sqrt(d.value); 
          if (d.value != 1) return 0; else return Math.sqrt(d.value); });

  domain = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  var colors = d3.scale.category10().domain(domain);

  var node = svg.selectAll(".node")
      .data(graph.nodes)
    .enter().append("circle")
      .attr("class", "node")
      .attr("r", 5)
      .style("stroke", function(d) { if (domain.indexOf(d.color == -1)) {
          return "transparent";
      }})
      .style("fill", function(d) { if (domain.indexOf(d.color) == -1) {
                                    return 'transparent';
      } else {return colors(d.color); }})
      .call(force.drag);

  node.append("title")
      .text(function(d) { return d.name; });

  force.on("tick", function() {
    //force.alpha(0.01);
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
  });

  var k = 0;
  while ((force.alpha() > 1e-2) && (k < 150)) {
          force.tick(),
         k = k + 1;
  }

});
