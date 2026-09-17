from django.contrib import admin
from django.db import connection
from django.core.cache import cache
from django.http import JsonResponse
from django.urls import path, include
from django.views.generic import TemplateView
from drf_spectacular.views import SpectacularAPIView


def _db_ok() -> bool:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return True
    except Exception:
        return False


def _cache_ok() -> bool:
    try:
        cache.set("healthz", "1", 5)
        return cache.get("healthz") == "1"
    except Exception:
        return False


def health_check(request):
    """Liveness: process is up. Does not fail hard on deps (use /readyz for that)."""
    return JsonResponse(
        {
            "status": "ok",
            "service": "kura-api",
            "version": "1.0.0",
            "checks": {
                "database": "ok" if _db_ok() else "fail",
                "cache": "ok" if _cache_ok() else "fail",
            },
        }
    )


def ready_check(request):
    """Readiness: fail closed if DB (or cache when Redis is configured) is down."""
    db = _db_ok()
    cache_ok = _cache_ok()
    ready = db and cache_ok
    return JsonResponse(
        {
            "status": "ready" if ready else "not_ready",
            "checks": {
                "database": "ok" if db else "fail",
                "cache": "ok" if cache_ok else "fail",
            },
        },
        status=200 if ready else 503,
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz", health_check, name="health_check"),
    path("readyz", ready_check, name="ready_check"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", TemplateView.as_view(template_name="scalar.html"), name="scalar-docs"),
    path("api/v1/auth/", include("accounts.urls.auth")),
    path("api/v1/media/", include("core.urls.media")),
    path("api/v1/config/", include("core.urls.config")),
    path("api/v1/internal/jobs/", include("core.urls.jobs")),
    path("api/v1/", include("accounts.urls")),
    path("api/v1/", include("audit.urls")),
    path("api/v1/", include("notifications.urls")),
    path("api/v1/mobility/", include("mobility.urls")),
    path("api/v1/finance/", include("finance.urls")),
    path("api/v1/operations/", include("operations.urls")),
    path("api/v1/analytics/", include("analytics.urls")),
    path("api/v1/", include("analytics.urls_reports")),
    path("api/v1/telemetry/", include("mobility.urls_telemetry")),
    path("api/v1/webhooks/", include("integrations.urls")),
    path("api/v1/support/", include("support.urls")),
    path("api/v1/risk/", include("risk.urls")),
    path("api/v1/credit/", include("credit.urls")),
    path("api/v1/offers/", include("credit.urls_offers")),
    path("api/v1/segments/", include("credit.urls_segments")),
]
