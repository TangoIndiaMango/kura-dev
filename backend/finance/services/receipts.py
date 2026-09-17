"""Cash/payment receipts — attestation + document integrity seal.

Operator + agent names are the proof-of-receipt parties (who paid / who collected).
integrity_hash is a server-side HMAC over the canonical fields so the PDF/JSON
cannot be silently altered. Kura can later wrap the same PDF with an org
signing cert we obtain ourselves (self-issued today, or AATL from DigiCert/
GlobalSign when we want Adobe's blue ribbon).
"""
from __future__ import annotations

import hashlib
import hmac
import json
from io import BytesIO
from typing import Any

from django.conf import settings
from fpdf import FPDF

from core.money import format_naira


def _signing_secret() -> bytes:
    raw = (
        getattr(settings, "RECEIPT_SIGNING_SECRET", "")
        or getattr(settings, "OTP_PEPPER", "")
        or "kura-dev-receipt-secret"
    )
    return str(raw).encode("utf-8")


def _canonical_bytes(payload: dict[str, Any]) -> bytes:
    body = {
        k: v
        for k, v in payload.items()
        if k not in ("integrity_hash", "signature")
    }
    return json.dumps(body, sort_keys=True, separators=(",", ":"), default=str).encode(
        "utf-8"
    )


def seal_receipt_payload(payload: dict[str, Any]) -> str:
    return hmac.new(
        _signing_secret(), _canonical_bytes(payload), hashlib.sha256
    ).hexdigest()


def verify_receipt_seal(payload: dict[str, Any]) -> bool:
    expected = (
        payload.get("integrity_hash") or payload.get("signature") or ""
    ).strip()
    if not expected:
        return False
    return hmac.compare_digest(seal_receipt_payload(payload), expected)


# Back-compat aliases for callers/tests still using the old names.
sign_receipt_payload = seal_receipt_payload
verify_receipt_signature = verify_receipt_seal


def _person_label(user) -> str:
    if user is None:
        return "—"
    name = f"{user.first_name} {user.last_name}".strip()
    return name or user.email or user.phone or str(user.id)


def _format_when(dt) -> str:
    """Human-readable WAT time for receipts (never raw ISO in the UI)."""
    if dt is None:
        return "—"
    from datetime import timezone as dt_tz
    from zoneinfo import ZoneInfo

    from django.utils import timezone as dj_tz

    if dj_tz.is_naive(dt):
        dt = dj_tz.make_aware(dt, timezone=dt_tz.utc)
    local = dt.astimezone(ZoneInfo("Africa/Lagos"))
    return local.strftime("%d %b %Y, %H:%M WAT")


def _attach_swap_pack_fields(doc: dict[str, Any], swap) -> None:
    if swap is None:
        return
    doc["hub_code"] = swap.hub.code
    doc["hub_name"] = swap.hub.name
    doc["vehicle_plate"] = swap.vehicle.registration_plate
    if swap.agent_id and not doc.get("agent_name"):
        doc["agent_name"] = _person_label(swap.agent)
    if swap.returned_battery_id is not None:
        rb = swap.returned_battery
        pct = swap.returned_charge_pct
        doc["battery_in"] = (
            f"{rb.serial} · returned · {pct}%"
            if pct is not None
            else f"{rb.serial} · returned"
        )
    else:
        doc["battery_in"] = "First swap · no pack returned"
    if swap.issued_battery_id is not None:
        ib = swap.issued_battery
        pct = swap.issued_charge_pct
        type_name = getattr(ib.battery_type, "name", None) or ""
        bits = [ib.serial]
        if type_name:
            bits.append(type_name)
        if pct is not None:
            bits.append(f"{pct}%")
        doc["battery_out"] = " · ".join(bits)


def _swap_for_payment(*, payment_id) -> Any | None:
    if not payment_id:
        return None
    from mobility.models import Swap

    return (
        Swap.objects.select_related(
            "hub",
            "vehicle",
            "returned_battery",
            "issued_battery",
            "issued_battery__battery_type",
            "agent",
        )
        .filter(payment_id=payment_id)
        .order_by("-created_at")
        .first()
    )


def build_cash_receipt_document(*, deposit) -> dict[str, Any]:
    agent = deposit.agent
    owner = deposit.account.owner_user
    purpose = (deposit.purpose or "SWAP").upper()
    purpose_label = (
        "Wallet top-up · cash at hub"
        if purpose == "FUND"
        else "Battery swap · cash at hub"
    )
    doc: dict[str, Any] = {
        "schema": "kura.receipt.v1",
        "kind": "AGENT_CASH",
        "receipt_code": deposit.receipt_code,
        "deposit_id": str(deposit.id),
        "payment_id": str(deposit.payment_id) if deposit.payment_id else None,
        "account_id": str(deposit.account_id),
        "account_kura_id": deposit.account.kura_id,
        "amount_kobo": int(deposit.amount_kobo),
        "amount_label": format_naira(int(deposit.amount_kobo)),
        "purpose": purpose,
        "purpose_label": purpose_label,
        "hub_code": deposit.hub.code,
        "hub_name": deposit.hub.name,
        "operator_name": _person_label(owner),
        "operator_user_id": str(owner.id) if owner else None,
        "agent_name": _person_label(agent),
        "agent_id": str(agent.id),
        "shift_id": str(deposit.shift_id),
        "status": deposit.status,
        "psp_agent_ref": deposit.psp_agent_ref or "",
        "issued_at": deposit.created_at.isoformat(),
        "issued_at_label": _format_when(deposit.created_at),
    }
    if purpose == "SWAP":
        _attach_swap_pack_fields(doc, _swap_for_payment(payment_id=deposit.payment_id))
    seal = seal_receipt_payload(doc)
    doc["integrity_hash"] = seal
    doc["signature"] = seal
    return doc


def build_payment_receipt_document(*, payment) -> dict[str, Any]:
    """Itemised wallet/card payment receipt (PLAN, SWAP, FUND, …)."""
    from core.money import split_vat_inclusive

    owner = payment.account.owner_user
    purpose = (payment.purpose or "SWAP").upper()
    purpose_labels = {
        "PLAN": "Plan subscription",
        "SWAP": "Battery swap",
        "FUND": "Wallet funding",
        "CREDIT_REPAY": "Credit repayment",
    }
    amount = int(payment.amount_kobo)
    vat = int(payment.vat_kobo or 0)
    if vat <= 0 and amount > 0 and purpose in {"PLAN", "SWAP"}:
        net, vat = split_vat_inclusive(amount)
    else:
        net = max(0, amount - vat)
    doc: dict[str, Any] = {
        "schema": "kura.receipt.v1",
        "kind": "PAYMENT",
        "receipt_code": payment.receipt_code,
        "payment_id": str(payment.id),
        "account_id": str(payment.account_id),
        "account_kura_id": payment.account.kura_id,
        "channel": payment.channel,
        "amount_kobo": amount,
        "net_kobo": net,
        "vat_kobo": vat,
        "amount_label": format_naira(amount),
        "net_label": format_naira(net),
        "vat_label": format_naira(vat),
        "purpose": purpose,
        "purpose_label": purpose_labels.get(purpose, purpose),
        "operator_name": _person_label(owner),
        "operator_user_id": str(owner.id) if owner else None,
        "psp_reference": payment.psp_reference or "",
        "status": payment.status,
        "issued_at": payment.created_at.isoformat(),
        "issued_at_label": _format_when(payment.created_at),
        "lines": [
            {"label": "Net", "amount_kobo": net},
            {"label": "VAT (7.5%)", "amount_kobo": vat},
            {"label": "Total", "amount_kobo": amount},
        ],
    }

    if purpose == "SWAP":
        _attach_swap_pack_fields(doc, _swap_for_payment(payment_id=payment.id))

    seal = seal_receipt_payload(doc)
    doc["integrity_hash"] = seal
    doc["signature"] = seal
    return doc


def render_receipt_pdf(doc: dict[str, Any]) -> bytes:
    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    pdf.set_margins(18, 18, 18)

    def ascii_text(value: object) -> str:
        return (
            str(value or "-")
            .replace("₦", "NGN ")
            .replace("·", "-")
            .encode("latin-1", "replace")
            .decode("latin-1")
        )

    def soft_break(text: str, width: int = 42) -> str:
        """Insert spaces so long PSP refs wrap inside multi_cell."""
        raw = ascii_text(text)
        if len(raw) <= width:
            return raw
        parts: list[str] = []
        chunk = ""
        for ch in raw:
            chunk += ch
            if len(chunk) >= width and ch in {"-", "_", ":", "/", "."}:
                parts.append(chunk)
                chunk = ""
            elif len(chunk) >= width:
                parts.append(chunk)
                chunk = ""
        if chunk:
            parts.append(chunk)
        return " ".join(parts)

    def line(text: str, *, bold: bool = False, size: int = 11, color=(26, 43, 54)) -> None:
        pdf.set_x(pdf.l_margin)
        pdf.set_font("Helvetica", "B" if bold else "", size)
        pdf.set_text_color(*color)
        pdf.multi_cell(pdf.epw, 6, soft_break(text) if bold else ascii_text(text))

    line("KURA receipt", bold=True, size=18, color=(0, 49, 83))
    line(str(doc.get("purpose_label", "Payment")), size=11, color=(90, 107, 117))
    pdf.ln(2)
    line(str(doc.get("amount_label", "")), bold=True, size=20, color=(13, 124, 143))
    pdf.ln(4)

    when = doc.get("issued_at_label") or doc.get("issued_at")
    for label, value in (
        ("Receipt", doc.get("receipt_code")),
        ("Channel", doc.get("channel")),
        ("PSP reference", doc.get("psp_reference")),
        ("Status", doc.get("status")),
        ("Hub", f"{doc.get('hub_code')} - {doc.get('hub_name')}"),
        ("Vehicle", doc.get("vehicle_plate")),
        ("Battery out", doc.get("battery_out")),
        ("Battery in", doc.get("battery_in")),
        ("Account", doc.get("account_kura_id")),
        ("When", when),
    ):
        if value in (None, "", "None - None", " - "):
            continue
        line(str(label), size=9, color=(91, 107, 117))
        line(str(value), bold=True, size=11)
        pdf.ln(1)

    pdf.ln(4)
    line("Proof of receipt", bold=True, size=12, color=(0, 49, 83))
    pdf.ln(1)
    line("Operator (payer)", size=9, color=(91, 107, 117))
    line(str(doc.get("operator_name")), bold=True, size=12)
    line(str(doc.get("account_kura_id")), size=10, color=(91, 107, 117))
    pdf.ln(3)
    line("Hub agent (collector)", size=9, color=(91, 107, 117))
    line(str(doc.get("agent_name")), bold=True, size=12)
    pdf.ln(6)
    line(
        "If this amount is not what you paid in cash, open Report a problem in the Kura app.",
        size=9,
        color=(91, 107, 117),
    )
    seal = str(doc.get("integrity_hash") or doc.get("signature") or "")
    if seal:
        pdf.ln(4)
        line(f"Kura seal: {seal[:20]}...{seal[-8:]}", size=8, color=(140, 150, 158))

    out = BytesIO()
    pdf.output(out)
    return out.getvalue()
