from flask import Flask, request, jsonify, abort

import forna
import json
import sys
import os
import RNA



#!/usr/bin/python

import sys
from optparse import OptionParser


def main():
    usage = """
    python restserver.py
    """
    num_args= 0
    parser = OptionParser(usage=usage)

    #parser.add_option('-o', '--options', dest='some_option', default='yo', help="Place holder for a real option", type='str')
    parser.add_option('-p', '--port', dest='port', default=5000, help="Liston on this port", type='int')
    parser.add_option('-d', '--debug', dest='debug', default=False, help="Run in debug mode", action='store_true')
    parser.add_option('-o', '--host', dest='host', default='127.0.0.1', help='The host address', type='str')
    parser.add_option('-s', '--static', dest='static', default=False, action='store_true', help='Start serving static files.')

    (options, args) = parser.parse_args()

    if len(args) < num_args:
        parser.print_help()
        sys.exit(1)

    app = Flask(__name__, static_folder='htdocs')

    @app.route('/struct_graph', methods=['POST'])
    def struct_graph():
        if not request.json:
            abort(400)
        
        if 'seq' not in request.json and 'struct' not in request:
            abort(400)

        fasta_text = ">some_id\n{}\n{}".format(request.json['seq'],
                                               request.json['struct'])

        result = forna.fasta_to_json(fasta_text)
        return json.dumps(result), 201
    
    @app.route('/mfe_struct', methods=['POST'])
    def mfe_struct():
        if not request.json:
            abort(400)
            
        if 'seq' not in request.json:
            abort(400)
        # TODO Taint check if seq is really just a seq
        result = RNA.fold(str(request.json['seq']))[0]
        return json.dumps(result), 201
    
    
    if options.static:
        print >>sys.stderr, "Starting static"
        # serving static files for developmental purpose
        @app.route('/')
        def index():
            return app.send_static_file('index.html')

        @app.route('/js/<path:path>')
        def static_js(path):
            return app.send_static_file(os.path.join('js', path))

        @app.route('/css/<path:path>')
        def static_css(path):
            return app.send_static_file(os.path.join('css', path))
	
        @app.route('/fonts/<path:path>')
        def static_fonts(path):
            return app.send_static_file(os.path.join('fonts', path)) 
        # end serving static files

    app.run(host=options.host, debug=options.debug, port=options.port)

if __name__ == '__main__':
    main()

