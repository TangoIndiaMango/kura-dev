from __future__ import annotations

from django.http import HttpRequest
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.exceptions import DomainError
from core.responses import ok
from integrations.ports.psp import PspCode
from integrations.services.webhooks import ingest_webhook


def _header_map(request: HttpRequest) -> dict[str, str]:
    return {str(k): str(v) for k, v in request.headers.items()}


@csrf_exempt
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def paystack_webhook(request: HttpRequest):
    raw = request.body
    try:
        event, created = ingest_webhook(
            psp=PspCode.PAYSTACK,
            headers=_header_map(request),
            raw_body=raw,
        )
    except DomainError as exc:
        return Response(
            {"error": {"code": exc.code, "message": str(exc)}},
            status=exc.http_status or 400,
        )
    return ok({"id": str(event.id), "created": created, "status": event.status})


@csrf_exempt
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def nomba_webhook(request: HttpRequest):
    raw = request.body
    try:
        event, created = ingest_webhook(
            psp=PspCode.NOMBA,
            headers=_header_map(request),
            raw_body=raw,
        )
    except DomainError as exc:
        return Response(
            {"error": {"code": exc.code, "message": str(exc)}},
            status=exc.http_status or 400,
        )
    return ok({"id": str(event.id), "created": created, "status": event.status})
