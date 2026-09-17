"""L1 signed QR tokens — HMAC payloads for reservations, vehicles, batteries."""
from __future__ import annotations

import hashlib
import hmac
import time
from typing import Any

from django.conf import settings

from core.exceptions import DomainError


def _pepper() -> bytes:
    raw = getattr(settings, "QR_HMAC_PEPPER", None) or settings.SECRET_KEY
    return str(raw).encode("utf-8")


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def sign_parts(*parts: str, secret: str = "") -> str:
    """HMAC-SHA256 over pipe-joined parts; secret is entity qr_secret (may be empty)."""
    msg = "|".join(parts).encode("utf-8")
    key = _pepper() + b"|" + (secret or "").encode("utf-8")
    return hmac.new(key, msg, hashlib.sha256).hexdigest()[:32]


def verify_sig(*, parts: list[str], secret: str, sig: str) -> bool:
    expected = sign_parts(*parts, secret=secret)
    return hmac.compare_digest(expected, (sig or "").strip().lower())


def build_reservation_token(*, reservation_id: str, exp_unix: int, secret: str) -> str:
    sig = sign_parts("rsv", reservation_id, str(exp_unix), secret=secret)
    return f"v1.{reservation_id}.{exp_unix}.{sig}"


def parse_reservation_token(token: str) -> dict[str, Any]:
    raw = (token or "").strip()
    parts = raw.split(".")
    if len(parts) != 4 or parts[0] != "v1":
        raise DomainError("AUTH_INVALID", "Malformed reservation QR.", http=401)
    return {
        "version": parts[0],
        "reservation_id": parts[1],
        "exp": int(parts[2]),
        "sig": parts[3],
        "token": raw,
    }


def verify_reservation_token(*, token: str, secret: str) -> dict[str, Any]:
    parsed = parse_reservation_token(token)
    if parsed["exp"] < int(time.time()):
        raise DomainError(
            "RESERVATION_EXPIRED",
            "Reservation QR has expired.",
            http=409,
        )
    if not verify_sig(
        parts=["rsv", parsed["reservation_id"], str(parsed["exp"])],
        secret=secret,
        sig=parsed["sig"],
    ):
        raise DomainError("AUTH_INVALID", "Reservation QR signature invalid.", http=401)
    return parsed


def build_battery_token(*, serial: str, secret: str) -> str:
    sig = sign_parts("bat", serial, secret=secret)
    return f"kura:bat:v1.{serial}.{sig}"


def parse_battery_token(token: str) -> dict[str, str]:
    raw = (token or "").strip()
    if raw.startswith("kura:bat:v1."):
        rest = raw[len("kura:bat:v1.") :]
        serial, _, sig = rest.partition(".")
        if not serial or not sig:
            raise DomainError("AUTH_INVALID", "Malformed battery QR.", http=401)
        return {"serial": serial, "sig": sig, "token": raw}
    # Accept bare serial for PRINTED scheme only (caller checks scheme).
    return {"serial": raw, "sig": "", "token": raw}


def verify_battery_token(*, token: str, serial: str, secret: str, scheme: str) -> str:
    parsed = parse_battery_token(token)
    if parsed["serial"].upper() != serial.upper():
        raise DomainError("AUTH_INVALID", "Battery QR serial mismatch.", http=401)
    scheme_u = (scheme or "SIGNED").upper()
    if scheme_u == "PRINTED":
        return serial
    if scheme_u in {"BMS_AUTH", "NFC_SUN"}:
        raise DomainError(
            "UNSUPPORTED_SCHEME",
            f"{scheme_u} requires OEM hardware; use SIGNED/PRINTED.",
            http=501,
        )
    if not parsed["sig"] or not verify_sig(
        parts=["bat", serial], secret=secret, sig=parsed["sig"]
    ):
        raise DomainError("AUTH_INVALID", "Battery QR signature invalid.", http=401)
    return serial
