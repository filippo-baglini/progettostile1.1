# Run with: venv/bin/python test_rate_limit.py  (from backend/)
from unittest import mock

from flask import Flask

from rate_limit import rate_limit

app = Flask(__name__)


@app.route('/a')
@rate_limit(per_minute=2)
def a():
    return "ok"


@app.route('/b')
@rate_limit(per_minute=2)
def b():
    return "ok"


client = app.test_client()
other_ip = {'REMOTE_ADDR': '10.0.0.2'}
with mock.patch('rate_limit.time.monotonic', return_value=1000.0):
    assert [client.get('/a').status_code for _ in range(3)] == [200, 200, 429]
    assert client.get('/b').status_code == 200                          # counted per endpoint
    assert client.get('/a', environ_base=other_ip).status_code == 200   # and per IP
with mock.patch('rate_limit.time.monotonic', return_value=1061.0):
    assert client.get('/a').status_code == 200                          # a minute later: allowed again
print("ok")
