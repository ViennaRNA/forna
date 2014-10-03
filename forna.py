#!/usr/bin/python

import forgi.graph.bulge_graph as fgb
import forgi.utilities.debug as fud

import itertools as it
import json
import math
import numpy as np
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
    scr_height=800.

    # the X and Y coordinates of each nucleotide as returned by RNAplot
    coords = RNA.get_xy_coordinates(bp_string)
    xs = np.array([coords.get(i).X for i in range(bg.seq_length)])
    ys = np.array([coords.get(i).Y for i in range(bg.seq_length)])

    # center the structure on the screen
    center_x = np.mean(xs)
    center_y = np.mean(ys)

    center_width = scr_width / 2.
    center_height = scr_height / 2.

    fud.pv('center_x')
    fud.pv('center_y')
    fud.pv('center_width')
    fud.pv('center_height')

    new_xs = (xs - center_x) + center_width
    new_ys = (ys - center_y) + center_height

    # corresponds to the colors in d3's category10 color scale
    colors = {'s':2, 'i':8, 'm':3, 'f':4, 't':9, 'h': 0, 'x':-1}

    for i in range(bg.seq_length):

        x = new_xs[i]
        y = new_ys[i]
        fud.pv('x, y')

        node = bg.get_node_from_residue_num(i+1)
        # create the nodes
        node = {"group": 1, "elem": node, "name": i+1, "id": i+1, 
                "x": x, "y": y, "px": x, "py": y, "color": colors[node[0]]}

        #node = {"group": 1, "name": i+1, "id": i+1}
        struct["nodes"] += [node]

        # link adjacent nodes
        # the numbers for source and target indicate the indices of the nodes
        # in the "nodes" array, not their id or name
        if i > 0 and i < bg.seq_length:
            link = {"source": i-1, "target" : i, "value":1}
            struct["links"] += [link]

    # store the node id of the center id for each loop
    centers_radii = dict()
    num_nodes = len(struct["nodes"])

    def create_loop_node(ds, res_list, node_id):
        xs = np.array([coords.get(r).X for r in res_list])
        ys = np.array([coords.get(r).Y for r in res_list])

        x_pos = np.mean(xs) - center_x + center_width
        y_pos = np.mean(ys) - center_y + center_height

        # create a fake node for each of the loops
        struct["nodes"] += [{"group": 1, "name": node_id, "id": node_id, "x": x_pos, "y": y_pos, "px":x_pos, "py":y_pos, "color": colors['x']}]

        num_residues = len(res_list)
        angle = (num_residues - 2) * math.pi / (2 * num_residues)
        width = 0.5 / math.cos(angle)
        #fud.pv('num_residues, angle, width')

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

    num_nodes = len(struct["nodes"])
    for i,d in enumerate(it.chain(bg.iloop_iterator(), 
                                  bg.hloop_iterator())):
        create_loop_node([d], 
                list(bg.define_residue_num_iterator(d, adjacent=True)),
                num_nodes + i)

    num_nodes = len(struct["nodes"])
    for i,m in enumerate(bg.find_multiloop_loops()):
        loop_elems = [d for d in m if d[0] == 'm']
        residue_list = []
        for e in loop_elems:
            residue_list += list(bg.define_residue_num_iterator(e, adjacent=True))

        residue_list.sort()
        create_loop_node(loop_elems, residue_list, num_nodes + i)

    fud.pv('centers_radii')

        #fud.pv('loop_elems')
        #fud.pv('residue_list')

    for s in bg.stem_iterator():
        # Link the centers of the loops
        continue
        fud.pv('s, bg.edges[s]')
        if len(bg.edges[s]) < 2:
            # the first stem may not be connected to two elements
            continue

        (c1, c2) = sorted(list(bg.edges[s]))[:2]

        (center1, radius1) = centers_radii[c1]
        (center2, radius2) = centers_radii[c2]

        link_length = 1.0 * ((bg.stem_length(s) - 1) + radius1 + radius2)
        fud.pv('s, bg.stem_length(s), radius1, radius2, link_length')
        #struct["links"] += [{"source": center1, "target": center2, "value": link_length}]


    for i in range(0, bg.seq_length-2):
        # create triangles between semi-adjacent nucleotides
        node1 = bg.get_node_from_residue_num(i+1)
        node15 = bg.get_node_from_residue_num(i+2)
        node2 = bg.get_node_from_residue_num(i+3)

        def create_stem_loop_link(node1, node2):
            res_list = list(bg.define_residue_num_iterator(node2, adjacent=True))
            num_residues = len(res_list)
            ia = ((num_residues - 2) * math.pi) / (num_residues)
            angle1 = 2*math.pi - ia - math.pi / 2.
            angle2 = (math.pi - angle1) / 2.

            if math.sin(angle2) > 0.00001:
                x = math.sin(angle1) / math.sin(angle2)
            else:
                x = 2.

            #fud.pv('node2, i, num_residues, ia, angle1, angle2, x')
            

            struct["links"] += [{"source": i, "target": i+2, "value": x}]

        if node1[0] == 's' and node2[0] == 's' and node1 == node2:
            struct["links"] += [{"source": i, "target": i+2, "value": 2}]

        if (node1[0] == 's' and node15[0] == 's' and node2[0] != 's'):
            create_stem_loop_link(node1, node2)

        if (node1[0] != 's' and node15[0] == 's' and node2[0] == 's'):
            create_stem_loop_link(node2, node1)

            pass

        '''

        if node1[0] == 's' and node2[0] == 's' and node1 == node2:
            # create long link between stem nodes
            struct["links"] += [{"source": i, "target": i+2, "value":width * 2}]
        '''
        
    num_nodes = len(struct["nodes"])
    # used for cross-linking base-pairs
    for d in bg.stem_iterator():
        prev_f, prev_t = None, None

        for (f, t) in bg.stem_bp_iterator(d):
            link = {"source": f-1, "target": t-1, "value":1}
            struct["links"] += [link]

            if prev_f is not None and prev_t is not None:
                struct["links"] += [{"source": f-1, "target": prev_t-1, "value":1 * math.sqrt(2)}]
                struct["links"] += [{"source": t-1, "target": prev_f-1, "value":1 * math.sqrt(2)}]

            prev_f, prev_t = f,t

    '''
    for s1,d,s2 in bg.adjacent_stem_pairs_iterator():
        cr = bg.get_connected_residues(s1, s2)
        for r1, r2 in cr:
            struct["links"] += [{"source": r1-1, "target": r2-1, "value":0}]
    '''

    print json.dumps(struct, sort_keys=True,indent=4, separators=(',', ': '))
    #print json.dumps(struct)

def main():
    usage = """
    python cg_to_d3_bp.py x.cg

    Create a json file specifying a d3 force-directed graph for this
    secondary structure.
    """
    num_args= 1
    parser = OptionParser(usage=usage)

    #parser.add_option('-o', '--options', dest='some_option', default='yo', help="Place holder for a real option", type='str')
    #parser.add_option('-u', '--useless', dest='uselesss', default=False, action='store_true', help='Another useless option')

    (options, args) = parser.parse_args()

    if len(args) < num_args:

        parser.print_help()
        sys.exit(1)

    bg = fgb.BulgeGraph(args[0])
    #bg = fgb.BulgeGraph(dotbracket_str='((...((((...))))....))')
    #bg = fgb.BulgeGraph(dotbracket_str='((((...((((....))))..((((((((((....)))))))))).))))')
    #bg = fgb.BulgeGraph(dotbracket_str='((((((((()))))))))')
    bp_string = bg.to_dotbracket_string()

if __name__ == '__main__':
    main()

