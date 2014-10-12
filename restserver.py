from flask import Flask, request, jsonify, abort

import forna
import json
import sys
import os

app = Flask(__name__, static_folder='')

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
# end serving static files

@app.route('/struct_graph', methods=['POST'])
def create_task():
    if not request.json:
        abort(400)
    
    if 'seq' not in request.json and 'struct' not in request:
        abort(400)

    fasta_text = ">some_id\n{}\n{}".format(request.json['seq'],
                                           request.json['struct'])

    result = forna.fasta_to_json(fasta_text)
    return json.dumps(result), 201

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=8008)
