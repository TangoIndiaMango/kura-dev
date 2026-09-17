from __future__ import annotations

import hashlib
import json
from typing import Any

from integrations.ports.psp import NormalizedPspEvent, PspCode, PspEventKind


def normalize_paystack_payload(payload: dict[str, Any]) -> NormalizedPspEvent:
    event = str(payload.get("event") or "")
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    event_id = _event_id(event, data, payload)

    if event in {"charge.success", "charge.success.offline"}:
        amount = data.get("amount")
        customer = data.get("customer") if isinstance(data.get("customer"), dict) else {}
        auth = data.get("authorization") if isinstance(data.get("authorization"), dict) else {}
        return NormalizedPspEvent(
            provider=PspCode.PAYSTACK,
            event_id=event_id,
            kind=PspEventKind.FUNDING_SUCCESS,
            psp_reference=str(data.get("reference") or ""),
            amount_kobo=int(amount) if amount is not None else None,
            currency=str(data.get("currency") or "NGN"),
            account_hint=str(customer.get("customer_code") or "") or None,
            nuban=str(auth.get("receiver_bank_account_number") or auth.get("account_number") or "")
            or None,
            bank_name=str(auth.get("receiver_bank") or auth.get("bank") or "") or None,
            account_name=str(auth.get("account_name") or "") or None,
            raw=payload,
        )

    if event in {"dedicatedaccount.assign.success", "customeridentification.success"}:
        dedicated = data.get("dedicated_account") if isinstance(data.get("dedicated_account"), dict) else data
        customer = data.get("customer") if isinstance(data.get("customer"), dict) else {}
        return NormalizedPspEvent(
            provider=PspCode.PAYSTACK,
            event_id=event_id,
            kind=PspEventKind.VA_ASSIGNED,
            psp_reference=str(customer.get("customer_code") or dedicated.get("id") or ""),
            nuban=str(dedicated.get("account_number") or "") or None,
            bank_name=str(dedicated.get("bank", {}).get("name") if isinstance(dedicated.get("bank"), dict) else dedicated.get("bank_name") or "")
            or None,
            account_name=str(dedicated.get("account_name") or "") or None,
            account_hint=str(customer.get("customer_code") or "") or None,
            raw=payload,
        )

    if event in {"dedicatedaccount.assign.failed", "customeridentification.failed"}:
        return NormalizedPspEvent(
            provider=PspCode.PAYSTACK,
            event_id=event_id,
            kind=PspEventKind.VA_FAILED,
            psp_reference=str(data.get("reference") or data.get("id") or event_id),
            raw=payload,
        )

    if event.startswith("refund") or event in {"charge.dispute.create"}:
        amount = data.get("amount")
        return NormalizedPspEvent(
            provider=PspCode.PAYSTACK,
            event_id=event_id,
            kind=PspEventKind.FUNDING_REVERSED,
            psp_reference=str(data.get("transaction_reference") or data.get("reference") or ""),
            amount_kobo=int(amount) if amount is not None else None,
            raw=payload,
        )

    return NormalizedPspEvent(
        provider=PspCode.PAYSTACK,
        event_id=event_id,
        kind=PspEventKind.UNKNOWN,
        psp_reference=str(data.get("reference") or event_id),
        raw=payload,
    )


def _event_id(event: str, data: dict[str, Any], payload: dict[str, Any]) -> str:
    for key in ("id", "reference"):
        value = data.get(key)
        if value is not None and value != "":
            return f"{event}:{value}"
    digest = hashlib.sha256(
        json.dumps(payload, sort_keys=True, default=str).encode()
    ).hexdigest()[:32]
    return f"{event}:{digest}"
