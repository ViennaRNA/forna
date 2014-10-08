from flask import Flask, request, jsonify, abort

import forna
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
    
    if 'text' not in request.json:
        abort(400)

    fasta_text = request.json['text']

    result = forna.fasta_to_json(fasta_text)

    # find a way to return a meaningful error
    return jsonify(result), 201

if __name__ == '__main__':
    app.run(debug=True)
