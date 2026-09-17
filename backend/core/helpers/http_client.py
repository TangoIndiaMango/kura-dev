"""Shared outbound JSON HTTP — use for Paystack, Nomba, and other providers."""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any, Mapping
from urllib import error, request

from core.exceptions import DomainError

logger = logging.getLogger("kura.http")


@dataclass(frozen=True, slots=True)
class HttpJsonResponse:
    status_code: int
    data: dict[str, Any]
    raw: str


def request_json(
    *,
    method: str,
    url: str,
    headers: Mapping[str, str] | None = None,
    body: dict[str, Any] | None = None,
    timeout: float = 20,
    provider: str = "http",
) -> HttpJsonResponse:
    """
    One outbound JSON request. Never log Authorization / secrets.
    Raises DomainError on transport failure or non-2xx.
    """
    method_u = method.upper()
    # Cloudflare (Paystack) rejects Python-urllib's default User-Agent.
    req_headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "KuraBackend/1.0",
        **(dict(headers) if headers else {}),
    }
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = request.Request(url, data=data, method=method_u, headers=req_headers)

    logger.info(
        "outbound_http",
        extra={
            "provider": provider,
            "method": method_u,
            "url": url,
            "has_body": body is not None,
        },
    )
    try:
        with request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            status_code = int(resp.status)
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        logger.warning(
            "outbound_http_error",
            extra={
                "provider": provider,
                "method": method_u,
                "url": url,
                "status_code": exc.code,
            },
        )
        raise DomainError(
            "INTEGRATION_ERROR",
            f"{provider} {method_u} failed ({exc.code}).",
            details={"body": detail[:500]},
            http=502,
        ) from exc
    except error.URLError as exc:
        logger.warning(
            "outbound_http_unreachable",
            extra={"provider": provider, "method": method_u, "url": url},
        )
        raise DomainError(
            "INTEGRATION_ERROR",
            f"{provider} unreachable.",
            http=502,
        ) from exc

    try:
        parsed = json.loads(raw) if raw else {}
    except json.JSONDecodeError as exc:
        raise DomainError(
            "INTEGRATION_ERROR",
            f"{provider} returned non-JSON.",
            details={"raw": raw[:200]},
            http=502,
        ) from exc

    if not isinstance(parsed, dict):
        parsed = {"data": parsed}

    if status_code < 200 or status_code >= 300:
        raise DomainError(
            "INTEGRATION_ERROR",
            f"{provider} {method_u} failed ({status_code}).",
            details=parsed,
            http=502,
        )

    return HttpJsonResponse(status_code=status_code, data=parsed, raw=raw)
