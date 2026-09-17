"""
Client IP for audit / rate-limit — always from the *current* request.

Rules (do not “remember” IP on the user/session for later audits):
1. Prefer connection REMOTE_ADDR when we do not trust any proxy.
2. Never take the leftmost X-Forwarded-For blindly (clients can spoof / inject stale).
3. With trusted proxy CIDRs: walk XFF right→left; first non-trusted hop is the client.
4. With trusted hop count: drop that many rightmost entries, then take the new rightmost.
5. Optional Cloudflare: CF-Connecting-IP only when REMOTE_ADDR is a trusted proxy.
"""
from __future__ import annotations

import ipaddress
from contextvars import ContextVar
from typing import Any

from django.conf import settings

_request_ctx: ContextVar[Any | None] = ContextVar("kura_http_request", default=None)
_bind_token_attr = "_kura_ip_ctx_token"


def bind_request(request: Any) -> None:
    """Call at the start of each HTTP request (middleware)."""
    token = _request_ctx.set(request)
    setattr(request, _bind_token_attr, token)


def unbind_request(request: Any) -> None:
    token = getattr(request, _bind_token_attr, None)
    if token is not None:
        _request_ctx.reset(token)
        setattr(request, _bind_token_attr, None)


def get_current_request() -> Any | None:
    return _request_ctx.get()


def current_request_id() -> str:
    request = get_current_request()
    if request is None:
        return ""
    return getattr(request, "request_id", "") or ""


def current_client_ip() -> str | None:
    """Live IP for this request only — never a stored/stale value."""
    request = get_current_request()
    if request is None:
        return None
    cached = getattr(request, "client_ip", None)
    if cached is not None:
        return cached or None
    return get_client_ip(request)


def get_client_ip(request: Any) -> str | None:
    """Resolve client IP from this request's META (safe under reverse proxies)."""
    remote = _parse_ip(request.META.get("REMOTE_ADDR"))
    trusted = _trusted_networks()
    hops = int(getattr(settings, "CLIENT_IP_TRUSTED_HOPS", 0) or 0)

    if getattr(settings, "CLIENT_IP_CLOUDFLARE", False):
        cf = _parse_ip(request.META.get("HTTP_CF_CONNECTING_IP"))
        if cf is not None and remote is not None and _is_trusted(remote, trusted):
            return str(cf)

    chain = _forwarded_chain(request.META.get("HTTP_X_FORWARDED_FOR", ""))
    if not chain:
        return str(remote) if remote is not None else None

    if trusted:
        for ip in reversed(chain):
            if not _is_trusted(ip, trusted):
                return str(ip)
        return str(remote) if remote is not None else str(chain[-1])

    if hops > 0:
        idx = len(chain) - hops - 1
        chosen = chain[idx] if idx >= 0 else chain[0]
        return str(chosen)

    # Unconfigured trust: ignore XFF so spoofed/stale headers cannot win.
    return str(remote) if remote is not None else None


def _forwarded_chain(header: str) -> list[ipaddress._BaseAddress]:
    out: list[ipaddress._BaseAddress] = []
    for part in (header or "").split(","):
        ip = _parse_ip(part)
        if ip is not None:
            out.append(ip)
    return out


def _parse_ip(raw: str | None) -> ipaddress._BaseAddress | None:
    if not raw:
        return None
    text = str(raw).strip()
    if not text:
        return None
    # Strip optional port on IPv4 "1.2.3.4:1234" (rare in XFF).
    if text.count(":") == 1 and "." in text:
        text = text.split(":", 1)[0]
    # Bracketed IPv6 with port "[::1]:443"
    if text.startswith("[") and "]" in text:
        text = text[1 : text.index("]")]
    try:
        return ipaddress.ip_address(text)
    except ValueError:
        return None


def _trusted_networks() -> list[ipaddress._BaseNetwork]:
    raw = getattr(settings, "CLIENT_IP_TRUSTED_PROXIES", None) or []
    nets: list[ipaddress._BaseNetwork] = []
    for item in raw:
        try:
            nets.append(ipaddress.ip_network(str(item).strip(), strict=False))
        except ValueError:
            continue
    return nets


def _is_trusted(
    ip: ipaddress._BaseAddress,
    networks: list[ipaddress._BaseNetwork],
) -> bool:
    return any(ip in net for net in networks)
