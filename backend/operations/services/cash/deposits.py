"""Cash deposit ledger (AGENT_CASH) bound to an open shift + cash_float."""
from __future__ import annotations

from django.db import IntegrityError, transaction
from django.db.models import Sum

from accounts.models import Account, User
from core.exceptions import DomainError
from core.ids import receipt_code as generate_receipt_code
from core.money import format_naira, split_vat_inclusive
from core.services.events import NotifySpec, emit_event
from finance.models import LedgerAccount, LedgerTransaction, Payment, Wallet
from finance.services import PaymentService
from finance.services.ledger import LedgerService
from finance.services.wallets import WalletService
from mobility.models import Hub
from notifications.models import Notification
from operations.models import CashDeposit, Shift
from operations.services.cash.float import (
    agent_float_outstanding_kobo,
    assert_within_float_limit,
)


def open_shift_for(*, agent: User, hub: Hub) -> Shift | None:
    return (
        Shift.objects.filter(agent=agent, hub=hub, status=Shift.Status.OPEN)
        .order_by("-opened_at")
        .first()
    )


class CashDepositService:
    @staticmethod
    @transaction.atomic
    def record(
        *,
        agent: User,
        hub: Hub,
        account: Account,
        amount_kobo: int,
        shift: Shift | None = None,
        psp_agent_ref: str = "",
        actor: User | None = None,
        purpose: str = "SWAP",
        idempotency_key: str = "",
    ) -> CashDeposit:
        if amount_kobo <= 0:
            raise DomainError(
                "VALIDATION_ERROR",
                "Cash amount must be positive.",
                details={"amount_kobo": ["positive"]},
            )
        purpose_norm = (purpose or "SWAP").upper()
        if purpose_norm not in ("SWAP", "FUND"):
            raise DomainError(
                "VALIDATION_ERROR",
                "purpose must be SWAP or FUND.",
                details={"purpose": ["invalid"]},
            )
        key = (idempotency_key or "").strip()
        if key:
            existing = CashDeposit.objects.filter(idempotency_key=key).first()
            if existing is not None:
                return existing

        locked_shift = shift or open_shift_for(agent=agent, hub=hub)
        if locked_shift is None:
            # Bay cash must not fail after a pack is already issued — opening a
            # shift here means the agent is actively collecting at this hub.
            from operations.services.shifts import ShiftService

            locked_shift = ShiftService.open_shift(
                agent=agent,
                hub=hub,
                opening_cash_kobo=0,
                actor=actor or agent,
            )
        locked_shift = (
            Shift.objects.select_for_update()
            .filter(pk=locked_shift.pk, status=Shift.Status.OPEN)
            .first()
        )
        if locked_shift is None:
            raise DomainError(
                "SHIFT_REQUIRED",
                "Shift is no longer open.",
                http=409,
            )
        if locked_shift.hub_id != hub.id or locked_shift.agent_id != agent.id:
            raise DomainError(
                "VALIDATION_ERROR",
                "Shift does not match agent and hub.",
                http=400,
            )

        assert_within_float_limit(agent=agent, amount_kobo=amount_kobo)

        try:
            with transaction.atomic():
                # Swap fees are VAT-inclusive (same split as wallet capture);
                # wallet funding carries no VAT.
                vat_kobo = (
                    split_vat_inclusive(amount_kobo)[1] if purpose_norm == "SWAP" else 0
                )
                payment = PaymentService.create_payment(
                    account=account,
                    channel=Payment.Channel.AGENT_CASH,
                    amount_kobo=amount_kobo,
                    vat_kobo=vat_kobo,
                    purpose=purpose_norm,
                    status=Payment.Status.SUCCESS,
                    hub=hub,
                )
                receipt = payment.receipt_code or generate_receipt_code()
                deposit = CashDeposit.objects.create(
                    agent=agent,
                    hub=hub,
                    account=account,
                    amount_kobo=amount_kobo,
                    psp_agent_ref=(psp_agent_ref or "").strip(),
                    payment=payment,
                    receipt_code=receipt,
                    shift=locked_shift,
                    status=CashDeposit.Status.SUCCESS,
                    purpose=purpose_norm,
                    idempotency_key=key or None,
                )
        except IntegrityError:
            if key:
                existing = CashDeposit.objects.filter(idempotency_key=key).first()
                if existing is not None:
                    return existing
            raise

        CashDepositService._post_float_ledger(
            agent=agent,
            account=account,
            amount_kobo=amount_kobo,
            purpose=purpose_norm,
            receipt=deposit.receipt_code,
        )

        notify = None
        owner = account.owner_user
        if owner is not None:
            notify = NotifySpec(
                user=owner,
                title="Cash receipt",
                body=f"{deposit.receipt_code} · {format_naira(amount_kobo)} at {hub.code}",
                source="Cash",
                severity=Notification.Severity.INFO,
                channels=(Notification.Channel.IN_APP,),
                template_code="cash.deposit_receipt",
                link_path=f"/wallet/receipt/{deposit.receipt_code}",
                params={
                    "receipt_code": deposit.receipt_code,
                    "amount_kobo": amount_kobo,
                    "hub_code": hub.code,
                    "deposit_id": str(deposit.id),
                },
                dedupe_key=f"cash.receipt:{deposit.id}",
            )
        emit_event(
            action="cash_deposit.recorded",
            subject_type="cash_deposit",
            subject_id=str(deposit.id),
            subject_label=deposit.receipt_code,
            actor=actor or agent,
            after={
                "amount_kobo": deposit.amount_kobo,
                "shift_id": str(locked_shift.id),
                "payment_id": str(payment.id),
                "status": deposit.status,
                "purpose": purpose_norm,
                "float_outstanding_kobo": agent_float_outstanding_kobo(agent=agent),
            },
            notify=notify,
        )
        from operations.services.cash.receipt_notify import enqueue_cash_receipt_email

        enqueue_cash_receipt_email(deposit_id=str(deposit.id))
        return deposit

    @staticmethod
    def _post_float_ledger(
        *,
        agent: User,
        account: Account,
        amount_kobo: int,
        purpose: str,
        receipt: str,
    ) -> None:
        float_code = f"cash_float:{agent.id}"
        if purpose == "FUND":
            WalletService.get_or_create_wallet(account)
            wallet = Wallet.objects.select_for_update().get(account=account)
            wallet.balance_kobo += amount_kobo
            wallet.save(update_fields=["balance_kobo", "updated_at"])
            credit_code = f"wallet:{account.kura_id}"
            credit_type = LedgerAccount.AccountType.LIABILITY
            kind = LedgerTransaction.Kind.FUNDING
            desc = f"Agent cash funding {receipt}"
        else:
            # Net to swap revenue, VAT to vat_payable — matches wallet capture.
            net_kobo, vat_kobo = split_vat_inclusive(amount_kobo)
            entries = [
                {
                    "code": float_code,
                    "type": LedgerAccount.AccountType.ASSET,
                    "debit": amount_kobo,
                    "credit": 0,
                },
                {
                    "code": "revenue:swap",
                    "type": LedgerAccount.AccountType.REVENUE,
                    "debit": 0,
                    "credit": net_kobo,
                },
            ]
            if vat_kobo:
                entries.append(
                    {
                        "code": "vat_payable",
                        "type": LedgerAccount.AccountType.LIABILITY,
                        "debit": 0,
                        "credit": vat_kobo,
                    }
                )
            LedgerService.post_transaction(
                kind=LedgerTransaction.Kind.AGENT_CASH,
                reference=f"CASH-{receipt}"[:100],
                description=f"Agent cash swap settle {receipt}",
                entries=entries,
            )
            return
        LedgerService.post_transaction(
            kind=kind,
            reference=f"CASH-{receipt}"[:100],
            description=desc,
            entries=[
                {
                    "code": float_code,
                    "type": LedgerAccount.AccountType.ASSET,
                    "debit": amount_kobo,
                    "credit": 0,
                },
                {
                    "code": credit_code,
                    "type": credit_type,
                    "debit": 0,
                    "credit": amount_kobo,
                },
            ],
        )

    @staticmethod
    def sum_success_kobo(*, shift: Shift) -> int:
        total = (
            CashDeposit.objects.filter(
                shift=shift, status=CashDeposit.Status.SUCCESS
            ).aggregate(s=Sum("amount_kobo"))["s"]
            or 0
        )
        return int(total)
