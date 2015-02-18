#!/usr/bin/python

"""forna_db.py: A script for storing forna sessions in a database and retrieve
a unique hash for sharing via link."""

__author__ = "Stefan Hammer"
__copyright__ = "Copyright 2015"
__version__ = "0.1"
__maintainer__ = "Stefan Hammer"
__email__ = "jango@tbi.univie.ac.at"

import json
import math
import uuid
import sqlite3
import sys
from datetime import datetime, date

database = 'forna.db'

def init():
    """
    If the database does not exist, create it
    """
    conn = sqlite3.connect(database)
    c = conn.cursor()
    c.execute('''CREATE TABLE if not exists share
                (date timestamp, uuid text, json text)''')
    conn.commit()
    conn.close()

def put(json):
    """
    Store a json file in the database 
    @param json: The JSON content
    """
    identifier =  uuid.uuid4().hex
    conn = sqlite3.connect(database)
    c = conn.cursor()
    data = (datetime.now(), identifier, json,)
    c.execute('INSERT INTO share VALUES (?,?,?)', data)
    
    conn.commit()
    conn.close()
    
    return identifier

def get(identifier):
    """
    Get json object by its uuid:

    @param uuid: The unique identifier
    """
    conn = sqlite3.connect(database)
    c = conn.cursor()
    c.execute('SELECT json FROM share WHERE uuid=(?)', (identifier,))
    json = c.fetchone()[0]

    return json

