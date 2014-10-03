from flask import Flask, request, jsonify, abort

import forna
import sys

app = Flask(__name__)

tasks = [
    {
        'id': 1,
        'title': u'Buy groceries',
        'description': u'Milk, Cheese, Pizza, Fruit, Tylenol', 
        'done': False
    },
    {
        'id': 2,
        'title': u'Learn Python',
        'description': u'Need to find a good Python tutorial on the web', 
        'done': False
    }
]

@app.route('/struct_graph', methods=['POST'])
def create_task():
    if not request.json:
        abort(400)
    
    if 'seq' not in request.json or 'struct' not in request.json:
        abort(400)

    fasta_text = ">some_id\n{}\n{}".format(request.json['seq'],
                                           request.json['struct'])

    result = forna.fasta_to_json(fasta_text)
    return jsonify(result), 201

if __name__ == '__main__':
    app.run(debug=True)
