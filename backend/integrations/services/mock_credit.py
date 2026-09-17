"""Dev-only wallet credit — sandbox top-up without a real PSP / USSD gateway."""
from __future__ import annotations

from django.conf import settings

from core.exceptions import DomainError
from core.ids import uuid7
from core.services.events import emit_event
from finance.models import Payment, VirtualAccount
from finance.services import WalletService


def demo_fund_enabled() -> bool:
    return bool(settings.DEBUG and getattr(settings, "PSP_ALLOW_DEV_VA", False))


def apply_dev_wallet_credit(
    *,
    account,
    amount_kobo: int,
    actor,
    source: str = "ussd_mock",
) -> Payment:
    """
    Credit an operator wallet in DEBUG/dev-VA mode.
    Idempotent via psp_reference. Maps to NUBAN_TRANSFER (Payment channel set).
    """
    if not demo_fund_enabled():
        raise DomainError(
            "FORBIDDEN",
            "Demo wallet funding is disabled. Transfer to your NUBAN.",
            http=403,
        )
    if amount_kobo <= 0:
        raise DomainError(
            "VALIDATION_ERROR",
            "amount_kobo must be positive.",
            details={"amount_kobo": ["must be > 0"]},
        )
    va = VirtualAccount.objects.filter(account=account).first()
    if not (va and va.status == VirtualAccount.Status.ACTIVE and va.nuban):
        raise DomainError(
            "VA_PENDING",
            "Virtual account is not ready yet. Funding is blocked until NUBAN is active.",
            http=409,
        )
    ref = f"dev-{source}:{uuid7().hex}"
    payment = WalletService.fund_wallet(
        account=account,
        amount_kobo=amount_kobo,
        channel=Payment.Channel.NUBAN_TRANSFER,
        psp_reference=ref,
    )
    emit_event(
        action="wallet.funded",
        subject_type="wallet",
        subject_id=str(account.id),
        subject_label=account.kura_id,
        actor=actor,
        after={
            "amount_kobo": amount_kobo,
            "channel": Payment.Channel.NUBAN_TRANSFER,
            "psp_reference": ref,
            "dev": True,
            "source": source,
        },
        metadata={"payment_id": str(payment.id), "receipt_code": payment.receipt_code},
    )
    return payment
