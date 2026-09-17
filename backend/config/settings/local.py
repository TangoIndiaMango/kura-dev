"""Local development — SQLite by default; Postgres/Redis when URLs are set (Compose)."""
from __future__ import annotations

from urllib.parse import urlparse

from .base import *  # noqa: F403
from .base import CACHES, DATABASES, DEBUG, env, env_bool

DEBUG = env_bool("DJANGO_DEBUG", True)

_database_url = env("DATABASE_URL")
if _database_url:
    parsed = urlparse(_database_url)
    DATABASES["default"] = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": parsed.path.lstrip("/") or "kura",
        "USER": parsed.username or "kura",
        "PASSWORD": parsed.password or "",
        "HOST": parsed.hostname or "localhost",
        "PORT": str(parsed.port or 5432),
        "CONN_MAX_AGE": 60,
    }

_redis_url = env("REDIS_URL")
if _redis_url:
    CACHES["default"] = {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": _redis_url,
    }
