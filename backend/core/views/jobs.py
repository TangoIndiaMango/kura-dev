"""Internal cron-triggered jobs — cheap HTTP when no long-lived worker is running."""
from __future__ import annotations

import hmac

from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.exceptions import DomainError
from mobility.services.plans.jobs import (
    activate_due_price_matrices,
    expire_due_subscriptions,
    notify_price_change_before_renew,
    renew_due_subscriptions,
)
from mobility.services.batteries.unreturned import process_unreturned_batteries


def _cron_secret_ok(request) -> bool:
    expected = (getattr(settings, "CRON_SECRET", None) or "").strip()
    if not expected:
        return False
    provided = (
        request.headers.get("X-Cron-Secret")
        or request.META.get("HTTP_X_CRON_SECRET")
        or ""
    ).strip()
    if not provided and request.headers.get("Authorization", "").lower().startswith(
        "bearer "
    ):
        provided = request.headers["Authorization"][7:].strip()
    return bool(provided) and hmac.compare_digest(provided, expected)


class FlagUnreturnedJobView(APIView):
    """
    Optional HTTP twin for cron-job.org when `just worker` is not running.
    Prefer DatabaseBackend worker (enqueues the same sweep).

    POST /api/v1/internal/jobs/flag-unreturned/
    Header: X-Cron-Secret: <CRON_SECRET>
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(exclude=True)
    def post(self, request):
        if not _cron_secret_ok(request):
            raise DomainError("AUTH_INVALID", "Invalid cron secret.", http=401)
        limit = int(request.query_params.get("limit") or request.data.get("limit") or 200)
        result = process_unreturned_batteries(limit=max(1, min(limit, 1000)))
        return Response({"ok": True, "job": "flag_unreturned_batteries", **result})


class RenewSubscriptionsJobView(APIView):
    """POST /api/v1/internal/jobs/renew-subscriptions/ — expire + auto-renew."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(exclude=True)
    def post(self, request):
        if not _cron_secret_ok(request):
            raise DomainError("AUTH_INVALID", "Invalid cron secret.", http=401)
        limit = int(request.query_params.get("limit") or request.data.get("limit") or 100)
        limit = max(1, min(limit, 500))
        result = {
            **expire_due_subscriptions(limit=limit),
            **renew_due_subscriptions(limit=limit),
            **notify_price_change_before_renew(within_hours=24, limit=limit),
        }
        return Response({"ok": True, "job": "renew_subscriptions", **result})


class ActivateDueMatricesJobView(APIView):
    """POST /api/v1/internal/jobs/activate-due-matrices/ — scheduled tariffs."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(exclude=True)
    def post(self, request):
        if not _cron_secret_ok(request):
            raise DomainError("AUTH_INVALID", "Invalid cron secret.", http=401)
        limit = int(request.query_params.get("limit") or request.data.get("limit") or 100)
        result = activate_due_price_matrices(limit=max(1, min(limit, 500)))
        return Response({"ok": True, "job": "activate_due_matrices", **result})
