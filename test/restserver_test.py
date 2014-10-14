import sys
import unittest
import restserver

class RestServerTest(unittest.TestCase):
    def setUp(self):
        self.app = restserver.create_app(static=True).test_client()

    def tearDown(self):
        pass

    def test_struct_graph(self):
        rv = self.app.post('/struct_graph')

        print >>sys.stderr, rv, rv.description
        print >>sys.stderr, "data(rv)", dir(rv)

        # not posting any data should be a 'Bad Request'
        # ideally, with an error message
        self.assertEqual(rv.status_code, 400)
