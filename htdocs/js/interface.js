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
        console.log("ajax error " + jqXHR.status);
    }
  };
  return $.ajax(request);
};

//an observable that retrieves its value when first bound
ko.onDemandObservable = function(callback, target) {
  var _value = ko.observable();  //private observable

  var result = ko.dependentObservable({
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

ko.bindingHandlers.showModal = {
    init: function (element, valueAccessor) {
    },
    update: function (element, valueAccessor) {
        var value = valueAccessor();
        if (ko.utils.unwrapObservable(value)) {
            $(element).modal('show');
                                // this is to focus input field inside dialog
            $("input", element).focus();
        }
        else {
            $(element).modal('hide');
        }
    }
};

// initialize bootstrap tooltips
$("[data-toggle=tooltip]").tooltip();

$('.alert').on('click', function(e) {
  ViewModel.inputError('');
  $('#Submit').button('reset');
});

function RNA() {
  var self = this;
  
  self.header = ko.observable('');
  self.sequence = ko.observable('');
  self.structure = ko.onDemandObservable(function() {
    if ((self.sequence() != '') && (self.structure() == '')) {
      ajax(serverURL + '/mfe_struct', 'POST', JSON.stringify( {seq: self.sequence()} )).success( function(data) {
        self.structure(data);
        self.json();
      }).error( function(jqXHR) {
        ViewModel.newInputError("Ajax error (" + jqXHR.status + ") Please check the input of: " + self.header());
      });
    }
  }, self);
  
  self.structure('');
  
  self.json = ko.onDemandObservable(function() {
    if ((self.sequence() != '') && (self.structure() != '')) {
      ajax(serverURL + '/struct_graph', 'POST', JSON.stringify( {seq: self.sequence(), struct: self.structure()} )).success( function(data) {
        self.json(data);
        // add a new molecule to the graph
        ViewModel.graph.addNodes(self.json());
        ViewModel.graph.changeColorScheme(ViewModel.colors());
      }).error( function(jqXHR) {
        ViewModel.newInputError("Ajax error (" + jqXHR.status + ") Please check the input of: " + self.header());
      });
    }
  }, self);
  
  self.loaded = ko.computed( function() {
    return (self.structure.loaded() && self.json.loaded());
  });
  
}

// Knockout view model for RNA
function RNAViewModel() {
  var self = this;
  
  self.graph = new Graph();
  self.molecules = ko.observableArray([]);
  /*jshint multistr: true */
  self.input = ko.observable(
      '>test\nCGCUUCAUAUAAUCCUAAUGAUAUGGUUUGGGAGUUUCUACCAAGAGCCUUAAACUCUUGAUUAUGAAGUG\n\
((((((((((..((((((.........))))))......).((((((.......))))))..)))))))))'
  );
  
  self.colors = ko.observable('structure'); // the color scheme setting can be structure/sequence/pairprobabilities

  self.colors.subscribe(function(newValue) {

      if (self.graph === null) {
          console.log("graph is null");
    } else {
        //console.log("self.graph:", self.graph.changeColorScheme);
        self.graph.changeColorScheme(newValue);
    }
  });
  
  self.addMolecule = function() {
    self.inputError('');
    $('#Submit').button('reset');
    $('#add').modal('show');
  };
  
  self.showAbout = function() {
    $('#about').modal('show');
  };
  
  self.inputError = ko.observable('');
  self.newInputError = function(message) {
    self.inputError([self.inputError, message].join("\n"));
  }
  
  self.loaded = ko.computed(function() {
    var returnValue = true;
    self.molecules().forEach(function(rna) {
      returnValue = (returnValue && rna.loaded());
    });
    // here the code to hide modal if everything is loaded correctly
    if(returnValue) {
      $('#add').modal('hide');
    }
    return returnValue;
  });
  
  self.submit = function() {
    $('#Submit').button('loading');
    //remove leading/trailing/inbeteen newlines and split in at the remaining ones
    var array = self.input().replace(/[\r\n]+/g,"\n").replace(/^[\r\n]+|[\r\n]+$/g,"").split("\n");
    var rna;
    
    array.forEach( function(line) {
      line = line.replace(/^[\s]+|[\s]+$/g,""); // remove leading/trailing whitespaces
      console.log(line);
      // check if it is a fasta header
      if (line.substring(0, 1) == '>') {
        // this is a header
        rna = new RNA();
        self.molecules.push(rna);
        rna.header(line.substring(1));
      } else if (/[ACGTUWSMKRYBDHV]/g.test(line.substring(0, 1))) {
        // this is a sequence
        if (rna === undefined) {
          rna = new RNA();
          self.molecules.push(rna);
          rna.header('rna');
        }
        rna.sequence(rna.sequence().concat(line));
      } else if (/[\(\)\.\{\}\[\]]/g.test(line.substring(0, 1))) {
        // this is a structure
        rna.structure(rna.structure().concat(line));
      } else {
        self.newInputError("You did not enter valid sequences, structures or fasta");
      }
    });
    
    // now check for missing structures and get them, otherwise call json directly
    self.molecules().forEach( function(rna) {
      if (rna.structure() == '') {
        rna.structure.refresh();
      } else {
        rna.json();
      }
    });
  }
  
  self.clearGraph = function() {
    // delete all nodes
    self.graph.clearNodes();
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
var ViewModel = new RNAViewModel();
ko.applyBindings(ViewModel);
