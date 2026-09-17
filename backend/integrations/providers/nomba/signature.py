from __future__ import annotations

import base64
import hashlib
import hmac
from typing import Any


def build_nomba_canonical_string(
    *,
    event_type: str,
    request_id: str,
    merchant_user_id: str,
    merchant_wallet_id: str,
    transaction_id: str,
    transaction_type: str,
    transaction_time: str,
    response_code: str,
    nomba_timestamp: str,
) -> str:
    code = "" if response_code == "null" else response_code
    return ":".join(
        [
            event_type,
            request_id,
            merchant_user_id,
            merchant_wallet_id,
            transaction_id,
            transaction_type,
            transaction_time,
            code,
            nomba_timestamp,
        ]
    )


def verify_nomba_signature(
    *,
    payload: dict[str, Any],
    headers: dict[str, str],
    secret: str,
) -> bool:
    provided = _header(headers, "nomba-signature") or _header(headers, "nomba-sig-value")
    timestamp = _header(headers, "nomba-timestamp")
    if not provided or not timestamp or not secret:
        return False

    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    merchant = data.get("merchant") if isinstance(data.get("merchant"), dict) else {}
    transaction = (
        data.get("transaction") if isinstance(data.get("transaction"), dict) else {}
    )
    canonical = build_nomba_canonical_string(
        event_type=str(payload.get("event_type") or ""),
        request_id=str(payload.get("requestId") or ""),
        merchant_user_id=str(merchant.get("userId") or ""),
        merchant_wallet_id=str(merchant.get("walletId") or ""),
        transaction_id=str(transaction.get("transactionId") or ""),
        transaction_type=str(transaction.get("type") or ""),
        transaction_time=str(transaction.get("time") or ""),
        response_code=str(transaction.get("responseCode") or ""),
        nomba_timestamp=timestamp,
    )
    expected = base64.b64encode(
        hmac.new(secret.encode("utf-8"), canonical.encode("utf-8"), hashlib.sha256).digest()
    ).decode("utf-8")
    return hmac.compare_digest(expected, provided.strip())


def _header(headers: dict[str, str], name: str) -> str | None:
    target = name.lower()
    for key, value in headers.items():
        if key.lower() == target:
            return value
    return None
