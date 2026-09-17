"""Enqueue cash receipt email + PDF after deposit."""
from __future__ import annotations

import logging

from django.db import transaction
from django.tasks import task

logger = logging.getLogger("kura.receipts")


@task
def send_cash_receipt_email_task(*, deposit_id: str) -> bool:
    from core.helpers.mail import send_templated_email
    from django.conf import settings
    from finance.services.receipts import build_cash_receipt_document, render_receipt_pdf
    from operations.models import CashDeposit

    deposit = (
        CashDeposit.objects.select_related("account", "account__owner_user", "hub", "agent")
        .filter(pk=deposit_id)
        .first()
    )
    if deposit is None:
        logger.warning("cash_receipt_missing deposit_id=%s", deposit_id)
        return False
    owner = deposit.account.owner_user
    to = (owner.email if owner else "") or ""
    if not to.strip():
        logger.warning(
            "cash_receipt_no_email deposit_id=%s account=%s",
            deposit_id,
            deposit.account.kura_id,
        )
        return False

    doc = build_cash_receipt_document(deposit=deposit)
    pdf = render_receipt_pdf(doc)
    client_base = getattr(settings, "FRONTEND_CLIENT_URL", "").rstrip("/")
    receipt_url = (
        f"{client_base}/wallet/receipt/{deposit.receipt_code}" if client_base else ""
    )
    return send_templated_email(
        to=to,
        subject=f"Kura cash receipt {deposit.receipt_code} · {doc['amount_label']}",
        template="cash_receipt",
        context={
            "receipt_code": doc["receipt_code"],
            "amount_label": doc["amount_label"],
            "purpose_label": doc["purpose_label"],
            "hub_code": doc["hub_code"],
            "hub_name": doc["hub_name"],
            "operator_name": doc["operator_name"],
            "agent_name": doc["agent_name"],
            "account_kura_id": doc["account_kura_id"],
            "issued_at": doc["issued_at"],
            "issued_at_label": doc.get("issued_at_label") or doc["issued_at"],
            "vehicle_plate": doc.get("vehicle_plate") or "",
            "battery_out": doc.get("battery_out") or "",
            "battery_in": doc.get("battery_in") or "",
            "receipt_url": receipt_url,
        },
        attachments=[
            (f"{deposit.receipt_code}.pdf", pdf, "application/pdf"),
        ],
    )


def enqueue_cash_receipt_email(*, deposit_id: str) -> None:
    def _enqueue() -> None:
        send_cash_receipt_email_task.enqueue(deposit_id=str(deposit_id))

    transaction.on_commit(_enqueue)
