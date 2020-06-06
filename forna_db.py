#!/usr/bin/python

"""forna_db.py: A script for storing forna sessions in a database and retrieve
a unique hash for sharing via link."""

__author__ = "Stefan Hammer"
__copyright__ = "Copyright 2015"
__version__ = "0.1"
__maintainer__ = "Stefan Hammer"
__email__ = "jango@tbi.univie.ac.at"

import uuid
import sqlite3
import threading
import time

database = 'forna.db'

def init():
    """
    If the database does not exist, create it
    """
    conn = sqlite3.connect(database)
    c = conn.cursor()
    c.execute('''CREATE TABLE if not exists share
                (date timestamp, uuid text, json text, static integer)''')
    conn.commit()
    conn.close()

    # start cleanup scheduler
    clean_thread = threading.Thread(target = cleanup)
    clean_thread.daemon = True
    clean_thread.start()

def cleanup():
    while(True):
        conn = sqlite3.connect(database)
        c = conn.cursor()
        c.execute('''DELETE FROM share WHERE date < DATE('now','-50 days') AND static == 0''')
        conn.commit()
        conn.close()
        print(" * Cleaning up database")
        time.sleep(60*60*24)

def put(json):
    """
    Store a json file in the database 
    @param json: The JSON content
    """
    identifier =  uuid.uuid4().hex
    conn = sqlite3.connect(database)
    c = conn.cursor()
    c.execute('''INSERT INTO share VALUES (DATE('now'),?,?,?)''', (identifier, json, 0,))
    
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
    result = c.fetchone()
    if result is None:
        raise NameError("This identifier is not available (any more)!")
    return result[0]

def set_static(identifier):
    """
    set to static by its uuid:

    @param uuid: The unique identifier
    """
    conn = sqlite3.connect(database)
    c = conn.cursor()
    c.execute('UPDATE share SET static=1 WHERE uuid=(?)', (identifier,))
    conn.commit()
    conn.close()
    return "done";
