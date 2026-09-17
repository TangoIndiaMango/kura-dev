"""Domain errors + uniform error envelope (kura-docs 03 §13)."""
from __future__ import annotations

import re

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


class DomainError(Exception):
    """Raise from services — never DRF ValidationError for domain conflicts."""

    def __init__(
        self,
        code: str,
        message: str,
        details=None,
        http_status=status.HTTP_400_BAD_REQUEST,
        *,
        http=None,
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}
        self.http_status = http if http is not None else http_status


def _request_id_from_context(context) -> str:
    request = context.get("request") if context else None
    if request is None:
        return ""
    return getattr(request, "request_id", "") or ""


def _envelope(code: str, message: str, details, request_id: str, http_status: int) -> Response:
    return Response(
        {
            "error": {
                "code": code,
                "message": message,
                "details": details if details is not None else {},
                "request_id": request_id,
            }
        },
        status=http_status,
    )


_UNIQUE_RE = re.compile(r"Key \((?P<field>[^)]+)\)=\([^)]+\) already exists", re.I)
_UNIQUE_MYSQL_RE = re.compile(r"Duplicate entry .* for key '(?P<field>[^']+)'", re.I)


def _integrity_to_envelope(exc: IntegrityError, request_id: str) -> Response:
    """
    Map DB uniqueness / integrity failures to our envelope.
    DRF does not convert IntegrityError by default — it becomes a raw 500.
    """
    raw = str(exc.__cause__ or exc)
    field = None
    match = _UNIQUE_RE.search(raw) or _UNIQUE_MYSQL_RE.search(raw)
    if match:
        field = match.group("field").split(".")[-1].strip('"')

    if "unique" in raw.lower() or "duplicate" in raw.lower():
        details = {field: ["already exists"]} if field else {"non_field_errors": ["duplicate"]}
        return _envelope(
            "VALIDATION_ERROR",
            "A record with this value already exists.",
            details,
            request_id,
            status.HTTP_409_CONFLICT,
        )

    return _envelope(
        "CONFLICT",
        "This change conflicts with existing data.",
        {"detail": "integrity_error"},
        request_id,
        status.HTTP_409_CONFLICT,
    )


def custom_exception_handler(exc, context):
    request_id = _request_id_from_context(context)

    if isinstance(exc, DomainError):
        response = _envelope(
            exc.code, exc.message, exc.details, request_id, exc.http_status
        )
        if exc.code == "THROTTLED":
            retry = (exc.details or {}).get("retry_after_seconds")
            if retry is not None:
                response["Retry-After"] = str(int(retry))
        return response

    if isinstance(exc, IntegrityError):
        return _integrity_to_envelope(exc, request_id)

    if isinstance(exc, DjangoValidationError):
        if hasattr(exc, "message_dict"):
            details = exc.message_dict
        else:
            details = {"non_field_errors": list(getattr(exc, "messages", [str(exc)]))}
        return _envelope(
            "VALIDATION_ERROR",
            "Please fix the highlighted fields.",
            details,
            request_id,
            status.HTTP_400_BAD_REQUEST,
        )

    response = exception_handler(exc, context)

    if response is not None:
        error_code = getattr(exc, "default_code", "API_ERROR")
        if isinstance(error_code, str):
            error_code = error_code.upper()
        else:
            error_code = "API_ERROR"

        if response.status_code == 404:
            error_code = "NOT_FOUND"
        elif response.status_code == 401:
            error_code = "UNAUTHORIZED"
        elif response.status_code == 403:
            error_code = "FORBIDDEN"
        elif response.status_code == 400:
            error_code = "VALIDATION_ERROR"
        elif response.status_code == 429:
            error_code = "THROTTLED"

        raw = response.data
        # Prefer field errors over a nested {"detail": ...} blob
        if isinstance(raw, dict) and set(raw.keys()) == {"detail"}:
            message = str(raw["detail"])
            details = {}
        elif isinstance(raw, dict):
            message = "Please fix the highlighted fields."
            details = raw
            if "detail" in raw and len(raw) == 1:
                message = str(raw["detail"])
                details = {}
        elif isinstance(raw, list):
            message = "Please fix the highlighted fields."
            details = {"non_field_errors": raw}
        else:
            message = "An error occurred while processing your request."
            details = {"detail": str(raw)}

        response.data = {
            "error": {
                "code": error_code,
                "message": message,
                "details": details,
                "request_id": request_id,
            }
        }

    return response


handler = custom_exception_handler
