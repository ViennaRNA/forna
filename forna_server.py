#!/usr/bin/python

"""forna_server.py: A server for converting RNA secondary structures to force-directed graphs
   and doing something more."""

                                                                                                         
__author__      = "Stefan Hammer"
__copyright__   = "Copyright 2014"
__version__     = "0.1"
__maintainer__  = "Stefan Hammer"
__email__       = "jango@tbi.univie.ac.at"  

from flask import Flask, request, abort

import forna
import json
import re
import sys
import os
import RNA
from optparse import OptionParser

import forgi.utilities.debug as fud

def create_app(static):
    '''
    Create the forna application given the options that were passed.

    '''
    app = Flask(__name__, static_folder='htdocs')
    import logging
    from logging import Formatter

    file_handler = logging.FileHandler('server.log')
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(Formatter(
            '%(asctime)s %(levelname)s: %(message)s '
            '[in %(pathname)s:%(lineno)d]'
    ))
    app.logger.addHandler(file_handler)

    @app.errorhandler(400)
    # pylint: disable=W0612
    def custom405(error):
        app.logger.info(error)
        return error.description, 400

    @app.route('/struct_graph', methods=['POST'])
    # pylint: disable=W0612
    def struct_graph():
        app.logger.info(request.json);
        if not request.json:
           abort(400, "Missing a json in the request")

        if 'seq' not in request.json and 'struct' not in request.json:
            abort(400, "Missing seq and struct in the json file")

        if re.match("^[ACGTUWSMKRYBDHV]+$", request.json['seq']) is None:
            abort(400, "Invalid sequence: {}".format(request.json['seq']))

        if re.match("^[\(\)\.\[\]\{\}]+[\*]?$", request.json['struct']) is None:
            abort(400, "Invalid structure: {}".format(request.json['struct']))

        print >>sys.stderr, "struct[-1]:", request.json['struct'][-1]
        if request.json['struct'][-1] == '*':
            circular = True
            structure = request.json['struct'].strip('*')
        else:
            circular = False
            structure = request.json['struct']

        fasta_text = ">{}\n{}\n{}".format(request.json['header'], request.json['seq'],
                                               structure)

        try:
            result = forna.fasta_to_json(fasta_text, circular)
        except Exception as ex:
            app.logger.exception(ex)
            abort(400, "Secondary structure parsing error: {}".format(str(ex)))

        return json.dumps(result), 201
    
    @app.route('/mfe_struct', methods=['POST'])
    # pylint: disable=W0612
    def mfe_struct():
        app.logger.info(request.json);
        if not request.json:
            abort(400, "Request has no json.")
            
        if 'seq' not in request.json:
            abort(400, "Request has no sequence in the json.")

        if re.match("^[ACGTUWSMKRYBDHV]+$", request.json['seq']) is None:
            abort(400, "Invalid sequence: {}".format(request.json['seq']))


        result = RNA.fold(str(request.json['seq']))[0]
        return json.dumps(result), 201

    @app.route('/colors_to_json', methods=['POST'])
    def colors_to_json():
        app.logger.info(request.json);
        if not request.json:
            abort(400, "Request has no json.")

        if 'text' not in request.json:
            abort(400, "Request has no text field.")

        try:
            color_json = forna.parse_colors_text(request.json['text'])
        except Exception as ex:
            app.logger.exception(ex)
            abort(400, "Custom color error: {}".format(str(ex)))

        return json.dumps(color_json)

    @app.route('/pdb_to_graph', methods=['POST'])
    def pdb_to_graph():
        from werkzeug import secure_filename

        name = secure_filename(request.files['pdb_file'].filename)

        try:
            result = forna.pdb_to_json(request.files['pdb_file'].read(), name)
        except Exception as ex:
            app.logger.exception(ex)
            abort(400, "PDB file parsing error: {}".format(str(ex)))

        return json.dumps(result), 201
    
    if static:
        print >> sys.stderr, " * Starting static"
        # serving static files for developmental purpose
        @app.route('/')
        # pylint: disable=W0612
        def index():
            return app.send_static_file('index.html')

        @app.route('/js/<path:path>')
        # pylint: disable=W0612
        def static_js(path):
            return app.send_static_file(os.path.join('js', path))

        @app.route('/css/<path:path>')
        # pylint: disable=W0612
        def static_css(path):
            return app.send_static_file(os.path.join('css', path))
	
        @app.route('/fonts/<path:path>')
        # pylint: disable=W0612
        def static_fonts(path):
            return app.send_static_file(os.path.join('fonts', path)) 

        @app.route('/img/<path:path>')
        # pylint: disable=W0612
        def static_img(path):
            return app.send_static_file(os.path.join('img', path)) 

        # end serving static files

    return app

def main():
    usage = """
    python forna_server.py"""
    num_args = 0
    parser = OptionParser(usage=usage)

    #parser.add_option('-o', '--options', dest='some_option', default='yo', help="Place holder for a real option", type='str')
    parser.add_option('-p', '--port', dest='port', default=8008, help="Listen on this port", type='int')
    parser.add_option('-d', '--debug', dest='debug', default=False, help="Run in debug mode", action='store_true')
    parser.add_option('-o', '--host', dest='host', default='127.0.0.1', help='The host address', type='str')
    parser.add_option('-s', '--static', dest='static', default=False, action='store_true', help='Also serve static files.')

    (options, args) = parser.parse_args()

    if len(args) < num_args:
        parser.print_help()
        sys.exit(1)

    app = create_app(options.static)
    app.run(host=options.host, debug=options.debug, port=options.port)

if __name__ == '__main__':
    main()
