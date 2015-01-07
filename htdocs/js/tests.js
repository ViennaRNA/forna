rnaUtilities = new RNAUtilities();

QUnit.test('molecules_to_json', function(assert) {
    var molecules = JSON.parse('{"molecules": [{"uids": ["6941d29d6dd94c6abcac0e6977c76706", "5e86d5c51a194773b4710fc1ea091d14", "f44f2db7f5b344fe8dc703c76b0c54b4", "0605781a8f5d4265a010fcde582919f6", "00be5f5cac2f47b3aec5a2687e4575fc", "56c8bcd28ca94acf9aa0108bfc869b56", "03eff09725874321b1739f77518d16d6", "ff0f9a4b40ca439884ed9e85669dcd4e", "b8690b4acfff4b539486e23bb98ab07c", "8306330d3df84b30994d07b8c5529ed1", "23ccd8e0bbd94664a8c7acee5e4744bc", "d7935c39f3414e738a51752e20eb1752", "0656f38518ae4d99ace35c3227758336", "67202eb3a85d439d8824eddc2ccea7fd", "ff914723f8794a03b5c8875e2c399e8f", "0063f0666a8543cfa4a8b0b98761661a", "be07dea4b47f440ea57912505a460f3b", "d8532a0814f34c19ad11b272a3008794", "0ff78065691345389e5e90a9a22e28ef", "8015a2c7c73f4d269124a42f4941c98a", "e3d40d5d8f074eadb338a3807a512834", "327497264c204fada1fb970de6d3e402", "99e5fa9e74eb4a979f17b94963319800", "6069139ea4e04e789f4b5db91ce149dd", "ea887bc79b9c42d09f508d2210f864e2", "83a59f33e5e247199151155797db8235", "a834d60845d54e93b96edbfc53a33168", "c9135b9cf3da4672bbb8c19f4985d60a", "24a666965b914615af28b2dc42ad4ac8", "ff986fbd91c04fd4a427e474f797cb4a", "8a43e6290c2c4aaaa3860194db725524", "9af8432f46fb487b959a70b3f4a7c192", "f1a30b50434649ecad4201813d32ee45", "824a79e1c00a4e1d85084eb1113fbfdb", "d477da9906f84ce2879c5bc0d5047631", "4f2a0cf433e244f4ae6ac444bdf2426f", "cd5ba9fafc414231b5c4a219023ed35a", "2ef979c914da4668ae251ef56ef4136f", "d082f9b2ce2046f9a53d42651efeb306", "fd042f38858148b2ab257b2cecf41577", "2b3812c2786c43528d203ba4c50864dd", "ff375dd37135454a8cd7fd6f1978606a", "ce1b61e2531d438e9231ac70e2e24c06", "e4289ed2ee944f8d8fcf7072a81649cf", "311da865dbf14e828742564c6afae142", "2e718dbf63e948b1998b6b61a9b5b47e", "cea6a1277704475c92f2b7940cad9330", "0b02534e83f74ab3be38e408a85035d3", "3f1d12b07f434cd79fafc30f011b5f93", "f6ca2688f47c49f2819a9d901301e788", "c360ca3ca9f0468fba5672a60aeff874", "fc8f33ddf62e4f878b2a51bfff830dbb", "4779a31fba4844808cbaada7780dca3b", "ceb91e88a52949f4ac8a25083290fa4b", "68641d9a20a749419b85a0f02442e25f"], "seq": "GGGAUGCGUAGGAUAGGUGGGAGCCGCAAGGCGCCGGUGAAAUACCACCCUUCCC", "ss": "((((.(.........(((((..(((....)))............)))))).))))", "header": "2ZM5_B", "type": "rna", "size": 55}, {"uids": ["fa28cbd083204e07a2dc03604addf1e3"], "seq": "", "ss": "", "header": "2ZM5_A", "type": "protein", "size": 264}], "extra_links": [{"source": "3f1d12b07f434cd79fafc30f011b5f93", "value": 3, "target": "fa28cbd083204e07a2dc03604addf1e3", "link_type": "protein_chain"}, {"source": "d8532a0814f34c19ad11b272a3008794", "value": 3, "target": "fa28cbd083204e07a2dc03604addf1e3", "link_type": "protein_chain"}, {"source": "0b02534e83f74ab3be38e408a85035d3", "value": 3, "target": "fa28cbd083204e07a2dc03604addf1e3", "link_type": "protein_chain"}, {"source": "2b3812c2786c43528d203ba4c50864dd", "value": 3, "target": "fa28cbd083204e07a2dc03604addf1e3", "link_type": "protein_chain"}, {"source": "2b3812c2786c43528d203ba4c50864dd", "value": 3, "target": "fa28cbd083204e07a2dc03604addf1e3", "link_type": "protein_chain"}, {"source": "ff375dd37135454a8cd7fd6f1978606a", "value": 3, "target": "fa28cbd083204e07a2dc03604addf1e3", "link_type": "protein_chain"}, {"source": "2ef979c914da4668ae251ef56ef4136f", "value": 3, "target": "fa28cbd083204e07a2dc03604addf1e3", "link_type": "protein_chain"}, {"source": "d082f9b2ce2046f9a53d42651efeb306", "value": 3, "target": "fa28cbd083204e07a2dc03604addf1e3", "link_type": "protein_chain"}, {"source": "cd5ba9fafc414231b5c4a219023ed35a", "value": 3, "target": "fa28cbd083204e07a2dc03604addf1e3", "link_type": "protein_chain"}, {"source": "2e718dbf63e948b1998b6b61a9b5b47e", "value": 3, "target": "fa28cbd083204e07a2dc03604addf1e3", "link_type": "protein_chain"}, {"source": "e3d40d5d8f074eadb338a3807a512834", "value": 3, "target": "fa28cbd083204e07a2dc03604addf1e3", "link_type": "protein_chain"}, {"source": "6069139ea4e04e789f4b5db91ce149dd", "value": 3, "target": "fa28cbd083204e07a2dc03604addf1e3", "link_type": "protein_chain"}]}')

    var mols_json = molecules_to_json(molecules);
    console.log('mols_json:', mols_json)

    assert.equal(mols_json.graphs.length, 2);

});

QUnit.test('colors', function(assert) {
    cs = new ColorScheme("0.7 0.8 0.9 \n7red \n8blue");
    cs.normalizeColors();

    assert.equal(cs.colors_json[''][1], 0);
    assert.equal(cs.colors_json[''][2] - 0.5 < 0.001, true);
    assert.equal(cs.colors_json[''][3], 1);

    assert.equal(cs.colors_json[''][7], 'red');

    console.log(cs);
});

QUnit.test('pseudoknots', function(assert) {
    pt = rnaUtilities.dotbracket_to_pairtable('(([[[))(]]])');
    removed = rnaUtilities.remove_pseudoknots_from_pairtable(pt); 
    db = rnaUtilities.pairtable_to_dotbracket(pt);

    assert.equal(db, '..(((...))).');

    pt = rnaUtilities.dotbracket_to_pairtable('(([))(])');
    removed = rnaUtilities.remove_pseudoknots_from_pairtable(pt); 
    db = rnaUtilities.pairtable_to_dotbracket(pt);

    assert.equal(db, '((.))(.)');

    pt = rnaUtilities.dotbracket_to_pairtable('(([))()]');
    removed = rnaUtilities.remove_pseudoknots_from_pairtable(pt); 
    db = rnaUtilities.pairtable_to_dotbracket(pt);

    assert.equal(db, '((.))().');

    pt = rnaUtilities.dotbracket_to_pairtable('(([((]))))');
    console.log('pt:', pt);
    removed = rnaUtilities.remove_pseudoknots_from_pairtable(pt); 
    db = rnaUtilities.pairtable_to_dotbracket(pt);

    assert.equal(db, '((.((.))))');
    //assert.deepEqual(removed, [[3,9],[4,10]]);

    /*
    assert.deepEqual(removed, [[3,8]]);
    //assert.deepEqual(r.elements, [['e',0,[0,1,2,3,4,5]]]);
    //
    pt = rnaUtilities.dotbracket_to_pairtable('(([{))()]}');
    removed = rnaUtilities.remove_pseudoknots_from_pairtable(pt); 
    db = rnaUtilities.pairtable_to_dotbracket(pt);

    assert.equal(db, '((..))()..');
    assert.deepEqual(removed, [[3,9],[4,10]]);
    */
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


