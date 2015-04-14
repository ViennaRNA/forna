RNA Secondary Structure Visualization Using a Force Directed Graph Layout
=========================================================================

<div style="float: right;">
    <img src="https://raw.githubusercontent.com/pkerpedjiev/forna/master/htdocs/img/favicon-192x192.png" alt="forna logo" title="forna logo" width="150" align="right" />
</div>

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
structure manipulation library and the provided ``forna.py`` script. We heavily
depend on the python bindings of the [ViennaRNA](http://www.tbi.univie.ac.at/RNA/) package.

#### Usage ####

Click on ``Add Molecule`` to draw a new secondary structure. The input should
contain a sequence and a secondary structure in dot-bracket notation:

```
GCUUCAUAUAAUCCUAAUGAUAUGGUUUGGGAGUUUCUACCAAGAGCCUUAAACUCUUGAUUAUGAAGUG
((((((((((..((((((.........))))))......).((((((.......))))))..)))))))))
```

You can also use the **FASTA** format to add multiple molecule at once. If you do
not enter a structure, it will calculate the MFE structure at 37°C for you.

In the FASTA header you can specify a name and optionally also the number of the first or last nucleotide:

```
>name|start=5|end=60
```

**Zooming** can be accomplished using the mouse wheel.
Dragging the canvas leads to **panning**.

##### Circular RNA #####

Circular RNA molecules can be specified by adding an asterisk(*) to the end
of the structure. This simply adds a link between the first and last nucleotides.
Example:

```
>x
ACCCAAACAAAAAAAAAAAAAA
...((...))..((..))...*
```

##### Colors #####

###### Position ######

Color the nucleotides according to their position in the molecule. Lower numbered
nucleotides are closer to the 5' end and are colored green. Nucleotides in the middle
are colored yellow whereas nucleotides near the 3' end are colored red.

###### Structure ######

Color the nucleotides according to the type of structure that they are in:

**Green**: Stems (canonical helices)
**Red**: Multiloops (junctions)
**Yellow**: Interior Loops
**Blue**: Hairpin loops
**Orange**: 5' unpaired region
**Light Blue**: 3' unpaired region

###### Sequence ######

Color according to the nucleotide types: 

**Yellow**: Adenine
**Green**: Cytosine
**Blue**: Uridine
**Red**: Guanine

#### Runing Locally ####

The server can be run locally on your machine. It depends on the [forgi](http://www.tbi.univie.ac.at/~pkerp/forgi/) library and needs the [ViennaRNA](http://www.tbi.univie.ac.at/RNA/) package installed with python bindings enabled. 
Further, you need to downlaod the [MC-Annotate](http://major.iric.ca/MajorLabEn/MC-Tools.html) program
and make it executeable by the server script.
To run it use the following command:

```shell
python forna_server.py -s -d
```

Documentation about the available options is provided using the ``-h`` option.

#### APIs ####

We provide the opportunity to add an RNA molecule from supported platforms using URL encoded queries.
At the moment the ViennaRNA webservices and the RNAcentral database are supported as well as URL
encoded data. Please contact us if you have suggestions for additional platforms.

To add a molecule using the RNAcentral-ID you can just call forna like this:
``forna-domain``/?id=RNAcentral/``RNAcentral-ID``
eg: [http://nibiru.tbi.univie.ac.at/forna/forna.html?id=RNAcentral/URS0000000001](http://nibiru.tbi.univie.ac.at/forna/forna.html?id=RNAcentral/URS0000000001)

To include the data directly in the URL, two formats are available:
``forna-domain``/?id=fasta&file=``fasta-file``
eg: [http://nibiru.tbi.univie.ac.at/forna/forna.html?id=fasta&file=>header\nAACGUUAGUU\n\(\(\(....\)\)\)](http://nibiru.tbi.univie.ac.at/forna/forna.html?id=fasta&file=>header\nAACGUUAGUU\n\(\(\(....\)\)\))
``forna-domain``/?id=url/``molecule-name``&sequence=``sequence``&structure=``structure``
eg: [http://nibiru.tbi.univie.ac.at/forna/forna.html?id=url/name&sequence=AACGUUAGUU&structure=\(\(\(....\)\)\)](http://nibiru.tbi.univie.ac.at/forna/forna.html?id=url/name&sequence=AACGUUAGUU&structure=\(\(\(....\)\)\))
In the first case it's possible to input multiple molecules at once by having them all in a single string which is passed to the 'file' query. Note that in both cases the
structure is optional. If it's not provided, RNAfold will calculate and display the MFE structure.

For any platform it is also optionally possible to append a colors query using the custom color format:
``forna-domain``/?id=fasta&file=``fasta-file``&colors=``custom-color-format``
eg: [http://nibiru.tbi.univie.ac.at/forna/forna.html?id=fasta&file=>header\nAACGUUAGUU\n\(\(\(....\)\)\)&colors=>header\n0\n0.1\n0.2\n0.3\n0.4\n0.5\n0.6\n0.7\n0.8\n0.9\n1](http://nibiru.tbi.univie.ac.at/forna/forna.html?id=fasta&file=>header\nAACGUUAGUU\n\(\(\(....\)\)\)&colors=>header\n0\n0.1\n0.2\n0.3\n0.4\n0.5\n0.6\n0.7\n0.8\n0.9\n1)

This way it's also possible to embed forna on a website with a preloaded molecule.

```
<iframe src="forna/index.html?id=RNAcentral/URS0000000001" align="center" height="650px" width="100%" 
seamless='seamless' frameBorder="0" AllowFullScreen></iframe>
```

#### Contact ####

Questions and/or comments can be sent to <forna@tbi.univie.ac.at>

#### Acknowledgement ####

This project is, among others, supported by the European Commission under the Environment Theme of the 7th Framework Program for Research and Technological Development (Grant agreement no: 323987).
