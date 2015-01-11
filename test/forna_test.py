import forna
import forgi.graph.bulge_graph as fgb
import forgi.utilities.debug as fud
import json
import unittest
from nose.tools import raises

class FornaTest(unittest.TestCase):
    def setUp(self):
        self.fasta = '>hi\nAACCGG\n((..))'

        pass

    def test_fasta_to_json1(self):
        fasta = '>hi\nACCGGGUUU\n(.(...).)'
        struct = forna.fasta_to_json(fasta)

    def test_fasta_to_json(self):
        fasta = self.fasta

        struct = forna.fasta_to_json(fasta)
        self.assertTrue('nodes' in struct)
        self.assertTrue('links' in struct)

    def test_add_colors_to_graph(self):
        struct = forna.fasta_to_json(self.fasta)

        colors = {'hi': {3: 'black'}}
        struct = forna.add_colors_to_graph(struct, colors)

        self.assertEqual(struct['nodes'][2]['color'], 'black')

    def test_remove_pseudoknots(self):
        pk_fasta = '>hi\nAAAAAAAAAAAAAAAA\n((..[[[..))..]]]'

        bg = fgb.BulgeGraph()
        bg.from_fasta(pk_fasta)

        dissolved_bp = forna.remove_pseudoknots(bg)
        self.assertTrue(dissolved_bp is not None)

    def test_with_pseudoknot1(self):
        pk_fasta = """>4QK8_A
GUUGCCGAAUCCGAAAGGUACGGAGGAACCGCUUUUUGGGGUUAAUCUGCAGUGAAGCUGCAGUAGGGAUACCUUCUGUCCCGCACCCGACAGCUAACUCCGGAGGCAAUAAAGGAAGGA
..((((....((....))..(((((....(.....(.[((((....((((((.....))))))..(((((.{{{{{{)))))..)))).)].)....)))))..)))).....}}}}}}.
        """
        struct = forna.fasta_to_json(pk_fasta)
        self.assertTrue(struct is not None)


    def test_with_pseudoknot2(self):
        pk_fasta = """>4FAW_A
UGUGCCCGGCAUGGGUGCAGUCUAUAGGGUGAGAGUCCCGAACUGUGAAGGCAGAAGUAACAGUUAGCCUAACGCAAGGGUGUCCGUGGCGACAUGGAAUCUGAAGGAAGCGGACGGCAAACCUUCGGUCUGAGGAACACGAACUUCAUAUGAGGCUAGGUAUCAAUGGAUGAGUUUGCAUAACAAAACAAAGUCCUUUCUGCCAAAGUUGGUACAGAGUAAAUGAAGCAGAUUGAUGAAGGGAAAGACUGCAUUCUUACCCGGGGAGGUCUGGAAACAGAAGUCAGCAGAAGUCAUAGUACCCUGUUCGCAGGGGAAGGACGGAACAAGUAUGGCGUUCGCGCCUAAGCUUGAACCGCCGUAUACCGAACGGUACGUACGGUGGUGUGG
.((.[[[[[[..{{{{{{{{{{{...(((.......)))..(((((...{{{{{{{...))))){.{{{...{{{..((((.((((((....))))))))))...)]..}}}...}}}.}.(((((((((((.(.....)...(((((.....([[[..[.[..[[[[[[[..[[[[.)......]]]]...]]]].}}}}}}}...]]]..].]..]]]...))))))))))...))))))...}}}}}}}}}}}...)]]]]](...((((....))))...).......(((.(....(((........)))...))))....(((((..(((.(..).)))...))))).(((((((((((((....)))..))))))))))...."""
        struct = forna.fasta_to_json(pk_fasta)

    def test_parse_colors(self):
        pk_fasta = '>hi\nAAAAAAAAAAAAAAAA\n((..[[[..))..]]]'

        bg = fgb.BulgeGraph()
        bg.from_fasta(pk_fasta)

        colors_text = """
4 orange hi
5 orange hi
6-9 blue bye
"""

        colors = forna.parse_colors_text(colors_text)
        """

        self.assertEqual(len(colors), 6)
        self.assertEqual(colors[0]['name'], 'hi')
        self.assertEqual(colors[1]['name'], 'hi')
        self.assertEqual(colors[2]['name'], 'bye')
        self.assertEqual(colors[2]['nucleotide'], 6)
        self.assertEqual(colors[2]['color'], 'blue')
        """

    def test_parse_ranges(self):
        nucs = forna.parse_ranges('1,7')
        self.assertEqual(nucs, [1,7])

        nucs = forna.parse_ranges('1-3')
        self.assertEqual(nucs, [1,2,3])

        nucs = forna.parse_ranges('1-3,7')
        self.assertEqual(nucs, [1,2,3,7])

        nucs = forna.parse_ranges('1-3,1-4')
        self.assertEqual(nucs, [1,2,3,4])

        self.assertRaises(Exception, lambda: forna.parse_ranges('a'))
        self.assertRaises(Exception, lambda: forna.parse_ranges('a-b'))
        self.assertRaises(Exception, lambda: forna.parse_ranges('1-b'))

        nucs = forna.parse_ranges('6-9')
        self.assertEqual(nucs, [6,7,8,9])


    def test_from_pdb(self):
        with open('test/data/1MZP.pdb', 'r') as f:
            text = f.read()

            res = forna.pdb_to_json(text, '2ZM5')
            s = json.dumps(res)
            fud.pv('s')

        '''
        with open('test/data/3UZT.pdb', 'r') as f:
            text = f.read()

            forna.pdb_to_json(text, '4G0A')
        '''

    """
        with open('test/data/4GV9.pdb') as f:
            text = f.read()

            forna.pdb_to_json(text, '4GV9')

        '''
        with open('test/data/1MFQ.pdb') as f:
            text = f.read()

            forna.pdb_to_json(text, '1MFQ')
        '''
    """

