from __future__ import annotations

from typing import Any

from core.money import naira_to_kobo
from integrations.ports.psp import NormalizedPspEvent, PspCode, PspEventKind


def normalize_nomba_payload(payload: dict[str, Any]) -> NormalizedPspEvent:
    event_type = str(payload.get("event_type") or "")
    request_id = str(payload.get("requestId") or "")
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    transaction = (
        data.get("transaction") if isinstance(data.get("transaction"), dict) else {}
    )
    order = data.get("order") if isinstance(data.get("order"), dict) else {}
    bank = data.get("bankAccount") if isinstance(data.get("bankAccount"), dict) else {}
    txn_id = str(transaction.get("transactionId") or request_id)
    event_id = f"{event_type}:{request_id or txn_id}"

    amount = transaction.get("transactionAmount")
    if amount is None:
        amount = order.get("amount")
    amount_kobo = None
    if amount is not None:
        amount_kobo = naira_to_kobo(amount)

    if event_type == "payment_success":
        return NormalizedPspEvent(
            provider=PspCode.NOMBA,
            event_id=event_id,
            kind=PspEventKind.FUNDING_SUCCESS,
            psp_reference=txn_id,
            amount_kobo=amount_kobo,
            currency=str(order.get("currency") or "NGN"),
            account_hint=str(order.get("orderReference") or bank.get("accountNumber") or "")
            or None,
            nuban=str(bank.get("accountNumber") or "") or None,
            bank_name=str(bank.get("bankName") or "") or None,
            account_name=str(bank.get("accountName") or "") or None,
            raw=payload,
        )

    if event_type == "payment_failed":
        return NormalizedPspEvent(
            provider=PspCode.NOMBA,
            event_id=event_id,
            kind=PspEventKind.FUNDING_FAILED,
            psp_reference=txn_id,
            amount_kobo=amount_kobo,
            raw=payload,
        )

    if event_type in {"payment_reversal", "payout_refund"}:
        return NormalizedPspEvent(
            provider=PspCode.NOMBA,
            event_id=event_id,
            kind=PspEventKind.FUNDING_REVERSED,
            psp_reference=txn_id,
            amount_kobo=amount_kobo,
            raw=payload,
        )

    return NormalizedPspEvent(
        provider=PspCode.NOMBA,
        event_id=event_id,
        kind=PspEventKind.UNKNOWN,
        psp_reference=txn_id or event_id,
        raw=payload,
    )
