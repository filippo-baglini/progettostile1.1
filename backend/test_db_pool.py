# Run with: venv/bin/python test_db_pool.py  (from backend/; uses the real DB, read-only)
# Connections are reused between requests, handed back clean, checked after idling, and a full pool
# still serves the request (P3).
import time

import psycopg2
from flask import Flask

from db_manager import DBManager, POOL_SIZE, IDLE_CHECK_SECONDS

app = Flask(__name__)
app.teardown_appcontext(DBManager.close_db_connection)


def query(sql):
    with DBManager.get_db_connection().cursor() as cursor:
        cursor.execute(sql)
        return cursor.fetchone()[0]


# Reused: the next request gets an open connection, no new login
with app.app_context():
    first = DBManager.get_db_connection()
    assert query("SELECT 1") == 1
with app.app_context():
    assert DBManager.get_db_connection() is first

# A request that failed mid-transaction: the next one doesn't inherit it
with app.app_context():
    try:
        query("SELECT * FROM no_such_table")
    except psycopg2.Error:
        pass
for _ in range(POOL_SIZE):  # whichever pooled connection comes next
    with app.app_context():
        assert query("SELECT 1") == 1

# Dropped while idle (Supabase closes idle connections): replaced before use
with app.app_context():
    conn = DBManager.get_db_connection()
conn.close()
DBManager._idle_since[id(conn)] = time.monotonic() - IDLE_CHECK_SECONDS - 1
for _ in range(POOL_SIZE):
    with app.app_context():
        assert query("SELECT 1") == 1

# All pooled connections in use: the next request gets one of its own, closed afterwards
contexts = [app.app_context() for _ in range(POOL_SIZE + 1)]
held = []
for ctx in contexts:
    ctx.push()
    held.append(DBManager.get_db_connection())
    assert query("SELECT 1") == 1
extra = held[-1]
for ctx in reversed(contexts):
    ctx.pop()
assert extra.closed and len({id(c) for c in held}) == POOL_SIZE + 1
with app.app_context():
    assert DBManager.get_db_connection() in held[:POOL_SIZE]
print("ok")
