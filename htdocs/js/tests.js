rnaUtilities = new RNAUtilities();

QUnit.test('pseudoknots', function(assert) {
    pt = rnaUtilities.dotbracket_to_pairtable('(([))()]');
    removed = rnaUtilities.remove_pseudoknots_from_pairtable(pt); 
    db = rnaUtilities.pairtable_to_dotbracket(pt);

    assert.equal(db, '((.))().');
    assert.deepEqual(removed, [[3,8]]);
    //assert.deepEqual(r.elements, [['e',0,[0,1,2,3,4,5]]]);
    //
    pt = rnaUtilities.dotbracket_to_pairtable('(([{))()]}');
    removed = rnaUtilities.remove_pseudoknots_from_pairtable(pt); 
    db = rnaUtilities.pairtable_to_dotbracket(pt);

    assert.equal(db, '((..))()..');
    assert.deepEqual(removed, [[3,9],[4,10]]);
});

QUnit.test('elements_to_json', function(assert) {
    r = new RNAGraph('AAAA', '....');
    json = r.elements_to_json();
    assert.equal(json.nodes.length, 4);

    r = new RNAGraph('aaaaaaaaaaaaa', '.(..).(.(.)).');
    json = r.elements_to_json();
    assert.equal(json.nodes.length, 13);
});

QUnit.test('pt_to_elements', function(assert) {
    r = new RNAGraph('AAAA', '....');
    assert.deepEqual(r.elements, [['e',0,[0,1,2,3,4,5]]]);

    r = new RNAGraph('aaaaaaaaaaaaa', '.(..).(.(.)).');
    assert.deepEqual(r.elements.sort(), [['e',0,[0,1,2,5,6,7,12,13,14]],
                                         ['h',1,[2,3,4,5]],
                                         ['h',2,[9,10,11]],
                                         ['i',1,[7,8,9,11,12]],
                                         ['s',1,[2,5]],
                                         ['s',1,[7,12]],
                                         ['s',2,[9,11]]]);

    r = new RNAGraph('aaaaaaa)', '(.()().)');
    assert.deepEqual(r.elements.sort(), [['m',1,[1,2,3,4,5,6,7,8]],
                                         ['s',1,[1,8]],
                                         ['s',2,[3,4]],
                                         ['s',2,[5,6]]]);

    r = new RNAGraph('aaaaaaa', '(()().)');
    assert.deepEqual(r.elements.sort(), [['m',1,[1,2,3,4,5,6,7]],
                                         ['s',1,[1,7]],
                                         ['s',2,[2,3]],
                                         ['s',2,[4,5]]]);

    r = new RNAGraph('aaaaaa', '(()())');
    assert.deepEqual(r.elements.sort(), [['m',1,[1,2,3,4,5,6]],
                                         ['s',1,[1,6]],
                                         ['s',2,[2,3]],
                                         ['s',2,[4,5]]]);

    r = new RNAGraph('aaa','(.)');
    assert.deepEqual(r.elements.sort(), [['h',1,[1,2,3]],
                                         ['s',1,[1,3]]]);

    r = new RNAGraph('aa', '()');
    assert.deepEqual(r.elements.sort(), [['s',1,[1,2]]]);

    r = new RNAGraph('aaaaaa', '.(.())');
    assert.deepEqual(r.elements.sort(), [['e',0,[0,1,2,6,7]],
                                         ['i',1,[2,3,4,5,6]],
                                         ['s',1,[2,6]],
                                         ['s',2,[4,5]]]);

    r = new RNAGraph('aaaaa', '.(())');
    assert.deepEqual(r.elements.sort(), [['e',0,[0,1,2,5,6]],['s',2,[2,3,4,5]]]);

    r = new RNAGraph('aaaa', '(())');
    assert.deepEqual(r.elements.sort(), [['s',2,[1,2,3,4]]]);
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


