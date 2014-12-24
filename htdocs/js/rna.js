var number_sort = function(a,b) { return a - b; };

function generateUUID(){
    /* Stack Overflow:
     * http://stackoverflow.com/a/8809472/899470
     */
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });

    return uuid;
}

function RNAUtilities() {
    var self = this;

    // the brackets to use when constructing dotbracket strings
    // with pseudoknots
    self.bracket_left =  "([{<ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    self.bracket_right = ")]}>abcdefghijklmnopqrstuvwxyz".split("");

    self.inverse_brackets = function(bracket) {
        res = {};
        for (i = 0; i < bracket.length; i++) {
            res[bracket[i]] = i;
        }
        return res;
    };

    self.dotbracket_to_pairtable = function(dotbracket) {
        // create an array and initialize it to 0
        pt = Array.apply(null, new Array(dotbracket.length + 1)).map(Number.prototype.valueOf,0);
        
        //  the first element is always the length of the RNA molecule
        pt[0] = dotbracket.length;

        // store the pairing partners for each symbol
        stack = {};
        for (i = 0; i < self.bracket_left.length; i++) {
            stack[i] = [];
        }

        // lookup the index of each symbol in the bracket array
        inverse_bracket_left = self.inverse_brackets(self.bracket_left);
        inverse_bracket_right = self.inverse_brackets(self.bracket_right);

        for (i = 0; i < dotbracket.length; i++) {
            a = dotbracket[i];
            ni = i + 1;

            if (a == '.') {
                // unpaired
                pt[ni] = 0;
            } else {
                if (a in inverse_bracket_left) {
                    // open pair?
                    stack[inverse_bracket_left[a]].push(ni);
                } else if (a in inverse_bracket_right){
                    // close pair?
                    j = stack[inverse_bracket_right[a]].pop();

                    pt[ni] = j;
                    pt[j] = ni;
                } else {
                    throw "Unknown symbol in dotbracket string";
                }
            }
        }

        return pt;
    };

    self.insert_into_stack = function(stack, i, j) {
        var k = 0;
        while (stack[k].length > 0 && stack[k][stack[k].length - 1] < j) {
            k += 1;
        }

        stack[k].push(j);
        return k;
    };

    self.delete_from_stack = function(stack, j) {
        var k = 0;
        while (stack[k].length === 0 || stack[k][stack[k].length-1] != j) {
            k += 1;
        }
        stack[k].pop();
        return k;
    };

    self.pairtable_to_dotbracket = function(pt) {
        // store the pairing partners for each symbol
        stack = {};
        for (i = 0; i < pt[0]; i++) {
            stack[i] = [];
        }

        seen = {};
        res = "";
        for (i = 1; i < pt[0] + 1; i++) {
            if (pt[i] !== 0 && pt[i] in seen) {
                throw "Invalid pairtable contains duplicate entries";
            }

            seen[pt[i]] = true;

            if (pt[i] === 0) {
                res += '.';
            } else {
                if (pt[i] > i) {
                    res += self.bracket_left[self.insert_into_stack(stack, i, pt[i])];
                } else {
                    res += self.bracket_right[self.delete_from_stack(stack, i)];
                }
            }

        }

        return res;
    };
}

rnaUtilities = new RNAUtilities();

function RNAGraph(seq, dotbracket) {
    var self = this;
    self.seq = seq;
    self.dotbracket = dotbracket;  //i.e. ..((..))..
    self.pairtable = rnaUtilities.dotbracket_to_pairtable(dotbracket);

    self.elements = {};            //store the elements and the 
                                   //nucleotides they contain
    self.nucs_to_nodes = {};

    self.add_positions = function(positions) {
        for (var i = 0; i < positions.length; i++) {
            self.nodes[i].x = positions[i][0];
            self.nodes[i].px = positions[i][0];
            self.nodes[i].y = positions[i][1];
            self.nodes[i].py = positions[i][1];
        }

        return self;
    };

    self.reinforce_stems = function() {
        pt = self.pairtable;
        relevant_elements = elements.filter( function(d) {
            return d[0] == 's' && d[2].length >= 4;
        });

        console.log('relevant_elements', relevant_elements);
        for (var i = 0; i < relevant_elements.length; i++) {
            all_nucs = relevant_elements[i][2];
            nucs = all_nucs.slice(0, all_nucs.length / 2);
            console.log('nucs', nucs, "all_nucs:", all_nucs);

            for (var j = 0; j < nucs.length-1; j++) {
                console.log('j',j, nucs.length);
                self.add_fake_node([nucs[j], nucs[j+1], pt[nucs[j+1]], pt[nucs[j]]]);
                console.log('j',j, nucs.length);
            }
        }

        return self;    
    };

    self.reinforce_loops = function() {
        /* 
         * Add a set of fake nodes to enforce the structure
         */
        var filter_nucs = function(d) { 
            return d !== 0 && d <= self.dotbracket.length;
        };

        for (i=0; i < self.elements.length; i++) {
            if (self.elements[i][0] == 's')
                continue;

            var nucs = self.elements[i][2].filter(filter_nucs);

            self.add_fake_node(nucs);
        }

        return self;
    };

    self.add_fake_node = function(nucs) {
        console.log('nucs:', nucs);
        var angle = (nucs.length - 2) * 3.14159 / (2 * nucs.length);
        var radius = 0.5 / Math.cos(angle);
        console.log('radius:', radius);
        
        new_node = {'name': 'f',
                         'num': i,
                         //'radius': 18 * radius -6,
                         'radius':2,
                         'node_type': 'middle',
                         'elem_type': 'f',
                         'uid': generateUUID() };
        self.nodes.push(new_node);

        new_x = 0;
        new_y = 0;
        coords_counted = 0;

        for (j = 0; j < nucs.length; j++) {
            if (nucs[j] === 0 || nucs[j] > self.dotbracket.length)
                continue;

            console.log('linking:', nucs[j]);
            //link to the center node
            self.links.push({'source': nucs[j] - 1,
                             'target': self.nodes.length-1,
                             'link_type': 'fake',
                             'value': radius});

            if (nucs.length > 4) {
                //link across the loop
                self.links.push({'source': nucs[j] - 1,
                                 'target': nucs[(j + Math.floor(nucs.length / 2)) % nucs.length] - 1,
                                 'link_type': 'fake',
                                 'value': radius * 2});
            }

            ia = ((nucs.length - 2) * 3.14159) / nucs.length;
            c = 2 * Math.cos(3.14159 / 2 - ia / 2);
            //link to over-neighbor
            self.links.push({'source': nucs[j] - 1,
                             'target': nucs[(j + 2) % nucs.length] - 1,
                             'link_type': 'fake',
                             'value': c});

            // calculate the mean of the coordinats in this loop
            // and place the fake node there
            from_node = self.nodes[nucs[j]-1];
            if ('x' in from_node) {
                new_x += from_node.x;
                new_y += from_node.y;

                coords_counted += 1;
            }
        }

        if (coords_counted > 0) {
            // the nucleotides had set positions so we can calculate the position
            // of the fake node
            new_node.x = new_x / coords_counted;
            new_node.y = new_y / coords_counted;
            new_node.px = new_node.x;
            new_node.py = new_node.y;
        }

        console.log('new_node:', new_node);


        console.log('angle', angle);
        console.log('radius', radius);

        return self;
    };

    self.elements_to_json = function() {
        /* Convert a set of secondary structure elements to a json
         * representation of the graph that can be used with d3's
         * force-directed layout to generate a visualization of 
         * the structure.
         */
        pt = self.pairtable;
        elements = self.elements;

        self.nodes = [];
        self.links = [];

        //create a reverse lookup so we can find out the type
        //of element that a node is part of
        elem_types = {};
        for (i = 0; i < self.elements.length; i++)
            for (j = 0; j < self.elements[i][2].length; j++)
                elem_types[j] = self.elements[i][0];
       
        for (i = 1; i <= pt[0]; i++) {
            //create a node for each nucleotide
            self.nodes.push({'name': seq[i-1],
                             'num': i,
                             'radius': 6,
                             'node_type': 'nucleotide',
                             'elem_type': elem_types[i],
                             'uid': generateUUID() });

            if (pt[i] !== 0) {
                // base-pair links
                self.links.push({'source': i-1,
                                 'target': pt[i]-1,
                                 'link_type': 'basepair',
                                 'value': 1});
            }

            if (i > 1) {
                // backbone links
                self.links.push({'source': i-2,
                                 'target': i-1,
                                 'link_type': 'backbone',
                                 'value': 1});
            }
        }

        return self;
    };

    self.pt_to_elements = function(pt, level, i, j) {
        /* Convert a pair table to a list of secondary structure 
         * elements:
         *
         * [['s',1,[2,3]]
         *
         * The 's' indicates that an element can be a stem. It can also be
         * an interior loop ('i'), a hairpin loop ('h') or a multiloop ('m')
         *
         * The second number (1 in this case) indicates the depth or
         * how many base pairs have to be broken to get to this element.
         *
         * Finally, there is the list of nucleotides which are part of
         * of this element.
         */
        var elements = [];
        var u5 = [i-1];
        var u3 = [j+1];

        if (i > j)
            return [];
            
            //iterate over the unpaired regions on either side
            //this is either 5' and 3' unpaired if level == 0
            //or an interior loop or a multiloop
            for (; pt[i] === 0; i++) { u5.push(i); }
            for (; pt[j] === 0; j--) { u3.push(j); }

            if (i > j) {
                //hairpin loop or one large unpaired molecule
                u5.push(i);
                console.log('hloop', u5);
                if (level === 0)
                    return [['e',level, u5.sort(number_sort)]];
                else
                    return [['h',level, u5.sort(number_sort)]];
            }

            if (pt[i] != j) {
                //multiloop
                var m = u5;
                var k = i;

                // the nucleotide before and the starting nucleotide
                m.push(k);
                while (k <= j) {
                    // recurse into a stem
                    elements = elements.concat(self.pt_to_elements(pt, level, k, pt[k]));

                    // add the nucleotides between stems
                    m.push(pt[k]);
                    k = pt[k] + 1;
                    for (; pt[k] === 0 && k <= j; k++) { m.push(k);}
                    m.push(k);
                }
                m.pop();
                m = m.concat(u3);
                console.log('u3',u3);
                
                if (m.length > 0) {
                    if (level === 0)
                        elements.push(['e', level, m.sort(number_sort)]);
                    else
                        elements.push(['m', level, m.sort(number_sort)]);
                }
                
                return elements;
            }

            if (pt[i] === j) {
                //interior loop
                u5.push(i);
                u3.push(j);

                combined = u5.concat(u3);
                if (combined.length > 4) {
                    if (level === 0)
                        elements.push(['e',level, u5.concat(u3).sort(number_sort)]);
                    else
                        elements.push(['i',level, u5.concat(u3).sort(number_sort)]);
                }
            } 

            var s = [];
            //go through the stem
            while (pt[i] === j && i < j) {
                //one stem
                s.push(i);
                s.push(j);

                i += 1;
                j -= 1;

                level += 1;
            }

            u5 = [i-1];
            u3 = [j+1];
            elements.push(['s', level, s.sort(number_sort)]);

        return elements.concat(self.pt_to_elements(pt, level, i, j));
    };

    self.elements = self.pt_to_elements(self.pairtable, 0, 1, self.dotbracket.length);
}
