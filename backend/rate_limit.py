"""Abuse protection for the endpoints that call Mistral. Not the freemium quota (per user and day,
see AUDIT_TODO "Before production")."""
import functools
import threading
import time

from cachetools import TTLCache
from flask import request

# Request times per (endpoint, IP) in the last minute.
# ponytail: in-process, so it holds with one gunicorn worker (C8); several workers need Redis (Flask-Limiter).
# Behind a reverse proxy remote_addr is the proxy: add werkzeug's ProxyFix there.
_recent_requests = TTLCache(maxsize=10_000, ttl=60)
_lock = threading.Lock()


def rate_limit(per_minute):
    """At most `per_minute` requests per IP to the decorated endpoint; more get a 429."""
    def decorator(view):
        @functools.wraps(view)
        def wrapper(*args, **kwargs):
            now = time.monotonic()
            key = (view.__name__, request.remote_addr)
            with _lock:
                recent = [t for t in _recent_requests.get(key, ()) if now - t < 60]
                if len(recent) >= per_minute:
                    return {"error": "Too many requests: wait a minute and try again"}, 429
                _recent_requests[key] = recent + [now]
            return view(*args, **kwargs)
        return wrapper
    return decorator
