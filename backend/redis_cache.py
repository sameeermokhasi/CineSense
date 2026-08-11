"""
backend/redis_cache.py
Redis Caching Layer for ultra-fast recommendation caching and user genre viewing history.
Includes high-performance In-Memory fallback if Redis is not locally active.
"""

import os
import json
import logging
from typing import Optional, List, Dict, Any

logger = logging.getLogger("cinesense.redis")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

redis_client = None
_in_memory_cache: Dict[str, Any] = {}
_in_memory_user_genres: Dict[str, Dict[str, int]] = {}
_in_memory_user_history: Dict[str, List[Dict[str, Any]]] = {}

try:
    import redis
    redis_client = redis.Redis.from_url(REDIS_URL, socket_connect_timeout=2, decode_responses=True)
    redis_client.ping()
    logger.info("Connected to Redis Cache successfully.")
except Exception as e:
    redis_client = None
    logger.info("Redis not available (%s). Utilizing high-performance In-Memory cache fallback.", str(e))


def set_cached_recommendations(movie_title: str, n: int, data: List[Dict[str, Any]], ttl_seconds: int = 3600) -> None:
    """Caches recommendation output in Redis for instant <1ms response."""
    key = f"rec:{movie_title.strip().lower()}:{n}"
    val = json.dumps(data)

    if redis_client:
        try:
            redis_client.setex(key, ttl_seconds, val)
            return
        except Exception as e:
            logger.warning("Redis set error: %s", str(e))

    _in_memory_cache[key] = data


def get_cached_recommendations(movie_title: str, n: int) -> Optional[List[Dict[str, Any]]]:
    """Retrieves cached recommendations from Redis."""
    key = f"rec:{movie_title.strip().lower()}:{n}"

    if redis_client:
        try:
            raw = redis_client.get(key)
            if raw:
                return json.loads(raw)
        except Exception as e:
            logger.warning("Redis get error: %s", str(e))

    return _in_memory_cache.get(key)


def flush_recommendation_cache() -> None:
    """Flushes all stale recommendation cache entries."""
    _in_memory_cache.clear()
    if redis_client:
        try:
            keys = redis_client.keys("rec:*")
            if keys:
                redis_client.delete(*keys)
                logger.info("Flushed %d cached recommendation keys from Redis.", len(keys))
        except Exception as e:
            logger.warning("Redis flush error: %s", str(e))



def record_user_watch(user_email: str, movie_title: str, genres: str) -> None:
    """
    Records watched movie and increments user preferred genre counters in Redis.
    E.g. if user watches 3 Idiots (Comedy|Drama), increments Comedy and Drama.
    """
    if not user_email:
        return

    email_clean = user_email.strip().lower()
    genre_list = [g.strip() for g in genres.split("|") if g.strip()]

    # 1. Update genre preferences in Redis
    if redis_client:
        try:
            # Store in user history list (keep latest 30 items)
            history_item = json.dumps({"title": movie_title, "genres": genres})
            redis_client.lpush(f"user:{email_clean}:history", history_item)
            redis_client.ltrim(f"user:{email_clean}:history", 0, 29)

            # Increment genre counts
            for g in genre_list:
                redis_client.hincrby(f"user:{email_clean}:genres", g, 1)
            return
        except Exception as e:
            logger.warning("Redis record error: %s", str(e))

    # In-memory fallback
    if email_clean not in _in_memory_user_genres:
        _in_memory_user_genres[email_clean] = {}
    for g in genre_list:
        _in_memory_user_genres[email_clean][g] = _in_memory_user_genres[email_clean].get(g, 0) + 1

    if email_clean not in _in_memory_user_history:
        _in_memory_user_history[email_clean] = []
    _in_memory_user_history[email_clean].insert(0, {"title": movie_title, "genres": genres})
    _in_memory_user_history[email_clean] = _in_memory_user_history[email_clean][:30]


def get_user_preferred_genres(user_email: str) -> Dict[str, int]:
    """Returns dictionary of genre frequencies for the user sorted by count."""
    if not user_email:
        return {}

    email_clean = user_email.strip().lower()

    if redis_client:
        try:
            counts = redis_client.hgetall(f"user:{email_clean}:genres")
            if counts:
                return {k: int(v) for k, v in counts.items()}
        except Exception as e:
            logger.warning("Redis get genres error: %s", str(e))

    return _in_memory_user_genres.get(email_clean, {})
