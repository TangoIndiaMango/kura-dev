"""
Shared Django settings. Environment-specific modules only override.
DB times are UTC; Africa/Lagos is applied at the API edge / serializers.
"""
from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
REPO_ROOT = BASE_DIR.parent

# Load env from infra/.env then backend/.env (later wins)
load_dotenv(REPO_ROOT / "infra" / ".env")
load_dotenv(BASE_DIR / ".env")


def env(key: str, default: str | None = None) -> str | None:
    return os.environ.get(key, default)


def env_bool(key: str, default: bool = False) -> bool:
    raw = os.environ.get(key)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_list(key: str, default: list[str] | None = None) -> list[str]:
    raw = os.environ.get(key)
    if not raw:
        return default or []
    return [part.strip() for part in raw.split(",") if part.strip()]


def env_int(key: str, default: int = 0) -> int:
    raw = os.environ.get(key)
    if raw is None or not str(raw).strip():
        return default
    try:
        return int(str(raw).strip())
    except ValueError:
        return default


SECRET_KEY = env("DJANGO_SECRET_KEY", "django-insecure-kura-dev-only-change-me")
DEBUG = env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", ["*"])
FIELD_ENCRYPTION_KEY = env("FIELD_ENCRYPTION_KEY", "")
# Shared secret for cron-job.org / compose worker → POST /api/v1/internal/jobs/*
CRON_SECRET = env("CRON_SECRET", "")

# Client IP for audit / throttles. Empty trust = ignore X-Forwarded-For (anti-spoof).
# Prod/staging: set CLIENT_IP_TRUSTED_PROXIES=10.0.0.0/8,172.16.0.0/12 (LB/nginx)
# and/or CLIENT_IP_TRUSTED_HOPS=1. Behind Cloudflare set CLIENT_IP_CLOUDFLARE=true
# and include Cloudflare edge CIDRs (or your tunnel) in TRUSTED_PROXIES.
CLIENT_IP_TRUSTED_PROXIES = env_list("CLIENT_IP_TRUSTED_PROXIES")
CLIENT_IP_TRUSTED_HOPS = env_int("CLIENT_IP_TRUSTED_HOPS", 0)
CLIENT_IP_CLOUDFLARE = env_bool("CLIENT_IP_CLOUDFLARE", False)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    # Local
    "core.apps.CoreConfig",
    "accounts.apps.AccountsConfig",
    "audit.apps.AuditConfig",
    "notifications.apps.NotificationsConfig",
    "mobility.apps.MobilityConfig",
    "finance.apps.FinanceConfig",
    "operations.apps.OperationsConfig",
    "analytics.apps.AnalyticsConfig",
    "integrations.apps.IntegrationsConfig",
    "support.apps.SupportConfig",
    "risk.apps.RiskConfig",
    "credit.apps.CreditConfig",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "core.middleware.RequestIdMiddleware",
    "core.middleware.ServerTimeHeaderMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Database — overridden by local/prod; default is SQLite for zero-friction host runs
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# Cache — LocMem until REDIS_URL is set
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "kura-local",
    }
}

AUTH_USER_MODEL = "accounts.User"

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Display / reporting zone (serializers & date filters use this; DB stays UTC)
DISPLAY_TIME_ZONE = "Africa/Lagos"

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]

# Django Tasks — ImmediateBackend (local/tests) or DatabaseBackend (durable worker).
try:
    import django_tasks
    import sys
    sys.modules.setdefault("django.tasks", django_tasks)
except ImportError:
    pass

_tasks_backend = (env("TASKS_BACKEND", "immediate") or "immediate").strip().lower()
if _tasks_backend == "database":
    TASKS = {
        "default": {
            "BACKEND": "core.tasks.backends.database.DatabaseBackend",
        }
    }
else:
    TASKS = {
        "default": {
            "BACKEND": "django.tasks.backends.immediate.ImmediateBackend",
        }
    }

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "accounts.authentication.SessionVersionJWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    # Feeds default to cursor; catalogue ViewSets opt into page pagination
    "DEFAULT_PAGINATION_CLASS": "core.pagination.KuraCursorPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "core.helpers.filters.TrigramSearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_THROTTLE_CLASSES": (
        "core.throttles.UserBurst",
        "core.throttles.UserSustained",
        "core.throttles.AnonBurst",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "user_burst": "60/min",
        "user_sustained": "2000/day",
        "anon": "20/min",
        # DRF only supports s/m/h/d periods; pack wants 5/15min — enforce tighter in service layer later
        "otp_phone": "5/hour",
        "otp_ip": "30/hour",
        "pin": "10/hour",
        "media_upload": "30/hour",
        "webhook": "600/min",
    },
    "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_RENDERER_CLASSES": ("rest_framework.renderers.JSONRenderer",),
}

_jwt_key = env("JWT_SIGNING_KEY") or SECRET_KEY
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": _jwt_key,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "KURA Mobility API",
    "DESCRIPTION": "Electric vehicle battery swapping platform API",
    "VERSION": "1.0.0",
    "OAS_VERSION": "3.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "SCHEMA_PATH_PREFIX": r"/api/v1",
}

_cors = env_list("CORS_ORIGINS")
if _cors:
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = _cors
else:
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
    ]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "accept",
    "authorization",
    "content-type",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "idempotency-key",
    "x-kura-device-id",
]
CORS_EXPOSE_HEADERS = [
    "x-kura-server-time",
    "x-request-id",
]

DATA_UPLOAD_MAX_MEMORY_SIZE = 12_582_912  # 12 MB — proxy upload to Cloudinary
FILE_UPLOAD_MAX_MEMORY_SIZE = 12_582_912

# Media — Cloudinary (POST /api/v1/media/upload/)
MEDIA_PROVIDER = env("MEDIA_PROVIDER", env("MEDIA_STORAGE_BACKEND", "cloudinary"))
CLOUDINARY_CLOUD_NAME = env("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = env("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = env("CLOUDINARY_API_SECRET", "")
CLOUDINARY_UPLOAD_PRESET = env("CLOUDINARY_UPLOAD_PRESET", "")
CLOUDINARY_FOLDER = env("CLOUDINARY_FOLDER", "uploads")
MEDIA_MAX_FILES_PER_REQUEST = int(env("MEDIA_MAX_FILES_PER_REQUEST", "10") or "10")
MEDIA_MAX_IMAGE_BYTES = int(env("MEDIA_MAX_IMAGE_BYTES", str(8 * 1024 * 1024)) or str(8 * 1024 * 1024))
MEDIA_MAX_DOCUMENT_BYTES = int(
    env("MEDIA_MAX_DOCUMENT_BYTES", str(10 * 1024 * 1024)) or str(10 * 1024 * 1024)
)

# NDPA consent copy version. Bump when the rider-facing terms change: riders
# with an older SERVICE grant are re-prompted on next sign-in.
CONSENT_POLICY_VERSION = env("CONSENT_POLICY_VERSION", "2026-10") or "2026-10"

# Payment Service Providers (PSP)
DEFAULT_PSP = env("DEFAULT_PSP", "PAYSTACK")
PAYSTACK_SECRET_KEY = env("PAYSTACK_SECRET_KEY", "")
PAYSTACK_PUBLIC_KEY = env("PAYSTACK_PUBLIC_KEY", "")
PAYSTACK_PREFERRED_BANK = env("PAYSTACK_PREFERRED_BANK", "wema-bank")
NOMBA_SECRET_KEY = env("NOMBA_SECRET_KEY", "")
NOMBA_WEBHOOK_SECRET = env("NOMBA_WEBHOOK_SECRET", "")
NOMBA_ACCOUNT_ID = env("NOMBA_ACCOUNT_ID", "")
# Local only: attach a generated NUBAN when the real PSP cannot (OTP_DEV_CODE pattern).
PSP_ALLOW_DEV_VA = env_bool("PSP_ALLOW_DEV_VA", DEBUG)

# Email
EMAIL_ENABLED = env_bool("EMAIL_ENABLED", False)
EMAIL_FAIL_SILENTLY = env_bool("EMAIL_FAIL_SILENTLY", True)
EMAIL_HOST = env("EMAIL_HOST", "")
EMAIL_PORT = int(env("EMAIL_PORT", "465") or "465")
EMAIL_HOST_USER = env("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", "")
_default_use_ssl = EMAIL_PORT == 465
EMAIL_USE_SSL = env_bool("EMAIL_USE_SSL", _default_use_ssl)
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", not EMAIL_USE_SSL)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", "KURA <noreply@kura.eco>")
DEFAULT_REPLY_TO = env("DEFAULT_REPLY_TO", "")
KURA_SUPPORT_EMAIL = env("KURA_SUPPORT_EMAIL", "")
FRONTEND_CLIENT_URL = env("FRONTEND_CLIENT_URL", "http://localhost:5175")
FRONTEND_ADMIN_URL = env("FRONTEND_ADMIN_URL", "http://localhost:5176")
EMAIL_LOG_OTP_IN_DEV = env_bool("EMAIL_LOG_OTP_IN_DEV", True)

if EMAIL_HOST and EMAIL_ENABLED:
    EMAIL_BACKEND = env(
        "EMAIL_BACKEND",
        "django.core.mail.backends.smtp.EmailBackend",
    )
else:
    EMAIL_BACKEND = env(
        "EMAIL_BACKEND",
        "django.core.mail.backends.console.EmailBackend",
    )

# Auth / OTP (DEBUG accepts OTP_DEV_CODE as well as the hashed challenge)
OTP_DEV_CODE = env("OTP_DEV_CODE", "123456")
OTP_PEPPER = env("OTP_PEPPER", "")

# Agent cash float: SUCCESS deposits on OPEN shifts (₦500k default).
# CBN 2025 agent banking stresses dedicated float + recon; no PSP cash-in API yet.
CASH_FLOAT_LIMIT_KOBO = int(env("CASH_FLOAT_LIMIT_KOBO", str(50_000_000)) or str(50_000_000))

# Receipt integrity (HMAC). Prefer a dedicated secret in prod; falls back to OTP_PEPPER.
RECEIPT_SIGNING_SECRET = env("RECEIPT_SIGNING_SECRET", "") or env("OTP_PEPPER", "")

# Cooperative savings estimate (vs petrol) — design 03.10, not a guarantee.
COOP_PETROL_LITRES_PER_SWAP = float(env("COOP_PETROL_LITRES_PER_SWAP", "1.2") or "1.2")
COOP_PETROL_PRICE_KOBO_PER_LITRE = int(
    env("COOP_PETROL_PRICE_KOBO_PER_LITRE", str(85_000)) or str(85_000)
)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "redact": {"()": "core.logging.RedactingFilter"},
    },
    "formatters": {
        "jsonish": {
            "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "filters": ["redact"],
            "formatter": "jsonish",
        },
    },
    "loggers": {
        "kura": {"handlers": ["console"], "level": "INFO"},
        "django.request": {"handlers": ["console"], "level": "WARNING"},
    },
}
