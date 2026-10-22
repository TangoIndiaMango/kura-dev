"""Production settings — secret key required; other gaps warn at boot."""
from __future__ import annotations

import sys
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

# Missing production config is reported loudly at boot but does not stop the
# deploy (owner's call). Each line names what to set on the host.
CONFIG_WARNINGS: list[str] = []


def _warn(message: str) -> None:
    CONFIG_WARNINGS.append(message)
    print(f"[kura config] WARNING: {message}", file=sys.stderr)


ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS")
if not ALLOWED_HOSTS and env("RENDER_EXTERNAL_HOSTNAME"):
    ALLOWED_HOSTS = [env("RENDER_EXTERNAL_HOSTNAME")]
if not ALLOWED_HOSTS:
    ALLOWED_HOSTS = ["*"]
if "*" in ALLOWED_HOSTS:
    _warn("DJANGO_ALLOWED_HOSTS allows any host; list the API hostnames instead of '*'")

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
if _redis_url:
    CACHES["default"] = {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": _redis_url,
    }
else:
    CACHES["default"] = {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "kura-prod-locmem",
    }
    _warn("REDIS_URL not set; throttles are per-process (weaker with several workers)")

# Riders' NUBANs come from Paystack; without the key every request fails.
if DEFAULT_PSP == "PAYSTACK" and not PAYSTACK_SECRET_KEY:  # noqa: F405
    _warn("PAYSTACK_SECRET_KEY not set; riders cannot get transfer accounts")

# Staff invites and password resets go by email.
if not (EMAIL_ENABLED and EMAIL_HOST):  # noqa: F405
    _warn("EMAIL_ENABLED/EMAIL_HOST not set; staff invite emails only go to the log")

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
if _cors_origins:
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = _cors_origins
else:
    CORS_ALLOW_ALL_ORIGINS = True
    _warn("CORS_ORIGINS not set; any website can call the API")

# No browsable API / session auth in prod API surface
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_RENDERER_CLASSES": ("rest_framework.renderers.JSONRenderer",),
}
