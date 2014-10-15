import sys
import unittest
import restserver
import json

from flask import jsonify

class RestServerTest(unittest.TestCase):
    def setUp(self):
        self.app = restserver.create_app(static=True).test_client()

    def tearDown(self):
        pass

    def test_struct_graph(self):
        rv = self.app.post('/struct_graph')

        # not posting any data should be a 'Bad Request'
        # ideally, with an error message
        self.assertEqual(rv.data, "Missing a json in the request")
        self.assertEqual(rv.status_code, 400)
        
        data_in = json.dumps({'seq':'ACCCGG', 'struct':'((..))'})
        
        rv = self.app.post('/struct_graph', 
                          data=data_in,
                          content_type='application/json')
                          
        self.assertEqual(rv.status_code, 201)
        
        data_in = json.dumps({'seq':'ACxCGG', 'struct':'((..))'})
        rv = self.app.post('/struct_graph', 
                          data=data_in,
                          content_type='application/json')
                          
        self.assertEqual(rv.status_code, 400)
