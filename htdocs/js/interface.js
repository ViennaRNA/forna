serverURL = "/forna/api";

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
}

$('.alert').on('click', function(e) {
  $(this).hide();
});

showError = function(text, id) {
  document.getElementById(id).innerHTML = text;
  $('#' + id).show();
}

// Knockout view model for RNA
function RNAViewModel() {
  var self = this;
  
  self.graph = null;
  self.input = ko.observable('CGGCCCC\n((...))');
  
  self.colors = ko.observable('structure'); // the color scheme setting can be structure/sequence/pairprobabilities
  self.label = ko.observable('position'); // the label scheme can be sequence/position
  self.temperature = ko.observable("37");

  self.colors.subscribe(function(newValue) {
      if (self.graph == null) {
          console.log("graph is null");
    } else {
        //console.log("self.graph:", self.graph.changeColorScheme);
        self.graph.changeColorScheme(newValue);

        console.log("newValue:", newValue);
    }
  });

  self.ss = ko.computed(function() {
    return this.input().replace(/^[\r\n]+|[\r\n]+$/g,"").split("\n"); //remove leading/trailing newlines and split in between
  }, this);
  
  self.submit = function() {
    $('#inputError').hide();
    if (self.ss().length != 2) {
      showError("Please insert an RNA sequence followed by a structure in the text field.", "inputError");
    } else if (/[^AUGC]/g.test(self.ss()[0])) {
      showError("Sequences just consist of A,U,G and C.", "inputError");
    } else if (/[^\.\(\)]/g.test(self.ss()[1])) {
      showError("Structures just consist of brackets and dots.", "inputError");
    } else {
      ajax(serverURL + '/struct_graph', 'POST', JSON.stringify( {seq: self.ss()[0], struct: self.ss()[1]} )).success( function(data) {
        self.graph = new Graph(data);
        $('#output-tab').show();
      }).error( function(jqXHR) { 
        showError("Ajax error (" + jqXHR.status + ") Please check your input!", "inputError");
      });
    }
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
    
    // TODO adopt width and height in <svg> tag to get the whole calculated area drawn
    //add xml declaration
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

    //convert svg source to URI data scheme.
    //var url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(source);

    //set url value to a element's href attribute.
    //window.open(url, 'download');
    var file = new Blob([source], {type: "data:image/svg+xml;charset=utf-8"});
    saveAs(file, "rna.svg");
  }
}

// bind the model to the ui
var ViewModel = new RNAViewModel();
ko.applyBindings(ViewModel);
