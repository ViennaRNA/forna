#!/usr/bin/python
 
"""forna.py: A script for converting RNA secondary structure to json objects encoding
   a graph to be visualized using d3.js's force-directed graph layout."""
                                                                                                         
__author__      = "Peter Kerpedjiev"
__copyright__   = "Copyright 2014"
__version__     = "0.1"
__maintainer__  = "Peter Kerpedjiev"                                                                   
__email__       = "pkerp@tbi.univie.ac.at"  

import forgi.graph.bulge_graph as fgb
import forgi.utilities.debug as fud

import itertools as it
import json
import math
import numpy as np
import os.path as op
import RNA

import sys
from optparse import OptionParser

def bg_to_json(bg):
    '''
    Convert a BulgeGraph to a json file containing a graph layout designed
    to create a nice force-directed graph using the d3 library.
    '''
    
    # the json structure that will hold everything
    struct = {}
    struct["nodes"] = []
    struct["links"] = []

    # the initial width and height of the screen
    scr_width=800.
    scr_height=600.

    # the X and Y coordinates of each nucleotide as returned by RNAplot
    bp_string =  bg.to_dotbracket_string()
    coords = RNA.get_xy_coordinates(bp_string)
    xs = np.array([coords.get(i).X for i in range(bg.seq_length)])
    ys = np.array([coords.get(i).Y for i in range(bg.seq_length)])

    # center the structure on the screen
    center_x = np.mean(xs)
    center_y = np.mean(ys)

    center_width = scr_width / 2.
    center_height = scr_height / 2.

    new_xs = (xs - center_x) + center_width
    new_ys = (ys - center_y) + center_height

    # corresponds to the colors in d3's category10 color scale
    colors = {'s':'lightgreen', 'm':'#ff9896', 'i':'#dbdb8d', 'f':'lightsalmon', 't':'lightcyan', 'h': 'lightblue', 'x':'transparent'}

    for i in range(bg.seq_length):
        # use the centered coordinates for each nucleotide
        x = new_xs[i]
        y = new_ys[i]

        # create the nodes with initial positions
        # the  node_name comes from the forgi representation
        node_name = bg.get_node_from_residue_num(i+1)
        node = {"group": 1, "elem": node_name, "elem_type": node_name[0], "name": bg.seq[i], "id": i+1, 
                "x": x, "y": y, "px": x, "py": y, "color": colors[node_name[0]],
                "node_type":"nucleotide"}

        #node = {"group": 1, "name": i+1, "id": i+1}
        struct["nodes"] += [node]

        # link adjacent nodes
        # the numbers for source and target indicate the indices of the nodes
        # in the "nodes" array, not their id or name
        if i > 0 and i < bg.seq_length:
            link = {"source": i-1, "target" : i, "value":1}
            struct["links"] += [link]

    num_nodes = len(struct["nodes"])
    num_labels = 0
    for i in range(bg.seq_length):
        if (i+1) % 10 == 0:
            node_id = num_nodes + num_labels
            num_labels += 1

            struct["nodes"] += [{"group": 1, "name": "{}".format(i+1), "id": node_id, 
                "color": 'transparent', 'node_type':'label'}]
            struct["links"] += [{"source": i, "target": node_id, "value":1}]

    # store the node id of the center id for each loop
    centers_radii = dict()
    num_nodes = len(struct["nodes"])

    def create_loop_node(ds, res_list, node_id):
        '''
        Create a pseudo-node in the middle of each loop. This node
        will be the center of the circular arrangement of the loop
        nodes.
        '''
        # get the coordinates of the nodes which are part of this loop
        xs = np.array([coords.get(r).X for r in res_list])
        ys = np.array([coords.get(r).Y for r in res_list])

        # center them on the viewport
        x_pos = np.mean(xs) - center_x + center_width
        y_pos = np.mean(ys) - center_y + center_height

        # create a pseudo node for each of the loops
        struct["nodes"] += [{"group": 1, "name": "", "id": node_id, 
                             "x": x_pos, "y": y_pos, "px":x_pos, "py":y_pos, 
                             "color": colors['x'], 'node_type':'pseudo'}]

        # some geometric calculations for deciding how long to make
        # the links between alternating nodes
        num_residues = len(res_list)
        angle = (num_residues - 2) * math.pi / (2 * num_residues)
        width = 0.5 / math.cos(angle)

        for d in ds:
            centers_radii[d] = (node_id, width)

        for j, rn in enumerate(res_list):
            # link nodes to the center
            struct["links"] += [{"source": node_id, "target": rn - 1, "value":width}]

        for j in range(0, (num_residues+1) / 2):
            # link nodes across the loop
            fri = j
            tri = (j+num_residues/2)
            struct["links"] += [{"source": res_list[fri]-1, "target": res_list[tri]-1, "value":width*2}]

        for j in range(0, num_residues, 1):
            # link every other node in the loop
            ia = ((num_residues - 2) * math.pi) / (num_residues)
            a = math.pi/2 - ia/2.
            c = 2 * math.cos(math.pi/2. - ia / 2.  )
            fri = j
            tri = (j+2) % (num_residues)
            struct["links"] += [{"source": res_list[fri]-1, "target": res_list[tri]-1, "value":c}]

    # Create the loop pseudo-nodes for hairpins and interior loops
    num_nodes = len(struct["nodes"])
    for i,d in enumerate(it.chain(bg.iloop_iterator(), 
                                  bg.hloop_iterator())):
        create_loop_node([d], 
                list(bg.define_residue_num_iterator(d, adjacent=True)),
                num_nodes + i)

    # create the loop pseudo-nodes for multiloops
    num_nodes = len(struct["nodes"])
    for i,m in enumerate(bg.find_multiloop_loops()):
        loop_elems = [d for d in m if d[0] == 'm']
        residue_list = []
        for e in loop_elems:
            residue_list += list(bg.define_residue_num_iterator(e, adjacent=True))

        residue_list.sort()
        create_loop_node(loop_elems, residue_list, num_nodes + i)

    # link the nodes that are in stems
    for i in range(0, bg.seq_length-2):
        # create triangles between semi-adjacent nucleotides
        node1 = bg.get_node_from_residue_num(i+1)
        node15 = bg.get_node_from_residue_num(i+2)
        node2 = bg.get_node_from_residue_num(i+3)

        def create_stem_loop_link(node1, node2):
            '''
            Create a link between the second-to-last node on a stem
            and the second-to-last node on a loop.
            '''
            res_list = list(bg.define_residue_num_iterator(node2, adjacent=True))
            num_residues = len(res_list)
            ia = ((num_residues - 2) * math.pi) / (num_residues)
            angle1 = 2*math.pi - ia - math.pi / 2.
            angle2 = (math.pi - angle1) / 2.

            if math.sin(angle2) > 0.00001:
                x = math.sin(angle1) / math.sin(angle2)
            else:
                x = 2.

            struct["links"] += [{"source": i, "target": i+2, "value": x}]

        # actually make the stem-loop links
        if node1[0] == 's' and node2[0] == 's' and node1 == node2:
            struct["links"] += [{"source": i, "target": i+2, "value": 2}]

        if (node1[0] == 's' and node15[0] == 's' and node2[0] != 's'):
            create_stem_loop_link(node1, node2)

        if (node1[0] != 's' and node15[0] == 's' and node2[0] == 's'):
            create_stem_loop_link(node2, node1)

            pass

    # link paired nucleotides
    num_nodes = len(struct["nodes"])
    for d in bg.stem_iterator():
        prev_f, prev_t = None, None

        for (f, t) in bg.stem_bp_iterator(d):
            link = {"source": f-1, "target": t-1, "value":1}
            struct["links"] += [link]

            if prev_f is not None and prev_t is not None:
                struct["links"] += [{"source": f-1, "target": prev_t-1, "value":1 * math.sqrt(2)}]
                struct["links"] += [{"source": t-1, "target": prev_f-1, "value":1 * math.sqrt(2)}]

            prev_f, prev_t = f,t

    return struct

def fasta_to_json(fasta_text):
    '''
    Create the d3 compatible graph representation from a dotbracket string
    formatted like so:

        >id
        ACCCGGGG
        (((..)))

    @param fasta_text: The fasta string.
    '''
    bg = fgb.BulgeGraph()
    bg.from_fasta(fasta_text)
    return bg_to_json(bg)

def main():
    usage = """
    python cg_to_d3_bp.py x.fa

    Create a json file specifying a d3 force-directed graph for this
    secondary structure. If the specified argument is '-', then the
    input is read from stdin.
    """
    num_args= 1
    parser = OptionParser(usage=usage)

    #parser.add_option('-o', '--options', dest='some_option', default='yo', help="Place holder for a real option", type='str')
    #parser.add_option('-u', '--useless', dest='uselesss', default=False, action='store_true', help='Another useless option')

    (options, args) = parser.parse_args()

    if len(args) < num_args:

        parser.print_help()
        sys.exit(1)

    if args[0] == '-':
        text = sys.stdin.read()
    else:
        fname, fext = op.splitext(args[0])
        fud.pv('fext')
        if fext == '.cg' or fext == '.bg':
            print >>sys.stderr, "Detected BulgeGraph"
            bg = fgb.BulgeGraph(args[0])
            struct = bg_to_json(bg)
        else:
            print >>sys.stderr, "Detected fasta"
            with open(args[0], 'r') as f: text = f.read()
            struct = fasta_to_json(text)

    print json.dumps(struct, sort_keys=True,indent=4, separators=(',', ': '))

if __name__ == '__main__':
    main()

