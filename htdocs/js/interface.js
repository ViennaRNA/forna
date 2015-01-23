/* interface.js
* Interface logic for the RNA Secondary Structure Visualization Using a Force Directed Graph Layout
*
* Author: Stefan Hammer <jango@tbi.univie.ac.at>
* Version: 0.1
* Date: 2014-10-15
*/

serverURL = "";

$(window).resize(function() {
 setPlottingArea();
});

setPlottingArea = function() {
  var chartheight = $(window).height();
  if (!document.fullscreenElement &&    // alternative standard method
    !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) {
    chartheight = chartheight-2;
  }
  
  $("#plotting-area").height(chartheight);
  var chartwidth = $("#chart").width();
  $("#plotting-area").width(chartwidth);
};

// thanks to https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Using_full_screen_mode
function toggleFullScreen(id) {
  var elem = document.getElementById(id);
  
  if (!document.fullscreenElement &&    // alternative standard method
      !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) {  // current working methods
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  } else {
    exitFullscreen();
  }
}

function exitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  }
}

// prevent popups to dissapear automatically
$('.dropdown-menu input, .dropdown-menu label').click(function(e) {
    e.stopPropagation();
});

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

// initialize bootstrap tooltips
$("[data-toggle=tooltip]").tooltip();

function RNA(sequence, structure, header , newError) {
  var self = this;
  console.log(["New RNA with: ", sequence, structure, header].join('\n'));

  self.header = ko.observable(header);
  self.done = ko.observable(false);
  
  self.structure = ko.onDemandObservable( function() {
        if (self.sequence() !== '') {
          ajax(serverURL + '/mfe_struct', 'POST', JSON.stringify( {seq: self.sequence()} )).success( function(data) {
            self.structure(data);
            self.json.refresh();
            self.json();
          }).error( function(jqXHR) {
            newError(self.header() + ": ERROR (" + jqXHR.status + ") - " + jqXHR.responseText );
          });
        }
    }, self 
  );

  self.sequence = ko.onDemandObservable( function() {
        if (self.structure() !== '') {
          ajax(serverURL + '/inverse_fold', 'POST', JSON.stringify( {struct: self.structure()} )).success( function(data) {
            self.sequence(data);
            self.json.refresh();
            self.json();
          }).error( function(jqXHR) {
            newError(self.header() + ": ERROR (" + jqXHR.status + ") - " + jqXHR.responseText );
          });
        }
    }, self 
  );
  
  self.json = ko.onDemandObservable( function() {
      ajax(serverURL + '/struct_positions', 'POST', JSON.stringify( {header: self.header(), seq: self.sequence(), struct: self.structure()} )).success( function(data) {
          //console.log('self.header', self.header());
        try {
            r = new RNAGraph(self.sequence(), self.structure(), self.header())
            .elements_to_json()
            .add_positions('nucleotide', data)
            .add_labels()
            .reinforce_stems()
            .reinforce_loops()
            .connect_fake_nodes();

            console.log('r', r);

            self.json(r);
            self.done(true);
        } catch (err) {
            newError(self.header() + ": ERROR: " + err );
        }
      }).error( function(jqXHR) {
        newError(self.header() + ": ERROR (" + jqXHR.status + ") - " + jqXHR.responseText );
      });
    }, self
  );

  if (sequence === '') {
      self.structure(structure);
      self.sequence.refresh();
      self.sequence();
  } else {
      self.sequence(sequence);
      
      if (structure === '') {
        self.structure.refresh();
        self.structure();
      } else {
        self.structure(structure);
        self.json.refresh();
        self.json();
      }
  }

  self.loaded = ko.computed( function() {
    return (self.structure.loaded() && self.sequence.loaded() && self.json.loaded() && self.done());
  });
}

function RNAManager( done, newError ) {
    var self = this;
    
    self.newMolecules = ko.observableArray([]);
    self.submitted = ko.observable(false);

    self.loaded = ko.computed(function() {
        var returnValue = true;
        self.newMolecules().forEach(function(rna) {
          returnValue = (returnValue && rna.loaded());
        });
        returnValue = (returnValue && self.submitted());

        // here the code to hide modal and push the new molecules if everything is loaded correctly
        // TODO check for erros?
        if(returnValue) {
          done();

          if (self.newMolecules().length > 0) {
              console.log('trying to add molecules');
              rnaView.addMolecules(self.newMolecules());
              self.reset();
          }
        }
        return (returnValue);
    });
    
    self.add = function(sequence, structure, header) {
        self.newMolecules().push(new RNA(sequence, structure, header, newError));
    };
    
    self.submit = function() {
        self.submitted(true);
    };
    
    self.reset = function() {
        self.newMolecules([]);
        self.submitted(false);
    }
}

function CustomColorScheme(text) {
    var self = this;
    console.log('Adding new color scheme');

    self.text = ko.observable(text);
    self.done = ko.observable(false);

    self.colorSchemeJson = ko.onDemandObservable( function() {
    }, self
    );

    self.loaded = ko.computed( function() {
        return (self.colorSchemeJson.loaded() && self.done());
    });
}

function ColorViewModel() {
    var self = this;

  self.input = ko.observable(
      '0.65 0.72 0.84');

  self.inputError = ko.observable('');
  self.submitted = ko.observable(false);
  self.colorSchemeJson = ko.observable({});

  self.newInputError = function(message) {
    if (self.inputError() === '') {
      self.inputError(message);
    } else {
      self.inputError([self.inputError(), message].join("<br>"));
    }
  };

  self.cancelColor = function() {
    $('#addColors').modal('hide');
    // reset errors
    self.inputError('');
    rnaView.graph.deaf = false;
  };

  self.colorSubmit = function() {
      self.submitted(false);
      self.inputError('');
      console.log('Clicked');
      console.log('self.input()', self.input());

      cs =  new ColorScheme(self.input());
      cs.normalizeColors();
      console.log('cs.colors_json:', cs.colors_json);

      rnaView.graph.addCustomColors(cs.colors_json);
      rnaView.colors('custom');
      rnaView.graph.changeColorScheme(rnaView.colors());

      $('#addColors').modal('hide');
      rnaView.graph.deaf = false;
  };
}

function AddPDBViewModel() {
  var self = this;

  self.inputError = ko.observable('');
  self.submitted = ko.observable(false);
  self.colorSchemeJson = ko.observable({});
  self.inputFile = ko.observable(null);

  self.newInputError = function(message) {
    if (self.inputError() === '') {
      self.inputError(message);
    } else {
      self.inputError([self.inputError(), message].join("<br>"));
    }
    $('#PDBSubmit').button('reset');
  };

  self.uploadPDB = function (file) {
      self.inputFile(file);
      console.log(file);
  };
  /*
  function progressHandlingFunction(e){
      if(e.lengthComputable){
          $('progress').attr({value:e.loaded,max:e.total});
      }
  }
  */
  self.cancelAddPDB = function() {
    $('#addPDB').modal('hide');
    // reset the file upload form
    $('#inputPDBFile').val('');
    self.inputFile(null);
    // reset errors
    self.inputError('');
    rnaView.graph.deaf = false;
  };

  self.submit = function() {
      self.submitted(false);
      self.inputError('');
      console.log('Clicked');
      $('#PDBSubmit').button('loading');
      //console.log('self.input()', self.inputFile());

      if (self.inputFile() === null) {
        self.newInputError("ERROR Please select a PDB file");
        return;
      }

      /*
      if (self.inputFile().type != 'chemical/x-pdb') {
        console.log('file_type:', self.inputFile().type);
        self.newInputError("ERROR: Invalid file type, please upload a PDB file");
        return;
      }
      */

      if (self.inputFile().size > 20000000) {
        self.newInputError("ERROR: Selected file is too large");
        return;
      }

      var formData = new FormData();
      // var xhr = new XMLHttpRequest();


      formData.append('pdb_file', self.inputFile(), self.inputFile().name);
      console.log("formData", formData);

      $.ajax({type: "POST",
                   url: serverURL + '/pdb_to_graph',
                   /*
                   xhr: function() {  // Custom XMLHttpRequest
                       var myXhr = $.ajaxSettings.xhr();
                       if(myXhr.upload){ // Check if upload property exists
                           myXhr.upload.addEventListener('progress',progressHandlingFunction, false); // For handling the progress of the upload
                       }
                       return myXhr;
                   },
                   */
                   data: formData,
                   success: function (data) {
                        $('#addPDB').modal('hide');
                        rnaView.graph.deaf = false;
                        data = JSON.parse(data);

                        mols_json = molecules_to_json(data);
                        console.log('mols_json', mols_json);

                        for (var i = 0; i < mols_json.graphs.length; i++)
                            rnaView.graph.addRNA(mols_json.graphs[i], true );

                        console.log('extraLinks.length:', mols_json.extraLinks.length);
                        for (i = 0; i < mols_json.extraLinks.length; i++)
                            rnaView.graph.extraLinks.push(mols_json.extraLinks[i]);

                        rnaView.graph.recalculateGraph();
                        rnaView.graph.update();

                        console.log('rnaView.graph:', rnaView.graph);


                        rnaView.animation(true);
                        // the extra links contain supplementary information
                        rnaView.graph.changeColorScheme(rnaView.colors());
                        
                   },
                   error: function (jqXHR) {
                        self.newInputError("ERROR (" + jqXHR.status + ") - " + jqXHR.responseText );
                   },
                   cache: false,
                   contentType: false,
                   processData: false
      });

      /*
      var a = ajax(serverURL + '/colors_to_json', 'POST', JSON.stringify( {text: self.input()} ))
      console.log('a', a);

        a.success( function(data) {
            console.log('data', data)
            $('#addColors').modal('hide');
            console.log('updating colors')

            self.colorSchemeJson(data);
            rnaView.graph.addCustomColors(self.colorSchemeJson());
            rnaView.graph.changeColorScheme(rnaView.colors());
        }).error( function(jqXHR) {
            console.log('error again')
            self.inputError("ERROR (" + jqXHR.status + ") - " + jqXHR.responseText );
            //$('#ColorSubmit').button('reset');
        });
    */
  };
}

function AddJSONViewModel() {
  var self = this;
  
  self.input = ko.observable('');
  self.inputFile = ko.observable(null);
  self.inputError = ko.observable('');

  self.newInputError = function(message) {
    if (self.inputError() === '') {
      self.inputError(message);
    } else {
      self.inputError([self.inputError(), message].join("<br>"));
    }
    $('#SubmitJSON').button('reset');
  };
  
  self.uploadJSON = function (file) {
    self.inputFile(file);
    console.log(file);
  };

  self.cancelAddJSON = function() {
    $('#addJSON').modal('hide');
    // reset the file upload form
    $('#inputJSONFile').val('');
    self.inputFile(null);
    // reset errors
    self.inputError('');
    rnaView.graph.deaf = false;
  };
  
  self.parseJSON = function(input) {
    try{
        var data = JSON.parse(self.input());
        var rnas = data.rnas;
        var extraLinks = data.extraLinks;
    } catch(err) {
        self.newInputError(err.message);
        return;
    }

    for (uid in rnas) {
        if (rnas[uid].type == 'rna') {
            r = new RNAGraph()

            r.seq = rnas[uid].seq;
            r.dotbracket = rnas[uid].dotbracket;
            r.circular = rnas[uid].circular;
            r.pairtable = rnas[uid].pairtable;
            r.uid = rnas[uid].uid;
            r.struct_name = rnas[uid].struct_name;
            r.nodes = rnas[uid].nodes;
            r.links = rnas[uid].links;
            r.rna_length = rnas[uid].rna_length;
            r.elements = rnas[uid].elements;
            r.nucs_to_nodes = rnas[uid].nucs_to_nodes;
            r.pseudoknot_pairs = rnas[uid].pseudoknot_pairs;
        } else {
            r = new ProteinGraph()
            r.size = rnas[uid].size;
            r.nodes = rnas[uid].nodes;
            r.uid = rnas[uid].uid;
        }

        rnaView.graph.addRNA(r, false);
    }

    extraLinks.forEach(function(link) {
        rnaView.graph.extraLinks.push(link);
    });

    rnaView.graph.recalculateGraph();
    rnaView.graph.update();

    console.log('rna', rnas)

        $('#SubmitJSON').button('reset');
        $('#addJSON').modal('hide');
        // reset the file upload form
        rnaView.graph.deaf = false;
  }
    
  self.submit = function() {
    $('#SubmitJSON').button('loading');
    
    if (self.inputFile() !== null) {
      var r = new FileReader();
      r.onload = function(e) {
        var content = e.target.result;
        console.log("Parsing JSON file", content);
	      self.parseJSON(content);
	      $('#inputJSONFile').val('');
        self.inputFile(null);
      }
      r.readAsText(self.inputFile());
    } 
    
    if (self.input() != '') {
      console.log("Parsing JSON string");
      self.parseJSON(self.input());
    }
  };
}

function AddDatabaseViewModel() {
  var self = this;
  
  self.extSeqID = ko.observable('');
  self.inputError = ko.observable('');
  
  var error = function(message) {
    self.inputError(message);
    $('#SubmitDB').button('reset');
  }
  
  var done = function() {
    console.log("everything should be loaded now, updating graph!");
    $('#addDB').modal('hide');
    rnaView.graph.deaf = false;
  };
  
  var rnaManager = new RNAManager( error, done );
  
  self.cancelAddDB = function() {
    $('#add').modal('hide');
    // reset the file upload form
    $('#inputFastaFile').val('');
    self.inputFile(null);
    // reset errors
    self.inputError('');
    rnaView.graph.deaf = false;
  };
  
  self.callSeachDB = function(d,e) {
    if(e.keyCode === 13){
      self.searchDB();
    }
    return true;
  };
  
  self.searchDB = function() {
    ajax('http://rnacentral.org/api/v1/rna/?external_id=' + self.extSeqID() + '&format=json', 'GET').success( function(data) {
        $('#searchDBLabel').removeClass("glyphicon-refresh");
        $('#searchDBLabel').removeClass("glyphicon-refresh-animate");
        $('#searchDBLabel').addClass("glyphicon-search");
        if (data.count == 1) {
          console.log("Added new rna molecule to newMolecules from External Database");
          self.newMolecules.push(new RNA(data.results[0].sequence, '', self.extSeqID()) );
          self.submitDB();
        }
        
      }).error( function(jqXHR) {
        alert('ERROR: ' + jqXHR);
      });
  };
  
  self.submitDB = function() {
    $('#Submit').button('loading');
    
    // do some processing and then enable start to submit
    self.submitted(true);
    self.extSeqID('');
  };
}



function AddViewModel() {
  var self = this;
  
  self.input = ko.observable(
      '>molecule_name\nCGCUUCAUAUAAUCCUAAUGAUAUGGUUUGGGAGUUUCUACCAAGAGCCUUAAACUCUUGAUUAUGAAGUG\n\
((((((((((..((((((.........))))))......).((((((.......))))))..)))))))))'
   
   /*
   '>\nAAAA\n.(.)*'
   '>m\nCUGCUCCACGCAAGGAGGUGGACUUAAGCGGCUCAUCCGGGUCUGCGAUAUCCACUGCGCGGUAUGCGCUCGCGAGUUCGAAUCUCGUCGCCAGUACACUGACUUCACUGGCGUGUCCGAGUGGUUAGGCAA\n..(((((((....(((((((((.....(((((((....))).))))....))))))((((.....))))..(((((.......)))))(((((((...........)))))))..)))..))))...)))..*'
   '>m\nA\n..(.)..(.)..*'
   '>molecule_name\nACCGGGUUU\n(((.(((...))).)))'
   '>molecule1\nAAAA\n(..)\n>molecule1\nCCCC\n(..)'
   '>molecule1\nAAAA\n(..)'
   '>molecule1\nAAAAAA\n(([))]'
   */
  );
  
  self.inputError = ko.observable('');
  self.inputFile = ko.observable(null);

  self.newInputError = function(message) {
    if (self.inputError() === '') {
      self.inputError(message);
    } else {
      self.inputError([self.inputError(), message].join("<br>"));
    }
    $('#Submit').button('reset');
  };
  
  var done = function() {
    console.log("everything should be loaded now, updating graph!");
    $('#add').modal('hide');
    rnaView.graph.deaf = false;
  };
  
  var rnaManager = new RNAManager( done, self.newInputError );
  
  self.uploadFasta = function (file) {
      self.inputFile(file);
      console.log(file);
  };

  self.cancelAddMolecule = function() {
    $('#add').modal('hide');
    // reset the file upload form
    $('#inputFastaFile').val('');
    self.inputFile(null);
    // reset errors
    self.inputError('');
    // reset Loader
    rnaManager.reset();
    rnaView.graph.deaf = false;
  };

  self.parseFasta = function(lines) {
      function tmpRNA () {
        var self = this;
        self.sequence = '';
        self.structure = '';
        self.header = 'rna';
      }
      var rna;
      
      console.log(lines);
      if (lines.length == 0) {
        self.newInputError("Please insert at least one Sequence or Structure, or choose a Fasta file!");
        return;
      }
      
      var BreakException= {};
      
      try {
        var countErrors = 0;
        
        lines.forEach( function(line) {
          line = line.replace(/[\s]/g,""); // remove any whitespaces
          // check if it is a fasta header
          if (line.substring(0, 1) == '>') {
            // this is a header
            if (rna !== undefined) {
              // initialize real rna object
              console.log("Added new rna molecule to newMolecules");
              rnaManager.add(rna.sequence, rna.structure, rna.header);
            }
            rna = new tmpRNA();
            rna.header = line.substring(1);
          } else if (/^[ACGTUWSMKRYBDHV]+$/.test(line)) {
            // this is a sequence
            if (rna === undefined) {
              rna = new tmpRNA();
            }
            rna.sequence = rna.sequence.concat(line);
          } else if (/^[\(\)\.\{\}\[\]\<\>\*]+$/.test(line)) {
            // this is a structure
            if (rna === undefined) {
              rna = new tmpRNA();
            }
            rna.structure = rna.structure.concat(line);
          } else {
            self.newInputError("Please check this line: ".concat(line.substring(0, 100)).concat(" ..."));
            if (countErrors > 5) {
              self.newInputError("[...]");
              throw BreakException;
            }
            countErrors += 1;
          }
        });
      } catch(e) {
        if (e !== BreakException) throw e;
      }
      // also initialize the last object
      console.log("Added new rna molecule to newMolecules");
      rnaManager.add(rna.sequence, rna.structure, rna.header);
      
      // unlock the submitted
      rnaManager.submit();
      $('#inputFastaFile').val('');
      self.inputFile(null);
  }
  
  self.submit = function() {
    $('#Submit').button('loading');
    rnaManager.reset();
    
    //remove leading/trailing/inbeteen newlines and split in at the remaining ones
    var lines = [];
    if (self.input() != '') {
      lines = self.input().replace(/[\r\n]+/g,"\n").replace(/^[\r\n]+|[\r\n]+$/g,"").split("\n");
    }
    
    if (self.inputFile() !== null) {
      var r = new FileReader();
      r.onload = function(e) {
        var content = e.target.result;
        console.log(content);
	      lines = lines.concat(content.replace(/[\r\n]+/g,"\n").replace(/^[\r\n]+|[\r\n]+$/g,"").split("\n"));
	      self.parseFasta(lines);
      }
      r.readAsText(self.inputFile());
    } else {
      self.parseFasta(lines);
    }
  };
}

// Knockout view model for RNA
function RNAViewModel() {
  var self = this;
  
  self.graph = new Graph("#chart");
  self.molecules = ko.observableArray([]);
  
  self.addMolecules = function(array) {
    // before we add molecules we need to enable animation
    self.animation(true);
    
    self.molecules().concat(array);
    // add a new molecule to the graph
    array.forEach( function(rna) {
      console.log(rna.header());
      self.graph.addNodes(rna.json());
    });
    self.graph.changeColorScheme(self.colors());
  };
  /*jshint multistr: true */
  
  self.colors = ko.observable('structure'); // the color scheme setting can be structure/sequence/pairprobabilities

  self.colors.subscribe(function(newValue) {

      if (self.graph === null) {
          console.log("graph is null, won't update the color");
    } else {
        if (newValue == 'custom') {
            console.log("Custom colors selected");
        }
        //console.log("self.graph:", self.graph.changeColorScheme);
        self.graph.changeColorScheme(newValue);
    }
  });
  
  self.animation = ko.observable(true);
  
  self.animation.subscribe( function(newValue) {
    if (self.graph === null) {
      console.log("graph is null, won't change the animation state");
    } else {
      if (newValue === true) {
        self.graph.startAnimation();
      } else {
        self.graph.stopAnimation();
      }
    }
  });
  
  self.friction = ko.observable(35);
  self.charge = ko.observable(-30);
  
  self.friction.subscribe( function(newValue) {
    if (self.graph === null) {
      console.log("graph is null, won't change the friction");
    } else {
      
      self.graph.setFriction(newValue/100);
    }
  });
  
  self.charge.subscribe( function(newValue) {
    if (self.graph === null) {
      console.log("graph is null, won't change the charge");
    } else {
      
        self.graph.setCharge(newValue);
    }
  });

  self.gravity = ko.observable(0);
  
  self.gravity.subscribe( function(newValue) {
    if (self.graph === null) {
      console.log("graph is null, won't change the gravity");
    } else {
      
      self.graph.setGravity(newValue/100);
    }
  });
  
  self.pseudoknotStrength = ko.observable(0);
  
  self.pseudoknotStrength.subscribe( function(newValue) {
    if (self.graph === null) {
      console.log("graph is null, won't change the pseudoknotStrength");
    } else {
      self.graph.setPseudoknotStrength(newValue);
    }
  });
  
  self.background = ko.observable(true);
  
  self.background.subscribe (function(newValue) {
    if (self.graph === null) {
      console.log("graph is null, won't change the background option");
    } else {
      self.graph.displayBackground(newValue);
    }
  });
  
  self.numbering = ko.observable(true);
  
  self.numbering.subscribe (function(newValue) {
    if (self.graph === null) {
      console.log("graph is null, won't change the nubering option");
    } else {
      self.graph.displayNumbering(newValue);
    }
  });
  
  self.nodeLabel = ko.observable(true);
  
  self.nodeLabel.subscribe (function(newValue) {
    if (self.graph === null) {
      console.log("graph is null, won't change the node label option");
    } else {
      self.graph.displayNodeLabel(newValue);
    }
  });
  
  self.displayPseudoknotLinks = ko.observable(true);
  
  self.displayPseudoknotLinks.subscribe (function(newValue) {
    if (self.graph === null) {
      console.log("graph is null, won't change the pseudoknot link option");
    } else {
      self.graph.displayPseudoknotLinks(newValue);
    }
  });

  self.displayLinks = ko.observable(true);
  
  self.displayLinks.subscribe (function(newValue) {
    if (self.graph === null) {
      console.log("graph is null, won't change the display links option");
    } else {
      self.graph.displayLinks(newValue);
    }
  });
  
  self.nodeOutline = ko.observable(true);
  
  self.nodeOutline.subscribe (function(newValue) {
    if (self.graph === null) {
      console.log("graph is null, won't change the outline option");
    } else {
      self.graph.displayNodeOutline(newValue);
    }
  });
  
  self.showAdd = function() {
    $('#Submit').button('reset');
    $('#add').modal('show');
    self.graph.deaf = true;
  };

  self.showAddPDB = function() {
    $('#PDBSubmit').button('reset');
    $('#addPDB').modal('show');
    self.graph.deaf = true;
  };

  self.showAddJSON = function() {
    $('#JSONSubmit').button('reset');
    $('#addJSON').modal('show');
    self.graph.deaf = true;
  };
  
  self.showAddDB = function() {
    $('#DBSubmit').button('reset');
    $('#addDB').modal('show');
    self.graph.deaf = true;
  };

  self.showCustomColors = function() {
    //$('#ColorSubmit').button('reset');
    $('#addColors').modal('show');
    self.graph.deaf = true;
  };
  
  self.showAbout = function() {
    $('#about').modal('show');
  };
  
  self.clearGraph = function() {
    // delete all nodes
    self.molecules([]);
    self.graph.clearNodes();
  };
  
  self.centerMolecules = function() {
    self.graph.center_view();
  };

  self.saveJSON = function() {
      var data = {"rnas": self.graph.rnas, "extraLinks": self.graph.extraLinks};
      console.log('data:', data);
      var data_string = JSON.stringify(data, function(key, value) {
          //remove circular references
          if (key == 'rna') {
              return;
          } else {
              return value;
          }

      }, "\t");

      var blob = new Blob([data_string], {type: "application/json"});
      saveAs(blob, 'molecule.json')
  };

  self.savePNG = function() {
    saveSvgAsPng(document.getElementById('plotting-area'), 'rna.png', 4);
  };
  
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
var addPdbView = new AddPDBViewModel();
var addJSONView = new AddJSONViewModel();
var addDBView = new AddDatabaseViewModel();
var colorView = new ColorViewModel();

ko.applyBindings(rnaView, document.getElementById('chart'));
ko.applyBindings(addView, document.getElementById('add'));
ko.applyBindings(colorView, document.getElementById('addColors'));
ko.applyBindings(addPdbView, document.getElementById('addPDB'));
ko.applyBindings(addJSONView, document.getElementById('addJSON'));
ko.applyBindings(addDBView, document.getElementById('addDB'));
