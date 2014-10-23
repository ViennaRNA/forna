import unittest
import forna
import forgi.graph.bulge_graph as fgb
import forgi.utilities.debug as fud

class FornaTest(unittest.TestCase):
    def setUp(self):
        self.fasta = '>hi\nAACCGG\n((..))'
        pass

    def test_fasta_to_json(self):
        fasta = self.fasta

        struct = forna.fasta_to_json(fasta)
        self.assertTrue('nodes' in struct)
        self.assertTrue('links' in struct)

    def test_add_colors_to_graph(self):
        struct = forna.fasta_to_json(self.fasta)

        colors = {'hi':{3: 'black'}}
        struct = forna.add_colors_to_graph(struct, colors)

        self.assertEqual(struct['nodes'][2]['color'], 'black')

    def test_remove_pseudoknots(self):
        pk_fasta = '>hi\nAAAAAAAAAAAAAAAA\n((..[[[..))..]]]'

        bg = fgb.BulgeGraph()
        bg.from_fasta(pk_fasta)

        dissolved_bp = forna.remove_pseudoknots(bg)

        fud.pv('bg.to_bg_string()')
        fud.pv('dissolved_bp')

    def test_with_pseudoknot(self):
        pk_fasta = """>4QK8_A
GUUGCCGAAUCCGAAAGGUACGGAGGAACCGCUUUUUGGGGUUAAUCUGCAGUGAAGCUGCAGUAGGGAUACCUUCUGUCCCGCACCCGACAGCUAACUCCGGAGGCAAUAAAGGAAGGA
..((((....((....))..(((((....(.....(.[((((....((((((.....))))))..(((((.{{{{{{)))))..)))).)].)....)))))..)))).....}}}}}}.
        """
        struct = forna.fasta_to_json(pk_fasta)
        fud.pv('struct')


