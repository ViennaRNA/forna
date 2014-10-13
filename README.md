forna - RNA Secondary Structure Visualization Using a Force Directed Graph
==========================================================================

#### Overview ####

The ``forna`` package provides a web interface for displaying RNA secondary
structures using the [force-directed graph
layout](https://github.com/mbostock/d3/wiki/Force-Layout) provided by the
[d3.js visualization library](http://d3js.org/). 

The front end makes use of [Bootstrap](getbootstrap.com) and
[Knockout.js](http://knockoutjs.com/) for the user interfact while the back end
uses [Flask](http://flask.pocoo.org/) to serve the static files and provide a
REST API. The RNA structure manipulation and graph construction is created
using the python [forgi](http://www.tbi.univie.ac.at/~pkerp/forgi/) RNA
structure manipulation library and the provided ``forna.py`` script.

#### Runing ####

The server can be run locally using the following command:

```shell
python restserver.py -s -d
```

Documentation about the available options is provided using the ``-h`` option.

#### Contact ####

Questions and/or comments can be sent to <pkerp@tbi.univie.ac.at>
