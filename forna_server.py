#!/usr/bin/python

"""forna_server.py: A server for converting RNA secondary structures to force-directed graphs
   and doing something more."""

                                                                                                         
__author__      = "Stefan Hammer"
__copyright__   = "Copyright 2014"
__version__     = "0.1"
__maintainer__  = "Stefan Hammer"
__email__       = "jango@tbi.univie.ac.at"  

from flask import Flask, request, abort

import Bio.PDB as bpdb
import forna
import json
import re
import sys
import os
import RNA
from optparse import OptionParser
from werkzeug.middleware.proxy_fix import ProxyFix

import forgi.utilities.debug as fud
import forgi.utilities.stuff as fus
import forna_db as fdb

def create_app(static):
    '''
    Create the forna application given the options that were passed.

    '''
    app = Flask(__name__, static_folder='htdocs')
    app.wsgi_app = ProxyFix(app.wsgi_app)

    @app.errorhandler(400)
    # pylint: disable=W0612
    def custom405(error):
        app.logger.info(error)
        return error.description, 400

    @app.route('/json_to_json', methods=['POST'])
    # pylint: disable=W0612
    def json_to_json():
        #app.logger.info(request.json);
        if not request.json:
           abort(400, "Missing a json in the request")

        try:
            result = forna.json_to_json(json.dumps(request.json))
        except Exception as ex:
            app.logger.exception(ex)
            abort(400, "Error editing the graph")

        return json.dumps(result)

    @app.route('/struct_positions', methods=['POST'])
    # pylint: disable=W0612
    def struct_positions():
        '''
        Get the positions for each nucleotide as calculated by the NARview
        algorithm.
        '''
        app.logger.info(request.json);
        if not request.json:
           abort(400, "Missing a json in the request")

        if 'seq' not in request.json and 'struct' not in request.json:
            abort(400, "Missing seq and struct in the json file")

        if re.match("^[ACGTUWSMKRYBDHVN\-]+$", request.json['seq'].upper()) is None:
            abort(400, "Invalid sequence: {}".format(request.json['seq']))

        if re.match("^[\(\)\.\[\]\{\}]+[\*]?$", request.json['struct']) is None:
            abort(400, "Invalid structure: {}".format(request.json['struct']))

        if request.json['struct'][-1] == '*':
            structure = request.json['struct'].strip('*')
        else:
            structure = request.json['struct']

        fasta_text = ">{}\n{}\n{}".format(request.json['header'], request.json['seq'], structure)

        try:
            result = forna.fasta_to_positions(fasta_text)
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

        if re.match("^[ACGTUWSMKRYBDHVN]+$", request.json['seq']) is None:
            abort(400, "Invalid sequence: {}".format(request.json['seq']))

        try:
            result = RNA.fold(str(request.json['seq']))[0]
        except Exception as ex:
            app.logger.exception(ex)
            abort(400, "Server exception: {}".format(ex))
        
        return json.dumps(result), 201

    @app.route('/inverse_fold', methods=['POST'])
    # pylint: disable=W0612
    def inverse_fold():
        app.logger.info(request.json);
        if not request.json:
            abort(400, "Request has no json.")

        if 'struct' not in request.json:
            abort(400, "Request has no structure in the json.")

        if re.match("^[\(\)\.]+$", request.json['struct']) is None:
            abort(400, "Invalid structure for inverse fold: {}".format(request.json['struct']))
        
        try:
            pt = fus.dotbracket_to_pairtable(str(request.json['struct'])) 
        except Exception as ex:
            app.logger.exception(ex)
            abort(400, "Unbalanced brackets: {}".format(ex))

        result = RNA.inverse_fold("", str(request.json['struct']))[0]
        return json.dumps(result), 201

    @app.route('/colors_to_json', methods=['POST'])
    # pylint: disable=W0612
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

        try:
            result = forna.pdb_to_json(request.json['pdb'], request.json['name'],
                                       parser=bpdb.PDBParser())
        except Exception as ex:
            app.logger.exception(ex)
            # store pdb files sent to server and failed
            if not os.path.exists("pdb"):
                os.makedirs("pdb")
            fo = open("pdb/"+request.json['name'], "wb")
            fo.write(request.json['pdb'])
            fo.close()
            abort(400, "PDB file parsing error: {}".format(str(ex)))

        return json.dumps(result), 201

    @app.route('/mmcif_to_graph', methods=['POST'])
    def mmcif_to_graph():
        from werkzeug import secure_filename

        name = secure_filename(request.files['pdb_file'].filename)

        try:
            result = forna.pdb_to_json(request.files['pdb_file'].read(), 
                                       name, parser=bpdb.MMCIFParser())
        except Exception as ex:
            app.logger.exception(ex)
            abort(400, "PDB file parsing error: {}".format(str(ex)))

        return json.dumps(result), 201

    @app.route('/store_graph', methods=['POST'])
    def store_graph():
        graph = request.json['graph']
        try:
            identifier = fdb.put(graph)
        except Exception as ex:
            app.logger.exception(ex)
            abort(400, "Database error: {}".format(str(ex)))
        
        app.logger.info("Created Share ID {}".format(identifier))
        return json.dumps(identifier), 201

    @app.route('/get_graph/<id>', methods=['GET'])
    def get_graph(id):
        try:
            app.logger.info("Served Share ID {}".format(id))
            graph = fdb.get(id)
        except Exception as ex:
            app.logger.exception(ex)
            abort(400, "Database error: {}".format(str(ex)))
        
        return "callback(" + json.dumps(graph) + ");", 201

    if static:
        print(" * Starting static", file=sys.stderr)
        # serving static files for developmental purpose
        @app.route('/')
        # pylint: disable=W0612
        def index():
            return app.send_static_file('index.html')

        @app.route('/<file>')
        # pylint: disable=W0612
        def static_root(file):
            return app.send_static_file(file)

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
    parser.add_option('-l', '--log-file', dest='log_file', default='server.log', help='The file to store the logs to')

    (options, args) = parser.parse_args()

    if len(args) < num_args:
        parser.print_help()
        sys.exit(1)

    import logging
    logging.basicConfig(filename=options.log_file,level=logging.INFO, 
                        format='%(asctime)s %(levelname)s: %(message)s '
                        '[in %(pathname)s:%(funcName)s:%(lineno)d]')
    fdb.init()
    app = create_app(options.static)
    app.run(host=options.host, debug=options.debug, port=options.port)

if __name__ == '__main__':
    main()
