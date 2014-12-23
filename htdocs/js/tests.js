QUnit.test( "hello test", function( assert ) {
      assert.ok( 1 == "1", "Passed!" );
});

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

function RNA(dotbracket) {
    var self = this;
    self.dotbracket = dotbracket;  //i.e. ..((..))..
    self.pairtable = rnaUtilities.dotbracket_to_pairtable(dotbracket);

    self.elements = {};            //store the elements and the 
                                   //nucleotides they contain

    self.pt_to_elements = function(pt, level, i, j) {
        var elements = [];

        if (i > j)
            return [];

            var u5 = [];
            var u3 = [];
            
            //iterate over the unpaired regions on either side
            //this is either 5' and 3' unpaired if level == 0
            //or an interior loop or a multiloop
            for (; pt[i] === 0; i++) { u5.push(i); }
            for (; pt[j] === 0; j--) { u3.push(j); }

            if (i > j) {
                //hairpin loop or one large unpaired molecule
                console.log('hloop', u5);
                return [['h',level, u5]];
            }

            if (pt[i] != j) {
                //multiloop
                var m = u5;
                var k = i;

                while (k <= j) {
                    // recurse into a stem
                    elements = elements.concat(self.pt_to_elements(pt, level, k, pt[k]));

                    // add the nucleotides between stems
                    k = pt[k] + 1;
                    for (; pt[k] === 0 && k <= j; k++) { m.push(k);}
                }
                m = m.concat(u3);
                
                if (m.length > 0)
                    elements.push(['m', level, m]);
                
                return elements;
            }

            if (pt[i] === j) {
                //interior loop
                combined = u5.concat(u3);
                if (combined.length > 0) {
                    elements.push(['i',level, u5.concat(u3)]);
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
            }
            elements.push(['s', level, s]);
            level += 1;

        return elements.concat(self.pt_to_elements(pt, level, i, j));
    };

    self.elements = self.pt_to_elements(self.pairtable, 0, 1, self.dotbracket.length);
}

QUnit.test('pt_to_elements', function(assert) {
    r = new RNA('(()()())');
    console.log('r.elements:', r.elements.sort());

    r = new RNA('.(..).(.(.)).');
    assert.deepEqual(r.elements.sort(), [['h',1,[3,4]],
                                         ['h',2,[10]],
                                         ['i',1,[8]],
                                         ['m',0,[1, 6, 13]],
                                         ['s',0,[2,5]],
                                         ['s',0,[7,12]],
                                         ['s',1,[9,11]]]);
    r = new RNA('.()');
    assert.deepEqual(r.elements.sort(), [['i',0,[1]], 
                                         ['s',0,[2,3]]]);
    r = new RNA('(.().)');
    assert.deepEqual(r.elements.sort(), [['i',1,[2,5]], 
                                         ['s',0,[1,6]],
                                         ['s',1,[3,4]]]);

    r = new RNA('.().().');
    assert.deepEqual(r.elements.sort(), [['m',0,[1,4,7]], ['s',0,[2,3]], ['s',0,[5,6]]]);

    r = new RNA('....');
    assert.deepEqual(r.elements, [['h',0,[1,2,3,4]]]);

    r = new RNA('()');
    assert.deepEqual(r.elements, [['s',0,[1,2]]]);

    r = new RNA('.().');
    assert.deepEqual(r.elements.sort(), [['i',0,[1,4]], ['s',0,[2,3]]]);
    //r = new RNA('..((..))..');

    //console.log('r:', r);
    //assert.deepEqual(r.elements.s1, [3,4,7,8]);
});

QUnit.test('pairtable_to_dotbracket', function(assert) {
    db = rnaUtilities.pairtable_to_dotbracket([2,0,0]);
    assert.equal(db, '..');

    db = rnaUtilities.pairtable_to_dotbracket([2,2,1]);
    assert.equal(db, '()');

    db = rnaUtilities.pairtable_to_dotbracket([4,3,4,1,2]);
    assert.equal(db, '([)]');
});

QUnit.test('dotbracket_to_pairtable', function(assert) {
    pt = rnaUtilities.dotbracket_to_pairtable('..');
    assert.deepEqual(pt, [2,0,0]);

    pt = rnaUtilities.dotbracket_to_pairtable('()');
    assert.deepEqual(pt, [2,2,1]);

    pt = rnaUtilities.dotbracket_to_pairtable('([)]');
    assert.deepEqual(pt, [4,3,4,1,2]);
});


