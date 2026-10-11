# Lets the browser poll whether a chat request has moved from asking questions to building the outfit
from contextvars import ContextVar

from cachetools import TTLCache

current_request: ContextVar[str | None] = ContextVar('current_request', default=None)

# ponytail: in-process store, only works with a single server process; move to Redis/DB if it ever runs with several workers
_generating = TTLCache(maxsize=1000, ttl=600)


def mark_generating() -> None:
    request_id = current_request.get()
    if request_id:
        _generating[request_id] = True


def is_generating(request_id: str) -> bool:
    return request_id in _generating
