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
}

$('.alert').on('click', function(e) {
  $(this).hide();
});

// Knockout view model for RNA
function RNAViewModel() {
  var self = this;
  
  self.input = ko.observable('');
  self.ss = ko.computed(function() {
    return this.input().split("\n");
  }, this);
  
  self.submit = function() {
    $('#inputError').hide();
    ajax(serverURL + '/struct_graph', 'POST', JSON.stringify( {seq: self.ss()[0], struct: self.ss()[1]} )).success( function(data) {
      graph = new Graph(data);
    }).error( function(jqXHR) { 
      document.getElementById("inputError").innerHTML = "Ajax error: " + jqXHR.status;
      $('#inputError').show();
    });
  }
}

$(document).ready(function() {
        $("#save_as_svg").click(function() { 
                console.log("hello"); 
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

                        //convert svg source to URI data scheme.
                        var url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(source);

                        //set url value to a element's href attribute.
                        location.href = url;
                });
        });
// bind the model to the ui
ko.applyBindings(new RNAViewModel());
