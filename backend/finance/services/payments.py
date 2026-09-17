from __future__ import annotations

from django.db import IntegrityError, transaction

from core.exceptions import DomainError
from core.ids import receipt_code as generate_receipt_code
from finance.models import Payment


class PaymentService:
    @staticmethod
    def create_payment(
        *,
        account,
        amount_kobo: int,
        channel: str,
        purpose: str = "SWAP",
        vat_kobo: int = 0,
        status: str = Payment.Status.SUCCESS,
        psp_reference: str | None = None,
        idempotency_key: str | None = None,
    ) -> Payment:
        key = (idempotency_key or "").strip() or None
        if key:
            existing = Payment.objects.filter(idempotency_key=key).first()
            if existing is not None:
                return existing

        last_error: IntegrityError | None = None
        for _ in range(8):
            try:
                with transaction.atomic():
                    return Payment.objects.create(
                        account=account,
                        channel=channel,
                        amount_kobo=amount_kobo,
                        vat_kobo=vat_kobo,
                        purpose=purpose,
                        status=status,
                        receipt_code=generate_receipt_code(),
                        psp_reference=psp_reference or None,
                        idempotency_key=key,
                    )
            except IntegrityError as exc:
                last_error = exc
                if key:
                    existing = Payment.objects.filter(idempotency_key=key).first()
                    if existing is not None:
                        return existing
                if psp_reference:
                    existing = Payment.objects.filter(psp_reference=psp_reference).first()
                    if existing is not None:
                        return existing
                continue
        raise DomainError(
            "INTEGRATION_ERROR",
            "Could not allocate a unique receipt code.",
        ) from last_error
