rnaUtilities = new RNAUtilities();

QUnit.test('pseudoknots', function(assert) {
    pt = rnaUtilities.dotbracket_to_pairtable('(())');
    console.log('first_pt:', pt);
    removed = rnaUtilities.remove_pseudoknots_from_pairtable(pt); 
    db = rnaUtilities.pairtable_to_dotbracket(pt);
    assert.equal(db, '(())');

    pt = rnaUtilities.dotbracket_to_pairtable('.(.())');
    removed = rnaUtilities.remove_pseudoknots_from_pairtable(pt); 
    db = rnaUtilities.pairtable_to_dotbracket(pt);
    assert.equal(db, '.(.())');
    
    pt = rnaUtilities.dotbracket_to_pairtable('(([))()]');
    removed = rnaUtilities.remove_pseudoknots_from_pairtable(pt); 
    db = rnaUtilities.pairtable_to_dotbracket(pt);

    assert.equal(db, '((.))().');
    pt = rnaUtilities.dotbracket_to_pairtable('(([[[))(]]])');
    removed = rnaUtilities.remove_pseudoknots_from_pairtable(pt); 
    console.log('removed', removed, 'pt:', pt);
    db = rnaUtilities.pairtable_to_dotbracket(pt);
    console.log('----------------------')

    assert.equal(db, '..(((...))).');

    pt = rnaUtilities.dotbracket_to_pairtable('(([))(])');
    removed = rnaUtilities.remove_pseudoknots_from_pairtable(pt); 
    db = rnaUtilities.pairtable_to_dotbracket(pt);

    assert.equal(db, '((.))(.)');

    pt = rnaUtilities.dotbracket_to_pairtable('(([((]))))');
    removed = rnaUtilities.remove_pseudoknots_from_pairtable(pt); 
    db = rnaUtilities.pairtable_to_dotbracket(pt);

    assert.equal(db, '((.((.))))');
    //assert.deepEqual(removed, [[3,9],[4,10]]);
    console.log('ok')
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


    r = new RNAGraph('aaaa', '(())');
    assert.deepEqual(r.elements.sort(), [['s',2,[1,2,3,4]]]);
});


QUnit.test('molecules_to_json', function(assert) {
    var molecules = JSON.parse('{"molecules": [{"uids": ["80a9caccf84d4df9b0c32a9feef7afbb", "1bf0f244daa04f73b5939457af6d72d0", "052f99c6db03492fa4a966eabc1f2141", "f7d8d9f77e6140439ae49498daf16c9b", "54b0e615013b4784b88e3609d07423f8", "3cbad76d589f4cef80edb81473459d9b", "391216f2ab924c31a2c6db9622754a14", "8a7c043064564209a287ec26e8356bcb", "704b655974a4480b866975a2483568ef", "e19eaf1a7006407fbc7698cf02d5564e", "058747d72ba74184a779db7ce4766894", "f1445a0bed2a4b349b67dd361a7afc3f", "5325d5da07a846fc8c9f4bb2634d465b", "b346b930f79c461dbfb8a50b772ef7e2", "9732869bec724d72b9e3bab87b8c0eaa", "3c861c6ff481473fb56a1686cbfa8ac2", "7ce0c1621c19432f80ed8ff3572c31b8", "bb0bd511e78b42d6b7c80812d51523a4", "688490529e0c413a8e79a865ca08e1a4", "5be9d1af12be43368003f20274318e4f", "78d6e3ebc5464c87ad54af47e5e6342b", "ff9c2b5b06d64e1fab02c5c06a619dd1", "ae6b05c20383474dadd48ee0da71f13e", "ba38e58ca3d844dc851a9cd0492a2365", "5a98fcf1e8924305855dc8675b7a0b84", "935851baf3164e98a72836bc85b06d08", "2d35a234e7e8460a9e95b47a104587ad", "fafcf3c001dc4a12a71b148b9fd961fe", "3f3af03cd7fc45f9bec494af9ba82df3", "a7d247420244483d8c4ae222ce3f53bd", "6354f460c3d840b0b23650c9b7c38c35", "276021346aee41a5be402275c9f32a82", "e279ebf1e15748efa101f91aa7f582bc", "cbb391c54d584cd58e2b76ddd5eb1760", "5b17639b6923402193e5cd46365b4331", "3029de55a9a64f9588ddbe0efb0ddcc2", "1e4dcab44b6546d4b832a9b22053ad4c", "df5b9649c70541888b7df5045d114eee", "7286126c633b414eade27a230b156fd4", "a530535436514b81ac86baec0ac37455", "32ff1be151614ee29004cf8d05e565a6", "d5add889b0074662bdcc31802097ada0", "7922bb7b651a4528bee84cf95ac6ae17", "d108d76205d3400294368ea52f51e37b", "0591fd673a494e1f998590573e4c29b4", "d1673246917b495cbff3874fb3f52872", "2fa84eedb41640aa9d7abdb02a3ff17f", "9c20bb8f3f9e49bcb0af64427a13b034", "c072b21d49f5418790f89bbf0286f1e6", "9de8f2cabc054ef19e3cb316238a022f", "60414339cb634e4c936c59090c6763ec", "790b697fb6f94ee8b5ff01532bb71047", "1e6665ef05df4bfd8f6cc831fc968f18", "872413e231634dcc8a19a518c1891eb1", "bbe4ff9d2d654a0f8d68fc8e9343b758"], "seq": "GGGAUGCGUAGGAUAGGUGGGAGCCGCAAGGCGCCGGUGAAAUACCACCCUUCCC", "ss": "((((.(.........(((((..(((....)))............)))))).))))", "positions": [[91.552810668945312, 182.92140197753906], [91.552810668945312, 167.92140197753906], [91.552810668945312, 152.92140197753906], [91.552810668945312, 137.92140197753906], [83.815513610839844, 125.19412994384766], [91.552810668945312, 111.39395904541016], [79.43365478515625, 120.23285675048828], [64.487724304199219, 121.50534057617188], [51.048759460449219, 114.84243774414062], [43.013530731201172, 102.17613983154297], [42.711944580078125, 87.179176330566406], [50.2314453125, 74.2000732421875], [63.391674041748047, 67.002265930175781], [78.376678466796875, 67.672843933105469], [90.841392517089844, 76.017356872558594], [97.171104431152344, 89.613624572753906], [104.42688751220703, 76.485275268554688], [111.68267059326172, 63.356922149658203], [118.93845367431641, 50.228572845458984], [126.19423675537109, 37.1002197265625], [114.96080780029297, 15.603778839111328], [120.5020751953125, -7.8139567375183105], [139.86949157714844, -21.773918151855469], [139.02842712402344, -36.750320434570312], [138.1873779296875, -51.726722717285156], [128.756591796875, -65.142845153808594], [135.90438842773438, -79.902275085449219], [152.27774047851562, -80.821784973144531], [161.03314208984375, -66.955459594726562], [153.16377258300781, -52.567779541015625], [154.00483703613281, -37.591377258300781], [154.84588623046875, -22.614974975585938], [163.03150939941406, -20.222705841064453], [170.37979125976562, -15.863945007324219], [176.426025390625, -9.8052434921264648], [180.78564453125, -2.4209244251251221], [183.1785888671875, 5.8300309181213379], [183.44732666015625, 14.432514190673828], [181.56719970703125, 22.847444534301758], [177.64845275878906, 30.545553207397461], [171.9298095703125, 37.040672302246094], [164.76393127441406, 41.920429229736328], [156.59567260742188, 44.8724365234375], [147.93446350097656, 45.704269409179688], [139.32258605957031, 44.356002807617188], [132.06680297851562, 57.484355926513672], [124.81102752685547, 70.612709045410156], [117.55524444580078, 83.741058349609375], [110.29945373535156, 96.869407653808594], [106.55281066894531, 111.39395904541016], [114.29010772705078, 125.19412994384766], [106.55281066894531, 137.92140197753906], [106.55281066894531, 152.92140197753906], [106.55281066894531, 167.92140197753906], [106.55281066894531, 182.92140197753906]], "header": "2ZM5_B", "type": "rna", "size": 55}, {"uids": ["09707140fb844233bcae944def5483cc"], "seq": "", "ss": "", "header": "2ZM5_A", "type": "protein", "size": 264}], "extra_links": [{"source": "c072b21d49f5418790f89bbf0286f1e6", "value": 3, "target": "09707140fb844233bcae944def5483cc", "link_type": "protein_chain"}, {"source": "bb0bd511e78b42d6b7c80812d51523a4", "value": 3, "target": "09707140fb844233bcae944def5483cc", "link_type": "protein_chain"}, {"source": "9c20bb8f3f9e49bcb0af64427a13b034", "value": 3, "target": "09707140fb844233bcae944def5483cc", "link_type": "protein_chain"}, {"source": "32ff1be151614ee29004cf8d05e565a6", "value": 3, "target": "09707140fb844233bcae944def5483cc", "link_type": "protein_chain"}, {"source": "32ff1be151614ee29004cf8d05e565a6", "value": 3, "target": "09707140fb844233bcae944def5483cc", "link_type": "protein_chain"}, {"source": "d5add889b0074662bdcc31802097ada0", "value": 3, "target": "09707140fb844233bcae944def5483cc", "link_type": "protein_chain"}, {"source": "df5b9649c70541888b7df5045d114eee", "value": 3, "target": "09707140fb844233bcae944def5483cc", "link_type": "protein_chain"}, {"source": "7286126c633b414eade27a230b156fd4", "value": 3, "target": "09707140fb844233bcae944def5483cc", "link_type": "protein_chain"}, {"source": "1e4dcab44b6546d4b832a9b22053ad4c", "value": 3, "target": "09707140fb844233bcae944def5483cc", "link_type": "protein_chain"}, {"source": "d1673246917b495cbff3874fb3f52872", "value": 3, "target": "09707140fb844233bcae944def5483cc", "link_type": "protein_chain"}, {"source": "78d6e3ebc5464c87ad54af47e5e6342b", "value": 3, "target": "09707140fb844233bcae944def5483cc", "link_type": "protein_chain"}, {"source": "ba38e58ca3d844dc851a9cd0492a2365", "value": 3, "target": "09707140fb844233bcae944def5483cc", "link_type": "protein_chain"}]} ')

    var mols_json = molecules_to_json(molecules);

    assert.equal(mols_json.graphs.length, 2);

});

QUnit.test('colors', function(assert) {
    cs = new ColorScheme("");
    assert.deepEqual(cs.parseRange('1-3'), [1,2,3])
    assert.deepEqual(cs.parseRange('1-3,7'), [1,2,3,7])
    assert.deepEqual(cs.parseRange('7'), [7])

    cs = new ColorScheme("1:red 2-5:green 7,8,19:blue");
    assert.equal(cs.colors_json[''][1],'red');
    assert.equal(cs.colors_json[''][2],'green');
    assert.equal(cs.colors_json[''][5],'green');
    assert.equal(cs.colors_json[''][7],'blue');
    assert.equal(cs.colors_json[''][8],'blue');
    assert.equal(cs.colors_json[''][19],'blue');

    cs = new ColorScheme("0.7 0.8 0.9 \n7:red \n8:blue");
    cs.normalizeColors();

    assert.equal(cs.colors_json[''][1], 0);
    assert.equal(cs.colors_json[''][2] - 0.5 < 0.001, true);
    assert.equal(cs.colors_json[''][3], 1);

    assert.equal(cs.colors_json[''][7], 'red');

});

QUnit.test('add_labels', function(assert) {
    r = new RNAGraph('AAAA', '....');
    json = r.elements_to_json();
    assert.equal(json.nodes.length, 4);

    r.add_labels();
    assert.equal(json.nodes.length, 4);

    r = new RNAGraph('aaaaaaaaaaaaa', '.(..).(.(.)).');
    json = r.elements_to_json();
    //thirteen regular nodes and one number label
    assert.equal(json.nodes.length, 13);
    r.add_labels();
    assert.equal(json.nodes.length, 14);
});

QUnit.test('elements_to_json', function(assert) {
    r = new RNAGraph('AAAA', '....');
    json = r.elements_to_json();
    assert.equal(json.nodes.length, 4);

    r = new RNAGraph('aaaaaaaaaaaaa', '.(..).(.(.)).');
    json = r.elements_to_json();
    console.log('elements_to_json:', json.nodes);

    //thirteen regular nodes and one number label
    assert.equal(json.nodes.length, 13);
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

    assert.throws(function() {
        rnaUtilities.dotbracket_to_pairtable('.(.');
    }, /Unmatched/ , "Unmatched base at position 2");
});


QUnit.test('elements_to_connections', function(assert) {
    r = new RNAGraph('aaaaaaaaaaaa', '(.((..))..)')
    // this graph should have the structure s->i->s->h
    // which implies a set of two fake_fake links (the first
    // s->i link won't exist because the stem has a length of one
    r.elements_to_json()
    .reinforce_stems()
    .reinforce_loops()
    .connect_fake_nodes()

    var fake_links = r.links.filter(function(d) { return d.link_type == 'fake_fake'; });

    console.log('fake_links:', fake_links);
    assert.equal(fake_links.length, 2);
    
});
