"""
MarketQuest Centralized Caching Layer
Supports:
  - Upstash Redis & standard Redis via redis.Redis (connection pooling, SSL/TLS)
  - Seamless support for rediss:// protocol
  - Thread-safe in-memory L1 cache with TTL and LRU eviction
  - Cache stampede / dog-piling prevention (per-key locking)
  - JSON serialization & deserialization
  - Hit/miss metrics & observability endpoint (/api/cache/stats)
  - Graceful degradation: if Redis is unavailable or unconfigured,
    the application falls back to the in-memory cache without errors.
"""

import os
import json
import time
import fnmatch
import logging
import threading
from typing import Any, Callable, Optional, Dict, Tuple

logger = logging.getLogger("marketquest.cache")

# ── Environment Configurations ───────────────────────────────────────────────
REDIS_URL = os.environ.get("REDIS_URL", "").strip()
REDIS_TOKEN = os.environ.get("REDIS_TOKEN", "").strip()
REDIS_ENABLED = os.environ.get("REDIS_ENABLED", "false").lower() in ("true", "1", "yes")
CACHE_DEFAULT_TTL = int(os.environ.get("CACHE_DEFAULT_TTL", "900"))
CACHE_VERSION = "v1"

# ── Metrics Tracker ─────────────────────────────────────────────────────────
class CacheMetrics:
    def __init__(self):
        self.hits = 0
        self.misses = 0
        self.errors = 0
        self.sets = 0
        self.fallback_hits = 0
        self.start_time = time.time()
        self._lock = threading.Lock()

    def record_hit(self, is_fallback: bool = False):
        with self._lock:
            self.hits += 1
            if is_fallback:
                self.fallback_hits += 1

    def record_miss(self):
        with self._lock:
            self.misses += 1

    def record_set(self):
        with self._lock:
            self.sets += 1

    def record_error(self):
        with self._lock:
            self.errors += 1

    def snapshot(self) -> Dict[str, Any]:
        with self._lock:
            total_requests = self.hits + self.misses
            hit_ratio = round((self.hits / total_requests * 100), 2) if total_requests else 0.0
            return {
                "hits": self.hits,
                "misses": self.misses,
                "hit_ratio_pct": hit_ratio,
                "sets": self.sets,
                "errors": self.errors,
                "fallback_hits": self.fallback_hits,
                "uptime_seconds": int(time.time() - self.start_time),
            }

metrics = CacheMetrics()

# ── In-Memory L1 Cache ──────────────────────────────────────────────────────
class InMemoryCache:
    """Thread-safe in-memory cache with TTL and LRU/size eviction."""
    def __init__(self, max_size: int = 500):
        self._store: Dict[str, Tuple[Any, float]] = {}
        self._max_size = max_size
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            val, expiry = entry
            if time.time() > expiry:
                del self._store[key]
                return None
            return val

    def set(self, key: str, value: Any, ttl: int = CACHE_DEFAULT_TTL):
        with self._lock:
            now = time.time()
            if len(self._store) >= self._max_size:
                # Evict expired entries first
                expired = [k for k, (_, exp) in self._store.items() if now > exp]
                for k in expired:
                    del self._store[k]
                # If still over max size, evict oldest 20%
                if len(self._store) >= self._max_size:
                    keys_to_remove = list(self._store.keys())[: max(1, self._max_size // 5)]
                    for k in keys_to_remove:
                        del self._store[k]
            self._store[key] = (value, now + ttl)

    def delete(self, key: str):
        with self._lock:
            self._store.pop(key, None)

    def delete_pattern(self, pattern: str) -> int:
        with self._lock:
            matching = [k for k in self._store.keys() if fnmatch.fnmatch(k, pattern)]
            for k in matching:
                del self._store[k]
            return len(matching)

    def size(self) -> int:
        with self._lock:
            return len(self._store)

# ── Centralized Cache Manager ───────────────────────────────────────────────
class CacheManager:
    def __init__(self):
        self._redis = None
        self._redis_available = False
        self._mem_cache = InMemoryCache()
        self._in_flight_locks: Dict[str, threading.Lock] = {}
        self._flight_lock = threading.Lock()
        self._initialized = False

    def init(self):
        """Initialize Redis connection with connection pooling & TLS support."""
        if self._initialized:
            return
        self._initialized = True

        if not REDIS_ENABLED or not REDIS_URL:
            logger.info("Redis is disabled or REDIS_URL not set. Running in In-Memory Cache mode.")
            return

        try:
            import redis
            conn_kwargs = {
                "decode_responses": True,
                "socket_connect_timeout": 3.0,
                "socket_timeout": 3.0,
                "retry_on_timeout": True,
                "max_connections": 20,
            }
            if REDIS_URL.startswith("rediss://"):
                conn_kwargs["ssl_cert_reqs"] = None

            self._redis = redis.Redis.from_url(REDIS_URL, **conn_kwargs)
            self._redis.ping()
            self._redis_available = True
            logger.info("Successfully connected to Redis: %s", REDIS_URL.split("@")[-1])
        except Exception as e:
            self._redis_available = False
            metrics.record_error()
            logger.warning("Redis connection failed (%s). Operating in In-Memory fallback mode.", e)

    @property
    def is_redis_active(self) -> bool:
        return self._redis_available and self._redis is not None

    def key(self, namespace: str, **kwargs) -> str:
        """
        Build a deterministic, normalized cache key.
        e.g. key("models", brand="ASUS") -> "mq:v1:models:brand=asus"
        """
        clean_parts = [f"mq:{CACHE_VERSION}:{namespace}"]
        for k in sorted(kwargs.keys()):
            v = kwargs[k]
            if v is not None and v != "":
                norm_v = str(v).strip().lower().replace(" ", "_")
                clean_parts.append(f"{k}={norm_v}")
        return ":".join(clean_parts)

    def get(self, key: str) -> Optional[Any]:
        """Fetch item from Redis, with transparent fallback to memory cache."""
        # 1. Check Redis if active
        if self.is_redis_active:
            try:
                raw = self._redis.get(key)
                if raw is not None:
                    metrics.record_hit(is_fallback=False)
                    return json.loads(raw)
            except Exception as e:
                metrics.record_error()
                logger.warning("Redis GET error on key '%s': %s", key, e)

        # 2. Check In-Memory fallback
        mem_val = self._mem_cache.get(key)
        if mem_val is not None:
            metrics.record_hit(is_fallback=True)
            return mem_val

        metrics.record_miss()
        return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Store item in both memory and Redis."""
        expire = ttl if ttl is not None else CACHE_DEFAULT_TTL
        success = False

        # Always store in memory for fast L1 lookup
        self._mem_cache.set(key, value, ttl=expire)

        # Store in Redis if active
        if self.is_redis_active:
            try:
                serialized = json.dumps(value, default=str)
                self._redis.set(key, serialized, ex=expire)
                success = True
            except Exception as e:
                metrics.record_error()
                logger.warning("Redis SET error on key '%s': %s", key, e)
        else:
            success = True

        metrics.record_set()
        return success

    def delete(self, key: str) -> bool:
        """Delete key from both tiers."""
        self._mem_cache.delete(key)
        if self.is_redis_active:
            try:
                self._redis.delete(key)
                return True
            except Exception:
                metrics.record_error()
                return False
        return True

    def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate keys matching pattern across memory and Redis."""
        count = self._mem_cache.delete_pattern(pattern)
        if self.is_redis_active:
            try:
                keys = list(self._redis.scan_iter(match=pattern, count=100))
                if keys:
                    self._redis.delete(*keys)
                    count += len(keys)
            except Exception as e:
                metrics.record_error()
                logger.warning("Redis SCAN/DELETE error on pattern '%s': %s", pattern, e)
        return count

    def get_or_compute(
        self,
        key: str,
        compute_fn: Callable[[], Any],
        ttl: Optional[int] = None
    ) -> Any:
        """
        Cache-aside pattern with stampede protection.
        Ensures only one thread computes the value on a cache-miss.
        """
        cached = self.get(key)
        if cached is not None:
            logger.info(
                "CACHE HIT backend=%s key=%s",
                "redis+memory" if self.is_redis_active else "in_memory",
                key,
            )
            return cached

        logger.info(
            "CACHE MISS backend=%s key=%s",
            "redis+memory" if self.is_redis_active else "in_memory",
            key,
        )

        with self._flight_lock:
            if key not in self._in_flight_locks:
                self._in_flight_locks[key] = threading.Lock()
            key_lock = self._in_flight_locks[key]

        with key_lock:
            # Re-check inside lock
            cached = self.get(key)
            if cached is not None:
                logger.info(
                    "CACHE HIT backend=%s key=%s after_wait=true",
                    "redis+memory" if self.is_redis_active else "in_memory",
                    key,
                )
                return cached

            t0 = time.perf_counter()
            result = compute_fn()
            duration_ms = (time.perf_counter() - t0) * 1000.0
            logger.debug("Computed cache-miss for '%s' in %.2f ms", key, duration_ms)

            self.set(key, result, ttl=ttl)

        with self._flight_lock:
            if key in self._in_flight_locks and not self._in_flight_locks[key].locked():
                self._in_flight_locks.pop(key, None)

        return result

    def get_status(self) -> Dict[str, Any]:
        """Observability report for health & stats."""
        return {
            "redis_enabled": REDIS_ENABLED,
            "redis_connected": self._redis_available,
            "active_backend": "redis+memory" if self._redis_available else "in_memory_fallback",
            "memory_cache_entries": self._mem_cache.size(),
            "default_ttl_seconds": CACHE_DEFAULT_TTL,
            "metrics": metrics.snapshot(),
        }

# Global singleton
cache = CacheManager()
