import threading
import time

# Simple in-memory fixed-window limiter.
# For multi-instance production, back this with Redis instead.
_buckets: dict[str, tuple[int, float]] = {}
_lock = threading.Lock()

# FastAPI runs sync `def` routes in a thread pool, so this dict is accessed
# from multiple threads concurrently — bound its growth and do so under a
# lock, or concurrent requests can race on read-modify-write and undercount.
_MAX_BUCKETS = 50_000


def check_rate_limit(key: str, limit: int = 5, window_seconds: int = 60) -> tuple[bool, int]:
    """Return (allowed, retry_after_seconds)."""
    now = time.time()
    with _lock:
        if len(_buckets) > _MAX_BUCKETS:
            expired = [k for k, (_, reset_at) in _buckets.items() if reset_at < now]
            for k in expired:
                del _buckets[k]

        count, reset_at = _buckets.get(key, (0, 0.0))

        if reset_at < now:
            _buckets[key] = (1, now + window_seconds)
            return True, 0

        count += 1
        _buckets[key] = (count, reset_at)
        if count > limit:
            return False, int(reset_at - now) + 1
        return True, 0
