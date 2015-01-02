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

    self.find_unmatched = function(pt, from, to) {
        /*
         * Find unmatched nucleotides in this molecule.
         */
        var to_remove = [];
        var unmatched = [];

        var orig_from = from;
        var orig_to = to;

        //console.log('-----------------', from, to);

        for (var i = from; i <= to; i++)
            if (pt[i] !== 0 && (pt[i] < from || pt[i] > to))
                unmatched.push([i,pt[i]]);
        //console.log('unmatched:', unmatched);

        for (i = orig_from; i <= orig_to; i++) {
            while (pt[i] === 0 && i <= orig_to) i++;

            to = pt[i];

            while (pt[i] === to) {
                i++;
                to--;
            }
            
            to_remove = to_remove.concat(self.find_unmatched(pt, i, to));
        }

        //console.log('orig_from:', orig_from, 'orig_to:', orig_to, to_remove);

        if (unmatched.length > 0)
            to_remove.push(unmatched);

        return to_remove;
    };

    self.remove_pseudoknots_from_pairtable = function(pt) {
        /* Remove the pseudoknots from this structure in such a fashion
         * that the least amount of base-pairs need to be broken
         *
         * The pairtable is manipulated in place and a list of tuples
         * indicating the broken base pairs is returned.
         */
        var unmatched = [];
        var to_remove = [];
        var removed = [];
        //console.log('pt:', pt);

        var length_comparator = function(a,b) { return a.length - b.length; };

        do {
            to_remove = self.find_unmatched(pt, 1, pt[0]);

            to_remove.sort(length_comparator);
            //console.log("to_remove:", to_remove);
            
            if (to_remove.length > 0) {
                for (var i = 0; i < to_remove[0].length; i++) {
                    pt[to_remove[0][i][0]] = 0;
                    pt[to_remove[0][i][1]] = 0;

                    removed.push(to_remove[0][i]);
                }
            }
        } while (to_remove.length > 0);
        //} while ((to_remove = self.find_unmatched(pt, 0, pt[0])).length > 0);

        return removed;
    };

}

rnaUtilities = new RNAUtilities();

function RNAGraph(seq, dotbracket) {
    var self = this;
    self.seq = seq;
    self.dotbracket = dotbracket;  //i.e. ..((..))..
    self.pairtable = rnaUtilities.dotbracket_to_pairtable(dotbracket);
    self.uid = generateUUID();

    self.elements = {};            //store the elements and the 
                                   //nucleotides they contain
    self.nucs_to_nodes = {};

    self.add_uids = function(uids) {
        for (var i = 0; i < uids.length; i++)
            self.nodes[i].uid = uids[i];

        return self;
    };

    self.add_positions = function(positions) {
        for (var i = 0; i < positions.length; i++) {
            self.nodes[i].x = positions[i][0];
            self.nodes[i].px = positions[i][0];
            self.nodes[i].y = positions[i][1];
            self.nodes[i].py = positions[i][1];
        }

        return self;
    };

    self.get_uids = function() {
        /* Get the positions of each node so that they
         * can be passed to elements_to_json later
         */
        uids = [];
        for (var i = 0; i < self.dotbracket.length; i++)
            uids.push(self.nodes[i].uid);

        return uids;
    };

    self.get_positions = function() {
        /* Get the positions of each node so that they
         * can be passed to elements_to_json later
         */
        positions = [];
        for (var i = 0; i < self.dotbracket.length; i++)
            positions.push([self.nodes[i].x, self.nodes[i].y]);

        return positions;
    };

    self.reinforce_stems = function() {
        pt = self.pairtable;
        relevant_elements = elements.filter( function(d) {
            return d[0] == 's' && d[2].length >= 4;
        });

        for (var i = 0; i < relevant_elements.length; i++) {
            all_nucs = relevant_elements[i][2];
            nucs = all_nucs.slice(0, all_nucs.length / 2);

            for (var j = 0; j < nucs.length-1; j++) {
                self.add_fake_node([nucs[j], nucs[j+1], pt[nucs[j+1]], pt[nucs[j]]]);
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
        var angle = (nucs.length - 2) * 3.14159 / (2 * nucs.length);
        var radius = 0.5 / Math.cos(angle);
        
        new_node = {'name': 'f',
                         'num': i,
                         //'radius': 18 * radius -6,
                         'radius':2,
                         'rna': self,
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

            //link to the center node
            self.links.push({'source': self.nodes[nucs[j] - 1],
                             'target': self.nodes[self.nodes.length-1],
                             'link_type': 'fake',
                             'value': radius,
                             'uid': generateUUID() });

            if (nucs.length > 4) {
                //link across the loop
                self.links.push({'source': self.nodes[nucs[j] - 1],
                                 'target': self.nodes[nucs[(j + Math.floor(nucs.length / 2)) % nucs.length] - 1],
                                 'link_type': 'fake',
                                 'value': radius * 2,
                                 'uid': generateUUID() });
            }

            ia = ((nucs.length - 2) * 3.14159) / nucs.length;
            c = 2 * Math.cos(3.14159 / 2 - ia / 2);
            //link to over-neighbor
            self.links.push({'source': self.nodes[nucs[j] - 1],
                             'target': self.nodes[nucs[(j + 2) % nucs.length] - 1],
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

        //sort so that we count stems last
        self.elements.sort();

        for (var i = 0; i < self.elements.length; i++) {
            nucs = self.elements[i][2];
            for (j = 0; j < nucs.length; j++) {
                elem_types[nucs[j]] = self.elements[i][0];
            }
        }

        for (i = 1; i <= pt[0]; i++) {
            //create a node for each nucleotide
            self.nodes.push({'name': seq[i-1],
                             'num': i,
                             'radius': 6,
                             'rna': self,
                             'node_type': 'nucleotide',
                             'elem_type': elem_types[i],
                             'uid': generateUUID() });
        }

        for (i = 1; i <= pt[0]; i++) {

            if (pt[i] !== 0) {
                // base-pair links
                self.links.push({'source': self.nodes[i-1],
                                 'target': self.nodes[pt[i]-1],
                                 'link_type': 'basepair',
                                 'value': 1,
                                 'uid': generateUUID() });
            }

            if (i > 1) {
                // backbone links
                self.links.push({'source': self.nodes[i-2],
                                 'target': self.nodes[i-1],
                                 'link_type': 'backbone',
                                 'value': 1,
                                 'uid': generateUUID() });
            }
        }

        console.log('self.pseudoknot_pairs:', self.pseudoknot_pairs);
        //add the pseudoknot links
        for (i = 0; i < self.pseudoknot_pairs.length; i++) {
                self.links.push({'source': self.nodes[self.pseudoknot_pairs[i][0]-1],
                                 'target': self.nodes[self.pseudoknot_pairs[i][1]-1],
                                 'link_type': 'pseudoknot',
                                 'value': 1,
                                 'uid': generateUUID() });
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

    self.recalculate_elements = function() {
        self.remove_pseudoknots();
        self.elements = self.pt_to_elements(self.pairtable, 0, 1, self.dotbracket.length);

        return self;
    };

    self.remove_pseudoknots = function() {
        self.pseudoknot_pairs = rnaUtilities.remove_pseudoknots_from_pairtable(self.pairtable);

        return self;
    };

    self.add_pseudoknots = function() {
        /* Add all of the pseudoknot pairs which are stored outside
         * of the pairtable back to the pairtable
         */
        var pt = self.pairtable;
        var pseudoknot_pairs = self.pseudoknot_pairs;

        for (i = 0; i < pseudoknot_pairs.length; i++) {
            pt[pseudoknot_pairs[i][0]] = pseudoknot_pairs[i][1];
            pt[pseudoknot_pairs[i][1]] = pseudoknot_pairs[i][0];
        }

        self.pseudoknot_pairs = [];
        return self;
    };

    self.recalculate_elements();
}
