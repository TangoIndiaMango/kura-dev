"""Request identity + timing middleware — foundation for logs and error envelopes."""
from __future__ import annotations

import logging
import time
import uuid

from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin

from core.helpers.client_ip import bind_request, get_client_ip, unbind_request

logger = logging.getLogger("kura.request")


def get_request_id(request) -> str:
    return getattr(request, "request_id", "") or ""


class RequestIdMiddleware(MiddlewareMixin):
    """
    Assigns request_id (incoming X-Request-ID or new UUIDv4).
    Binds request for audit IP/request_id helpers (per-request, never stale).
    Sets response header X-Request-ID.
    Logs one line per request without query strings (PII hygiene).
    """

    HEADER = "HTTP_X_REQUEST_ID"

    def process_request(self, request):
        incoming = request.META.get(self.HEADER, "").strip()
        request.request_id = incoming or str(uuid.uuid4())
        request._kura_start = time.perf_counter()
        bind_request(request)
        request.client_ip = get_client_ip(request)

    def process_response(self, request, response):
        request_id = getattr(request, "request_id", None)
        if request_id:
            response["X-Request-ID"] = request_id

        start = getattr(request, "_kura_start", None)
        if start is not None:
            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            user = getattr(request, "user", None)
            actor_id = ""
            if user is not None and getattr(user, "is_authenticated", False):
                actor_id = str(getattr(user, "pk", "") or "")
            logger.info(
                "request",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.path,
                    "status": response.status_code,
                    "duration_ms": duration_ms,
                    "actor_id": actor_id,
                    "client_ip": getattr(request, "client_ip", None) or "",
                },
            )
        unbind_request(request)
        return response

    def process_exception(self, request, exception):
        unbind_request(request)
        return None


class ServerTimeHeaderMiddleware(MiddlewareMixin):
    """Exposes authoritative UTC clock for client hold countdowns (CORS-exposed)."""

    def process_response(self, request, response):
        response["X-Kura-Server-Time"] = timezone.now().isoformat()
        return response
