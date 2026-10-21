"""Production settings — secrets required; Postgres + Redis expected."""
from __future__ import annotations

from urllib.parse import urlparse

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403
from .base import ALLOWED_HOSTS, CACHES, DATABASES, REST_FRAMEWORK, env, env_bool, env_list

DEBUG = False
PSP_ALLOW_DEV_VA = False
MOCK_IOT_ENABLED = False

SECRET_KEY = env("DJANGO_SECRET_KEY")
if not SECRET_KEY or SECRET_KEY.startswith("django-insecure"):
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set for production")

# Fail closed: a missing value must stop the deploy, not open it up.
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS")
if not ALLOWED_HOSTS and env("RENDER_EXTERNAL_HOSTNAME"):
    ALLOWED_HOSTS = [env("RENDER_EXTERNAL_HOSTNAME")]
if not ALLOWED_HOSTS or "*" in ALLOWED_HOSTS:
    raise ImproperlyConfigured(
        "DJANGO_ALLOWED_HOSTS must list the API hostnames (no '*') in production"
    )

_database_url = env("DATABASE_URL")
if _database_url:
    parsed = urlparse(_database_url)
    DATABASES["default"] = {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": parsed.path.lstrip("/") or "kura",
        "USER": parsed.username or "",
        "PASSWORD": parsed.password or "",
        "HOST": parsed.hostname or "",
        "PORT": str(parsed.port or 5432),
        "CONN_MAX_AGE": 60,
    }

# OTP/PIN throttles and once-a-day job guards live in the cache; a per-process
# memory cache would let each worker count separately.
_redis_url = env("REDIS_URL")
if not _redis_url:
    raise ImproperlyConfigured("REDIS_URL must be set in production (shared cache)")
CACHES["default"] = {
    "BACKEND": "django.core.cache.backends.redis.RedisCache",
    "LOCATION": _redis_url,
}

# Riders' NUBANs come from Paystack; without the key every request fails.
if DEFAULT_PSP == "PAYSTACK" and not PAYSTACK_SECRET_KEY:  # noqa: F405
    raise ImproperlyConfigured("PAYSTACK_SECRET_KEY must be set in production")

# Staff invites and password resets go by email.
if not (EMAIL_ENABLED and EMAIL_HOST):  # noqa: F405
    raise ImproperlyConfigured(
        "EMAIL_ENABLED=true and EMAIL_HOST must be set in production (staff invites)"
    )

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", False)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
# Behind LB/nginx: comma CIDRs and/or hop count so audit IP is the real client.
if not CLIENT_IP_TRUSTED_PROXIES and CLIENT_IP_TRUSTED_HOPS == 0:
    CLIENT_IP_TRUSTED_HOPS = env_int("CLIENT_IP_TRUSTED_HOPS", 1)
SECURE_HSTS_SECONDS = 31_536_000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

_cors_origins = env_list("CORS_ORIGINS")
if not _cors_origins:
    raise ImproperlyConfigured(
        "CORS_ORIGINS must list the rider and admin app URLs in production"
    )
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = _cors_origins

# No browsable API / session auth in prod API surface
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_RENDERER_CLASSES": ("rest_framework.renderers.JSONRenderer",),
}
