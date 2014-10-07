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

// bind the model to the ui
ko.applyBindings(new RNAViewModel());
