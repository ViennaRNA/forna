import unittest
import forna
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

        fud.pv('struct')

    def test_add_colors_to_graph(self):
        struct = forna.fasta_to_json(self.fasta)

        colors = {'hi':{3: 'black'}}
        struct = forna.add_colors_to_graph(struct, colors)

        self.assertEqual(struct['nodes'][2]['color'], 'black')
