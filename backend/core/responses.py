"""
Success response helpers.

Errors use the envelope in core.exceptions.
List feeds use pagination classes (cursor or page).
These helpers keep one-shot success payloads consistent without wrapping every
list in an extra envelope.
"""
from __future__ import annotations

from typing import Any

from rest_framework import status
from rest_framework.response import Response


def ok(data: Any = None, *, status_code: int = status.HTTP_200_OK, headers: dict | None = None) -> Response:
    """Return a success payload as-is (OpenAPI-friendly, no double wrap)."""
    return Response(data if data is not None else {}, status=status_code, headers=headers)


def created(data: Any, *, headers: dict | None = None) -> Response:
    return ok(data, status_code=status.HTTP_201_CREATED, headers=headers)


def accepted(data: Any | None = None, *, headers: dict | None = None) -> Response:
    return ok(data if data is not None else {"status": "accepted"}, status_code=status.HTTP_202_ACCEPTED, headers=headers)


def no_content() -> Response:
    return Response(status=status.HTTP_204_NO_CONTENT)
