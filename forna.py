#!/usr/bin/python

"""forna.py: A script for converting RNA secondary structure to json objects encoding
   a graph to be visualized using d3.js's force-directed graph layout."""

__author__ = "Peter Kerpedjiev"
__copyright__ = "Copyright 2014"
__version__ = "0.1"
__maintainer__ = "Peter Kerpedjiev"
__email__ = "pkerp@tbi.univie.ac.at"

import forgi.graph.bulge_graph as fgb
import forgi.threedee.utilities.pdb as ftup
import forgi.threedee.model.coarse_grain as ftmc
import forgi.utilities.debug as fud

import Bio.PDB as bpdb
import collections as col
import itertools as it
import json
import math
import numpy as np
import os.path as op
import RNA
import tempfile
import forgi.utilities.stuff as fus
import uuid

import sys
from optparse import OptionParser


def remove_pseudoknots(bg):
    """
    Remove all pseudoknots from the structure and return a list
    of tuples indicate the nucleotide numbers which were in the
    pseudoknots.
    
    @param bg: The BulgeGraph structure
    """
    # store which base pairs we've dissolved
    dissolved_bp = []
    dissolved = True
    while dissolved:
        dissolved = False
        # keep iterating as long as we've dissolved a stem
        for d in bg.mloop_iterator():
            if bg.is_node_pseudoknot(d):
                # does this multiloop lead to a pseudoknot?
                # if so, one of the stems it connects needs to be unravelled
                conn = bg.connections(d)
                conn_len = [(bg.stem_length(c), c) for c in conn]
                conn_len.sort()
                to_dissolve = conn_len[0][1]

                dissolved_bp += list(bg.stem_bp_iterator(to_dissolve))
                bg.dissolve_stem(conn_len[0][1])
                dissolved = True
                break

    return dissolved_bp

def fasta_to_positions(fasta_text):
    bgs = fgb.BulgeGraph.from_fasta_text(fasta_text)

    if len(bgs) < 1:
        raise Exception('Cannot parse fasta sequence')

    bg = bgs[0]
    bp_string = bg.to_dotbracket_string()

    print('bp_string', bp_string, file=sys.stderr);
    RNA.cvar.rna_plot_type = 1
    coords = RNA.get_xy_coordinates(bp_string)
    xs = np.array([coords.get(i).X for i in range(len(bp_string))])
    ys = np.array([coords.get(i).Y for i in range(len(bp_string))])

    return list(zip(xs,ys))

def bg_to_json(bg, circular=False, xs = None, ys = None, uids=None):
    """
    Convert a BulgeGraph to a json file containing a graph layout designed
    to create a nice force-directed graph using the d3 library.
    """
    # the json structure that will hold everything
    struct = {"nodes": [], "links": []}

    # the initial width and height of the screen
    scr_width = 800.
    scr_height = 600.

    # pseudoknot_pairs = []
    pseudoknot_pairs = bg.remove_pseudoknots()

    # the X and Y coordinates of each nucleotide as returned by RNAplot
    bp_string = bg.to_dotbracket_string()

    if xs is None and ys is None:
        coords = RNA.get_xy_coordinates(bp_string)
        xs = np.array([coords.get(i).X for i in range(bg.seq_length)])
        ys = np.array([coords.get(i).Y for i in range(bg.seq_length)])

        # center the structure on the screen
        center_x = np.mean(xs)
        center_y = np.mean(ys)

        center_width = scr_width / 2.
        center_height = scr_height / 2.

        xs = (xs - center_x) + center_width
        ys = (ys - center_y) + center_height

    # corresponds to the colors in d3's category10 color scale
    colors = {'s': 'lightgreen', 'm': '#ff9896', 'i': '#dbdb8d', 'f': 'lightsalmon', 't': 'lightcyan', 'h': 'lightblue',
              'x': 'transparent'}

    for (f, t) in pseudoknot_pairs:
        struct["links"] += [{"source": f - 1, "target": t - 1, "value": 1, "link_type": "pseudoknot"}]

    if uids is None:
        uids = [uuid.uuid4().hex for i in range(bg.seq_length)]

    for i in range(bg.seq_length):
        # use the centered coordinates for each nucleotide
        x = xs[i]
        y = ys[i]
        uid = uids[i]

        # create the nodes with initial positions
        # the  node_name comes from the forgi representation
        node_name = bg.get_node_from_residue_num(i + 1)
        node = {"group": 1, "elem": node_name, "elem_type": node_name[0], "name": bg.seq[i], "id": i + 1,
                "x": x, "y": y, "px": x, "py": y, "color": colors[node_name[0]],
                "uid": uid,
                "node_type": "nucleotide", 'struct_name': bg.name}

        # node = {"group": 1, "name": i+1, "id": i+1}
        struct["nodes"] += [node]

        # link adjacent nodes
        # the numbers for source and target indicate the indices of the nodes
        # in the "nodes" array, not their id or name
        if 0 < i < bg.seq_length:
            link = {"source": i - 1, "target": i, "value": 1, "link_type": "backbone"}
            struct["links"] += [link]

    if circular:
        struct["links"] += [{"source": 0, "target": bg.seq_length-1, "value":1, "link_type": "backbone"}]

    num_nodes = len(struct["nodes"])
    num_labels = 0
    for i in range(bg.seq_length):
        if (i + 1) % 10 == 0:
            node_id = num_nodes + num_labels
            num_labels += 1

            if len(xs) <= bg.seq_length:
                x = xs[i]
                y = ys[i]
                print("here1", file=sys.stderr)
            else:
                # xs and ys have been passed in because the molecule is being updated
                print("here", node_id, file=sys.stderr)
                x = xs[node_id]
                y = ys[node_id]

            struct["nodes"] += [{"group": 1, "name": "{}".format(i + 1), "id": node_id,
                "uid": uuid.uuid4().hex,
                "x": x, "y": y,
                "px": x, "py": y,
                "color": 'transparent', "elem_type": 'l', 'node_type': 'label', "struct_name": bg.name}]
            struct["links"] += [{"source": i, "target": node_id, "value": 1, "link_type": "label_link"}]

    # store the node id of the center id for each loop
    centers_radii = dict()
    num_nodes = len(struct["nodes"])

    def create_loop_node(ds, res_list, node_id):
        """
        Create a pseudo-node in the middle of each loop. This node
        will be the center of the circular arrangement of the loop
        nodes.
        """
        # get the coordinates of the nodes which are part of this loop
        '''
        xs = np.array([coords.get(r).X for r in res_list])
        ys = np.array([coords.get(r).Y for r in res_list])
        '''
        nxs = np.array([xs[r-1] for r in res_list])
        nys = np.array([ys[r-1] for r in res_list])

        # center them on the viewport
        x_pos = np.mean(nxs)
        y_pos = np.mean(nys)

        # create a pseudo node for each of the loops
        struct["nodes"] += [{"group": 1, "name": "", "id": node_id,
                             "x": x_pos, "y": y_pos, "px": x_pos, "py": y_pos,
                             'elem_type':'pseudo', 'uid' : uuid.uuid4().hex,
                             "color": colors['x'], 'node_type': 'pseudo', 'struct_name': bg.name}]

        # some geometric calculations for deciding how long to make
        # the links between alternating nodes
        num_residues = len(res_list)
        angle = (num_residues - 2) * math.pi / (2 * num_residues)
        width = 0.5 / math.cos(angle)

        for d in ds:
            centers_radii[d] = (node_id, width)

        for j, rn in enumerate(res_list):
            # link nodes to the center
            struct["links"] += [{"source": node_id, "target": rn - 1, "value": width, "link_type": "fake"}]

        for j in range(0, (num_residues + 1) / 2):
            # link nodes across the loop
            fri = j
            tri = (j + num_residues / 2)
            struct["links"] += [
                {"source": res_list[fri] - 1, "target": res_list[tri] - 1, "value": width * 2, "link_type": "fake"}]

        for j in range(0, num_residues, 1):
            # link every other node in the loop
            ia = ((num_residues - 2) * math.pi) / num_residues
            # a = math.pi/2 - ia/2.
            c = 2 * math.cos(math.pi / 2. - ia / 2.)
            fri = j
            tri = (j + 2) % num_residues
            struct["links"] += [
                {"source": res_list[fri] - 1, "target": res_list[tri] - 1, "value": c, "link_type": "fake"}]

    # Create the loop pseudo-nodes for hairpins and interior loops
    num_nodes = len(struct["nodes"])
    # pseudoknotted = [item for sublist in pseudoknot_pairs for item in sublist]
    pseudoknotted = []

    counter = 0
    for i, d in enumerate(it.chain(bg.iloop_iterator(),
                                   bg.hloop_iterator())):
        stop = False
        for dr in bg.define_residue_num_iterator(d, adjacent=True):
            if dr in pseudoknotted:
                # don't create loop nodes for pseudoknotted regions
                stop = True
        if stop:
            continue

        create_loop_node([d],
                         list(bg.define_residue_num_iterator(d, adjacent=True)),
                         num_nodes + counter)
        counter += 1

    # create the loop pseudo-nodes for multiloops

    num_nodes = len(struct["nodes"])
    counter = 0
    loops, residue_lists = bg.find_multiloop_loops()
    for loop, residue_list in zip(loops, residue_lists):
        loop_elems = [d for d in loop if d[0] == 'm']

        if bg.is_loop_pseudoknot(loop):
            # we shouldn't make a pseudonode for a psueodknotted node
            continue

        residue_list = sorted(residue_list)

        create_loop_node(loop_elems, residue_list, num_nodes + counter)
        counter += 1

    # create a common node for the external loop
    '''
    eloops = bg.find_external_loops()
    if len(eloops) > 0:
        all_residues = it.chain(*[bg.define_residue_num_iterator(e, adjacent=True) for e in eloops])
        create_loop_node(eloops, sorted(all_residues), len(struct["nodes"]))
    '''

    # link the nodes that are in stems
    for i in range(0, bg.seq_length - 2):
        if i + 1 in pseudoknotted or i + 2 in pseudoknotted or i + 3 in pseudoknotted:
            continue

        # create triangles between semi-adjacent nucleotides
        node1 = bg.get_node_from_residue_num(i + 1)
        #node15 = bg.get_node_from_residue_num(i+2)
        node2 = bg.get_node_from_residue_num(i + 3)

        def create_stem_loop_link(node1, node2):
            """
            Create a link between the second-to-last node on a stem
            and the second-to-last node on a loop.
            """
            res_list = list(bg.define_residue_num_iterator(node2, adjacent=True))
            num_residues = len(res_list)
            ia = ((num_residues - 2) * math.pi) / (num_residues)
            angle1 = 2 * math.pi - ia - math.pi / 2.
            angle2 = (math.pi - angle1) / 2.

            if math.sin(angle2) > 0.00001:
                x = math.sin(angle1) / math.sin(angle2)
            else:
                x = 2.

            struct["links"] += [{"source": i, "target": i + 2, "value": x, "link_type": "fake"}]

        # actually make the stem-loop links
        if node1[0] == 's' and node2[0] == 's' and node1 == node2:
            struct["links"] += [{"source": i, "target": i + 2, "value": 2, "link_type": "fake"}]

        """
        if (node1[0] == 's' and node15[0] == 's' and node2[0] != 's'):
            create_stem_loop_link(node1, node2)

        if (node1[0] != 's' and node15[0] == 's' and node2[0] == 's'):
            create_stem_loop_link(node2, node1)

            pass
        """

    # link paired nucleotides
    for d in bg.stem_iterator():
        prev_f, prev_t = None, None

        for (f, t) in bg.stem_bp_iterator(d):
            link = {"source": f - 1, "target": t - 1, "value": 1, "link_type": "basepair"}
            struct["links"] += [link]

            if prev_f is not None and prev_t is not None:
                struct["links"] += [
                    {"source": f - 1, "target": prev_t - 1, "value": 1 * math.sqrt(2), "link_type": "fake"}]
                struct["links"] += [
                    {"source": t - 1, "target": prev_f - 1, "value": 1 * math.sqrt(2), "link_type": "fake"}]

            prev_f, prev_t = f, t

    return struct


def fasta_to_json(fasta_text, circular=False):
    """
    Create the d3 compatible graph representation from a dotbracket string
    formatted like so:

        >id
        ACCCGGGG
        (((..)))

    @param fasta_text: The fasta string.
    """
    bg = fgb.BulgeGraph()
    bg.from_fasta(fasta_text)
    return bg_to_json(bg, circular=circular)


def parse_ranges(range_text):
    '''
    Parse a numerical range indicated like this:

    13-14,15,16-17

    And a return a sorted array containing the numbers
    covered by this range. Negative values are not
    allowed. Overlapping values will be counted only once.
    '''
    all_nucleotides = set()

    ranges = range_text.split(',')
    for single_range in ranges:
        if single_range.count('-') > 1:
            raise Exception('Too many dashes in the range')
        elif single_range.count('-') == 1:
            parts = single_range.split('-')
            if len(parts) != 2 or parts[0] == '' or parts[1] == '':
                raise Exception('Invalid range')

            try:
                (f,t) = list(map(int, single_range.split('-')))
            except ValueError:
                raise Exception('Range components need to be integers')
        else:
            try:
                (f,t) = (int(single_range), int(single_range))
            except ValueError:
                raise Exception('Range components need to be integers')

        for i in range(f,t+1):
            all_nucleotides.add(i)

    return sorted(all_nucleotides)
    
def parse_colors_text(colors_text):
    '''
    Parse a text string and return a json object which identifies
    the colors with which nucleotides should be colored.

    The colors lines should look like this:

    #color struct_name residue_num color_value
    color 1y26 13 red

    Nucleotide ranges can be specified using dashes:
    
    color 1y26 13-14 red

    Multiple nucleotides and/or ranges can be combined using commas:

    color 1y26 13-14,15 blue

    Highlights are specified in a similar manner, except the effect
    is that the convex hull of the nucleotides of each highlight are
    colored in the color specified.

    @param colors_text: A string containing the color specs
    @return: A json object indicating which nucleotides should 
             have which colors.
    '''
    # colors will be a dictionary indexed by molecule_name, and residue_id
    # 
    colors = col.defaultdict(col.defaultdict)

    for i,line in enumerate(colors_text.split('\n')):
        parts = line.split()

        if len(parts) == 0:
            # we'll let empty lines slide
            continue
        
        if len(parts) > 3:
            raise Exception('Too many parts in line {}'.format(i+1))

        try: 
            nucleotides = parse_ranges(parts[0])
        except Exception as ex:
            raise Exception("Improperly formatted range on line {}: {}".format(i+1, str(ex)))

        color = parts[1]

        for nucleotide in nucleotides:
            #color_entry = {"name":parts[1], "nucleotide":nucleotide, "color":color}
            if len(parts) == 3:
                colors[parts[2]][nucleotide] = color
            else:
                colors[''][nucleotide] = color

            #colors += [color_entry]

    return colors

def json_to_json(rna_json_str):
    '''
    Convert an RNA json string to fasta file, then to a bulge_graph
    and then back to a json.

    The purpose is to maintain the integrity of the molecule and to
    maintain the positions of all the hidden nodes after modification.
    '''
    with open('test.out', 'w') as f:
        f.write(rna_json_str)

    (all_fastas, all_xs, all_ys, all_uids, different_tree_links) = json_to_fasta(rna_json_str)
    big_json = {'nodes': [], 'links': []}

    coords_to_index = dict()
    for fasta_text, xs, ys, uids in zip(all_fastas, all_xs, all_ys, all_uids):
        bg = fgb.BulgeGraph()
        bg.from_fasta(fasta_text)
        new_json = bg_to_json(bg, xs=xs, ys=ys, uids=uids)
        
        for l in new_json['links']:
            # the indices of the new nodes will be offset, so the links
            # have to have their node pointers adjusted as well
            l['source'] += len(big_json['nodes'])
            l['target'] += len(big_json['nodes'])
            big_json['links'] += [l]

        # Create a mapping between the coordinates of a node and its index
        # in the node list. To be used when creating links between different
        # molecules, which are stored according to the coordinates of the nodes
        # being linked
        for i,n in enumerate(new_json['nodes']):
            if n['node_type'] == 'nucleotide':
                coords_to_index[(n['x'], n['y'])] = i + len(big_json['nodes'])

        big_json['nodes'] += new_json['nodes']
  
    # add the links that are between different molecules
    for dtl in different_tree_links:
        fud.pv('dtl')
        n1 = coords_to_index[(dtl[0])]
        n2 = coords_to_index[(dtl[1])]
        
        fud.pv('n1,n2')
        big_json['links'] += [{'source':n1, 'target':n2, 'link_type':'basepair', 'value':1}]

    #fud.pv('big_json["nodes"]')

    return big_json

def json_to_fasta(rna_json_str):
    '''
    Convert an RNA json as returned by fasta to json into a fasta string
    (which will later be used to create a BulgeGraph and the another json.

    :param rna_json_str: A json string representation of an RNA as returned by
    fasta_to_json 
    :return: A fasta string representing this molecule along with
    the x and y coordinates... (fasta, xs, ys), where xs and ys are lists

    '''
    rna_json = json.loads(rna_json_str)

    # store the pair tables for each molecule separately
    pair_list = col.defaultdict(list)
    node_list = col.defaultdict(list)
    label_list = col.defaultdict(list)

    # make dictionaries hashable, it's ok here because it will only be used
    # for the nodes and the links and their values don't change
    class hashabledict(dict):
        def __hash__(self):
            return hash(tuple(sorted(self.items())))

    # store which molecule each node is in
    hashable_links = [hashabledict(l) for l in rna_json['links']]
    hashable_nodes = [hashabledict(n) for n in rna_json['nodes']]

    all_nodes = set([n for n in hashable_nodes if n['node_type'] != 'pseudo'])
    links_dict = col.defaultdict(list)

    for link in hashable_links:
        if link['link_type'] == 'backbone' or link['link_type'] == 'label_link':
            links_dict[hashabledict(link['source'])] += [hashabledict(link['target'])]
            links_dict[hashabledict(link['target'])] += [hashabledict(link['source'])]

    trees = []
    to_visit = []
    nodes_to_trees = dict()

    # calculate the list of trees in the forest of RNA molecules
    # trees correspond to individual molecules 
    # different trees do not share backbone bonds
    while len(all_nodes) > 0:
        # if there's nodes left, then there's a new tree to be made
        to_visit += [list(all_nodes)[0]]
        curr_tree = set()

        while len(to_visit) > 0:
            # the current tree has more nodes
            curr_node = to_visit.pop()
            all_nodes.remove(curr_node)
            curr_tree.add(curr_node)
            nodes_to_trees[curr_node] = curr_tree

            for neighbor in links_dict[curr_node]:
                # add all of the neighbors
                if neighbor not in all_nodes:
                    # we've already seen this neighbor
                    continue
                to_visit.append(neighbor)

        trees += [curr_tree]

    different_tree_links = []
    for link in rna_json['links']:
        # only consider base-pair links
        if link['link_type'] != 'basepair' and link['link_type'] != 'pseudoknot' :
            continue
        
        from_node = hashabledict(link['source'])
        to_node = hashabledict(link['target'])
        #from_node = rna_json['nodes'][link['source']]
        #to_node = rna_json['nodes'][link['target']]

        if nodes_to_trees[from_node] == nodes_to_trees[to_node]:
            # the position of each node in the RNA is one greater than its id

            pair_list[frozenset(nodes_to_trees[from_node])] += [(int(from_node['id']),
                                                     int(to_node['id']))]
            pair_list[frozenset(nodes_to_trees[from_node])] += [(int(to_node['id']),
                                                     int(from_node['id']))]
        else:
            print("Different trees", file=sys.stderr)
            different_tree_links += [((from_node['x'], from_node['y']),
                                      (to_node['x'], to_node['y']))]

    # list the nods in each molecule
    for node in hashable_nodes:
        if node['node_type'] == 'nucleotide':
            node_list[frozenset(nodes_to_trees[node])] += [(node['id'], node['name'], node['x'], node['y'], node['struct_name'], node['uid'])]

        if node['node_type'] == 'label':
            print("adding label", file=sys.stderr)
            label_list[frozenset(nodes_to_trees[node])] += [(node['x'], node['y'])]

    all_fastas = []
    all_xs = []
    all_ys = []
    all_uids = []

    for key in list(node_list.keys()):
        pair_table = fus.tuples_to_pairtable(pair_list[key], len(node_list[key]))
        dotbracket = fus.pairtable_to_dotbracket(pair_table)

        seq = "".join(n[1] for n in node_list[key])
        fud.pv('seq')
        fud.pv('len(seq)')
        fud.pv('len(label_list[key])')

        all_xs += [[n[2] for n in node_list[key]] + [n[0] for n in label_list[key]]]
        all_ys += [[n[3] for n in node_list[key]] + [n[1] for n in label_list[key]]]

        fud.pv('len(all_xs[-1])')

        all_uids += [[n[5] for n in node_list[key]]]

        all_fastas += [">{}\n{}\n{}".format(node_list[key][0][4], seq, dotbracket)]
        fud.pv('all_fastas')

    return (all_fastas, all_xs, all_ys, all_uids, different_tree_links)

def add_colors_to_graph(struct, colors):
    """
    Change the colors in the structure graph. Colors should be a dictionary-fied
    json object containing the following entries:

    [{'name': '1Y26_X', 'nucleotide':15, 'color':'black'}]
    
    @param struct: The structure returned by fasta_to_json
    @param colors: A color dictionary as specified above
    """
    for node in struct['nodes']:
        if node['node_type'] == 'nucleotide':
            if node['struct_name'] in colors:
                if node['id'] in colors[node['struct_name']]:
                    node['color'] = colors[node['struct_name']][node['id']]

    return struct


def main():
    usage = """
    python cg_to_d3_bp.py x.fa

    Create a json file specifying a d3 force-directed graph for this
    secondary structure. If the specified argument is '-', then the
    input is read from stdin.
    """
    num_args = 1
    parser = OptionParser(usage=usage)

    # parser.add_option('-o', '--options', dest='some_option', default='yo', help="Place holder for a real option",
    # type='str')
    # parser.add_option('-u', '--useless', dest='uselesss', default=False, action='store_true', help='Another useless
    #  option')
    parser.add_option('-c', '--colors', dest='colors', default=None,
                      help='Specifiy a json file which contains information about nucleotide colors',
                      type='str')

    (options, args) = parser.parse_args()

    if len(args) < num_args:
        parser.print_help()
        sys.exit(1)

    if args[0] == '-':
        text = sys.stdin.read()
    else:
        fname, fext = op.splitext(args[0])
        if fext == '.cg' or fext == '.bg':
            print("Detected BulgeGraph", file=sys.stderr)
            bg = fgb.BulgeGraph(args[0])
            struct = bg_to_json(bg)
        else:
            print("Detected fasta", file=sys.stderr)
            with open(args[0], 'r') as f:
                text = f.read()

    struct = fasta_to_json(text)

    if options.colors is not None:
        with open(options.colors) as f:
            colors = json.loads(f)
            struct = add_colors_to_graph(struct, colors)

    print(json.dumps(struct, sort_keys=True, indent=4, separators=(',', ': ')))


def pdb_to_json(text, name, parser=None):
    '''
    Create a graph-layout displaying a pdb file which
    presumably contains some RNA

    The text is the contents of the pdb file.

    :param text: The text of the pdb file.
    :param name: The name of the pdb file.
    :param parser: The PDB parser to use (Bio.PDB.PDBParser or Bio.PDB.MMCIFParser)
    '''
    with fus.make_temp_directory() as output_dir:
        fname = op.join(output_dir, '{}.pdb'.format(name))

        with open(fname, 'w') as f:
            # dump the pdb text to a temporary file
            f.write(text)
            f.flush()

            struct = parser.get_structure('temp', fname)
            chains = struct.get_chains()

        molecules = []

        proteins = set()
        rnas = set()

        cgs = dict()

        for chain in chains:
            # create a graph json for each structure in the pdb file
            if ftup.is_protein(chain):
                print("protein", chain, file=sys.stderr)
                proteins.add(chain.id)
                # process protein
                molecules += [{"type": "protein",
                               "header": "{}_{}".format(name, chain.id),
                               "seq": "",
                               "ss": "",
                               "size": len(chain.get_list()),
                               "uids": [uuid.uuid4().hex]}]

                pass
            elif ftup.is_rna(chain):
                print("rna", chain, file=sys.stderr)
                rnas.add(chain.id)
                # process RNA molecules (hopefully)
                cg = ftmc.from_pdb(fname, chain_id=chain.id, 
                                   remove_pseudoknots=True, parser=parser)
                positions = fasta_to_positions(cg.to_fasta_string())
                cg = ftmc.from_pdb(fname, chain_id=chain.id, 
                                   remove_pseudoknots=False, parser=parser)

                cgs[chain.id] = cg
                molecules += [{"type": "rna",
                              "header": "{}_{}".format(name, chain.id),
                              "seq": cg.seq,
                              "ss": cg.to_dotbracket_string(),
                              "size": cg.seq_length,
                               "uids": [uuid.uuid4().hex for i in range(cg.seq_length)],
                              "positions": positions }]
            else:
                # hetatm type chains which are present in MMCIF files
                pass

        # create a lookup table linking the id and residue number to the uid of 
        # that nucleotide and residue number
        node_ids = dict()
        for m in molecules:
            for i,uid in enumerate(m['uids']):
                node_ids["{}_{}".format(m['header'],i+1)] = uid

        links = []
        for (a1, a2) in ftup.interchain_contacts(struct):
            if (a1.parent.id[0] != ' ' or a2.parent.id[0] != ' '):
                #hetatm's will be ignored for now
                continue

            chain1 = a1.parent.parent.id
            chain2 = a2.parent.parent.id

            # the source and target values below need to be reduced by the length of the
            # nodes array because when the jsons are added to the graph, the link
            # source and target are incremented so as to correspond to the new indeces
            # of the nodes
            # so a link to a node at position 10, if there are 50 nodes, will have to have
            # a source value of -40
            if (chain1 in proteins and chain2 in rnas):
                # get the index of this nucleotide in the secondary structure
                sid = cgs[chain2].seq_ids.index(a2.parent.id)

                links += [{"source": node_ids["{}_{}_{}".format(name, chain2, sid+1)],
                           "target": node_ids["{}_{}_{}".format(name, chain1, 1)],
                           "link_type": "protein_chain",
                           "value": 3}]
            elif (chain2 in proteins and chain1 in rnas):
                # get the index of this nucleotide in the secondary structure

                sid = cgs[chain1].seq_ids.index(a1.parent.id)

                links += [{"source": node_ids["{}_{}_{}".format(name, chain1, sid+1)],
                           "target": node_ids["{}_{}_{}".format(name, chain2, 1)],
                           "link_type": "protein_chain",
                           "value": 3}]
            elif (chain2 in rnas and chain1 in rnas):
                # get the index of this nucleotide in the secondary structure

                sid1 = cgs[chain1].seq_ids.index(a1.parent.id)
                sid2 = cgs[chain2].seq_ids.index(a2.parent.id)

                links += [{"source": node_ids["{}_{}_{}".format(name, chain1, sid1+1)],
                           "target": node_ids["{}_{}_{}".format(name, chain2, sid2+1)],
                           "link_type": "chain_chain",
                           "value": 3}]

        return {"molecules": molecules, "extra_links": links }

if __name__ == '__main__':
    main()

