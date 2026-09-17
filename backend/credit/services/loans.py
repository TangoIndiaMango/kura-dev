"""Loan repayments — wallet debit against active swap-credit loan."""
from __future__ import annotations

from django.db import IntegrityError, transaction

from accounts.models import Account
from accounts.services.auth import assert_pin_grant
from core.exceptions import DomainError
from core.services.config import ConfigService
from core.services.events import NotifySpec, emit_event
from credit.models import Loan, LoanRepayment
from credit.services.wallet_repay import LoanRepayWalletService
from notifications.models import Notification


class LoanService:
    @classmethod
    def repay(
        cls,
        *,
        loan: Loan,
        amount_kobo: int,
        idempotency_key: str,
        pin_grant: str,
        actor,
    ) -> dict:
        ConfigService.require_enabled("credit")
        assert_pin_grant(token=pin_grant, user_id=actor.id)
        if amount_kobo <= 0:
            raise DomainError("VALIDATION_ERROR", "amount_kobo must be positive.", http=400)
        if loan.status not in {
            Loan.Status.ACTIVE,
            Loan.Status.GRACE,
            Loan.Status.RESTRICTED,
        }:
            raise DomainError(
                "INVALID_TRANSITION",
                f"Cannot repay loan in status {loan.status}.",
                http=409,
            )

        existing = LoanRepayment.objects.filter(idempotency_key=idempotency_key).first()
        if existing:
            return cls.loan_payload(existing.loan)

        remaining = max(0, loan.total_due_kobo - loan.repaid_kobo)
        pay = min(amount_kobo, remaining)
        if pay <= 0:
            raise DomainError("LOAN_PAID", "Loan is already fully repaid.", http=409)

        interest_portion = 0
        principal_portion = 0
        with transaction.atomic():
            loan = Loan.objects.select_for_update().get(pk=loan.pk)
            try:
                repayment = LoanRepayment.objects.create(
                    loan=loan,
                    amount_kobo=pay,
                    kind=LoanRepayment.Kind.MANUAL,
                    status=LoanRepayment.Status.PENDING,
                    idempotency_key=idempotency_key,
                )
            except IntegrityError:
                repayment = LoanRepayment.objects.get(idempotency_key=idempotency_key)
                return cls.loan_payload(repayment.loan)

            # Interest-first allocation under lock (PRD F11 revenue share).
            interest_already = min(int(loan.repaid_kobo), int(loan.interest_kobo))
            interest_remaining = max(0, int(loan.interest_kobo) - interest_already)
            interest_portion = min(pay, interest_remaining)
            principal_portion = pay - interest_portion

            payment = LoanRepayWalletService.debit(
                account=loan.account,
                amount_kobo=pay,
                idempotency_key=f"loan-repay-pay:{idempotency_key}",
                interest_kobo=interest_portion,
                principal_kobo=principal_portion,
            )
            repayment.payment = payment
            repayment.status = LoanRepayment.Status.SUCCESS
            repayment.save(update_fields=["payment", "status", "updated_at"])
            loan.repaid_kobo = loan.repaid_kobo + pay
            if loan.repaid_kobo >= loan.total_due_kobo:
                loan.status = Loan.Status.PAID
                loan.swap_credit_remaining_kobo = 0
            loan.save(
                update_fields=[
                    "repaid_kobo",
                    "status",
                    "swap_credit_remaining_kobo",
                    "updated_at",
                ]
            )

        emit_event(
            action="credit.loan_repaid",
            subject_type="loan",
            subject_id=str(loan.id),
            actor=actor,
            after={
                "amount_kobo": pay,
                "interest_kobo": interest_portion,
                "principal_kobo": principal_portion,
                "repaid_kobo": loan.repaid_kobo,
                "status": loan.status,
            },
            notify=NotifySpec(
                user=loan.account.owner_user,
                title="Loan repayment received",
                body=f"₦{pay // 100:,} applied to your swap-credit loan.",
                severity=Notification.Severity.INFO,
                dedupe_key=f"credit.repay:{repayment.id}",
            ),
        )
        return cls.loan_payload(loan)

    @staticmethod
    def loan_list_payload(loan: Loan) -> dict:
        remaining_due = max(0, loan.total_due_kobo - loan.repaid_kobo)
        return {
            "id": str(loan.id),
            "status": loan.status,
            "principal_kobo": loan.principal_kobo,
            "total_due_kobo": loan.total_due_kobo,
            "repaid_kobo": loan.repaid_kobo,
            "remaining_due_kobo": remaining_due,
            "daily_installment_kobo": loan.daily_installment_kobo,
            "swap_credit_remaining_kobo": loan.swap_credit_remaining_kobo,
            "starts_at": loan.starts_at.isoformat(),
            "due_at": loan.due_at.isoformat(),
            "application_id": str(loan.application_id),
            "account_id": str(loan.account_id),
        }

    @staticmethod
    def loan_payload(loan: Loan) -> dict:
        remaining_due = max(0, loan.total_due_kobo - loan.repaid_kobo)
        return {
            "id": str(loan.id),
            "status": loan.status,
            "principal_kobo": loan.principal_kobo,
            "interest_kobo": loan.interest_kobo,
            "total_due_kobo": loan.total_due_kobo,
            "repaid_kobo": loan.repaid_kobo,
            "remaining_due_kobo": remaining_due,
            "daily_installment_kobo": loan.daily_installment_kobo,
            "swap_credit_remaining_kobo": loan.swap_credit_remaining_kobo,
            "starts_at": loan.starts_at.isoformat(),
            "due_at": loan.due_at.isoformat(),
            "grace_until": loan.grace_until.isoformat() if loan.grace_until else None,
            "application_id": str(loan.application_id),
            "account_id": str(loan.account_id),
            "schedule": LoanService._build_schedule(loan),
        }

    @staticmethod
    def _build_schedule(loan: Loan) -> list[dict]:
        from datetime import timedelta

        from django.utils import timezone

        start = loan.starts_at.date() if loan.starts_at else timezone.now().date()
        tenor = max(1, int(getattr(loan.application, "tenor_days", 0) or 0))
        if tenor <= 0:
            tenor = max(1, (loan.due_at.date() - start).days)
        daily = int(loan.daily_installment_kobo)
        paid_units = int(loan.repaid_kobo) // daily if daily else 0
        today = timezone.now().date()
        rows: list[dict] = []
        for i in range(tenor):
            due_on = start + timedelta(days=i + 1)
            if i < paid_units:
                status = "PAID"
            elif due_on < today:
                status = "MISSED"
            elif due_on == today:
                status = "DUE"
            else:
                status = "SCHEDULED"
            rows.append(
                {
                    "due_on": due_on.isoformat(),
                    "amount_kobo": daily,
                    "status": status,
                }
            )
        return rows

    @classmethod
    def active_swap_credit_kobo(cls, account: Account) -> int:
        loan = (
            Loan.objects.filter(
                account=account,
                status__in=[Loan.Status.ACTIVE, Loan.Status.GRACE],
            )
            .order_by("-created_at")
            .first()
        )
        return int(loan.swap_credit_remaining_kobo) if loan else 0
