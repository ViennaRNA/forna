/* interface.js
* Interface logic for the RNA Secondary Structure Visualization Using a Force Directed Graph Layout
*
* Author: Stefan Hammer <jango@tbi.univie.ac.at>
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

//an observable that retrieves its value when first bound
ko.onDemandObservable = function(callback, target) {
    var _value = ko.observable();  //private observable

    var result = ko.computed({
        read: function() {
            //if it has not been loaded, execute the supplied function
            if (!result.loaded()) {
                callback.call(target);
            }
            //always return the current value
            return _value();
        },
        write: function(newValue) {
            //indicate that the value is now loaded and set it
            result.loaded(true);
            _value(newValue);
        },
        deferEvaluation: true  //do not evaluate immediately when created
    });

    //expose the current state, which can be bound against
    result.loaded = ko.observable();
    //load it again
    result.refresh = function() {
        result.loaded(false);
    };

    return result;
};


// initialize bootstrap tooltips
$("[data-toggle=tooltip]").tooltip();

function RNA(sequence, structure, header) {
  var self = this;
  console.log(["New RNA with: ", sequence, structure, header].join('\n'));
  self.header = ko.observable(header);
  
  self.sequence = ko.observable(sequence);
  
  self.done = ko.observable(false);
  
  self.structure = ko.onDemandObservable( function() {
      ajax(serverURL + '/mfe_struct', 'POST', JSON.stringify( {seq: self.sequence()} )).success( function(data) {
        self.structure(data);
        self.json.refresh();
        self.json();
      }).error( function(jqXHR) {
        addView.newInputError(self.header() + ": ERROR (" + jqXHR.status + ") - " + jqXHR.responseText );
      });
    }, self 
  );
  
  self.nodes = ko.observableArray([]);
  self.links = ko.observableArray([]);
  
  self.get_json = function() {
    ajax(serverURL + '/struct_graph', 'POST', JSON.stringify( {seq: self.sequence(), struct: self.structure()} )).success( function(data) {
      self.nodes(data.nodes);
      self.links(data.links);
      self.done(true);
    }).error( function(jqXHR) {
      addView.newInputError(self.header() + ": ERROR (" + jqXHR.status + ") - " + jqXHR.responseText );
    });
  }
  
  if (structure == '') {
    self.structure.refresh();
    self.structure();
  } else {
    self.structure(structure);
    self.get_json();
  }
  
  self.loaded = ko.computed( function() {
    return (self.structure.loaded() && self.done());
  });
}

function AddViewModel() {
  var self = this;
  
  self.input = ko.observable(
      '>test\nCGCUUCAUAUAAUCCUAAUGAUAUGGUUUGGGAGUUUCUACCAAGAGCCUUAAACUCUUGAUUAUGAAGUG\n\
((((((((((..((((((.........))))))......).((((((.......))))))..)))))))))'
  );
  
  self.newMolecules = ko.observableArray([]);
  
  self.inputError = ko.observable('');
  self.newInputError = function(message) {
    if (self.inputError() == '') {
      self.inputError(message);
    } else {
      self.inputError([self.inputError(), message].join("<br>"));
    }
  }
  
  self.submitted = ko.observable(false);
  self.loaded = ko.computed(function() {
    var returnValue = true;
    self.newMolecules().forEach(function(rna) {
      returnValue = (returnValue && rna.loaded());
    });
    returnValue = (returnValue && self.submitted());
    
    if (self.inputError().length > 0) {
      $('#Submit').button('reset');
      console.log("There was an error, button is reset");
    }
    
    // here the code to hide modal and push the new molecules if everything is loaded correctly
    if((returnValue) && (self.inputError().length == 0)) {
      console.log("everything should be loaded now, updating graph!");
      $('#add').modal('hide');
      rnaView.addMolecules(self.newMolecules());
      self.newMolecules([]);
    }
    return (returnValue);
  }, self);
    
  self.submit = function() {
    self.submitted(false);
    $('#Submit').button('loading');
    self.inputError('');
    self.newMolecules([]);
    //remove leading/trailing/inbeteen newlines and split in at the remaining ones
    var lines = self.input().replace(/[\r\n]+/g,"\n").replace(/^[\r\n]+|[\r\n]+$/g,"").split("\n");
    
    function tmpRNA () {
      var self = this;
      self.sequence = '';
      self.structure = '';
      self.header = 'rna';
    }
    var rna;
    
    lines.forEach( function(line) {
      line = line.replace(/^[\s]+|[\s]+$/g,""); // remove leading/trailing whitespaces
      // check if it is a fasta header
      if (line.substring(0, 1) == '>') {
        // this is a header
        if (rna !== undefined) {
          // initialize real rna object
          console.log("Add new rna molecule to newMolecules")
          self.newMolecules.push(new RNA(rna.sequence, rna.structure, rna.header));
        }
        rna = new tmpRNA();
        rna.header = line.substring(1);
      } else if (/[ACGTUWSMKRYBDHV]/g.test(line.substring(0, 1))) {
        // this is a sequence
        if (rna === undefined) {
          rna = new tmpRNA();
        }
        rna.sequence = rna.sequence.concat(line);
      } else if (/[\(\)\.\{\}\[\]]/g.test(line.substring(0, 1))) {
        // this is a structure
        rna.structure = rna.structure.concat(line);
      } else {
        self.newInputError("You did not enter valid sequences, structures or fasta");
      }
    });
    // also initialize the last object
    console.log("Add new rna molecule to newMolecules")
    self.newMolecules.push(new RNA(rna.sequence, rna.structure, rna.header));
    // unlock the submitted
    self.submitted(true);
  }
}

// Knockout view model for RNA
function RNAViewModel() {
  var self = this;
  
  self.graph = new Graph();
  self.molecules = ko.observableArray([]);
  
  self.molecules.subscribe( function(newValue) {
    console.log("updating graph after molecules");
    var links = [];
    var nodes = [];
    // TODO update link.source and link.target ID!
    newValue.forEach( function(rna) {
      nodes = nodes.concat(rna.nodes());
      links = links.concat(rna.links());
    });
    self.graph.graph.nodes = nodes;
    self.graph.graph.links = links;
    self.graph.update();
  });
  
  self.addMolecules = function(array) {
    console.log("updating molecules array");
    array.forEach( function(rna) {
      self.molecules().push(rna);
    });
    self.molecules.valueHasMutated();
    self.graph.changeColorScheme(self.colors());
  }
  /*jshint multistr: true */
  
  self.colors = ko.observable('structure'); // the color scheme setting can be structure/sequence/pairprobabilities

  self.colors.subscribe(function(newValue) {

      if (self.graph === null) {
          console.log("graph is null, won't update the color");
    } else {
        //console.log("self.graph:", self.graph.changeColorScheme);
        self.graph.changeColorScheme(newValue);
    }
  });
  
  self.showAdd = function() {
    $('#Submit').button('reset');
    $('#add').modal('show');
  };
  
  self.showAbout = function() {
    $('#about').modal('show');
  };
  
  self.clearGraph = function() {
    // delete all nodes
    self.molecules([]);
  }
  
  self.saveSVG = function() {
    console.log("saving svg...");
    var svg = document.getElementById('plotting-area');

    //get svg source.
    var serializer = new XMLSerializer();
    var source = serializer.serializeToString(svg);

    //add name spaces.
    if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }
    
    //add xml declaration
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

    // use FileSave to get a downloadable SVG File
    var file = new Blob([source], {type: "data:image/svg+xml;charset=utf-8"});
    saveAs(file, "rna.svg");
  };
}

// bind the model to the ui
var rnaView = new RNAViewModel();
var addView = new AddViewModel();
ko.applyBindings(rnaView, document.getElementById('main'));
ko.applyBindings(addView, document.getElementById('add'));
