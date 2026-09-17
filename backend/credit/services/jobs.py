"""Credit batch jobs — score recompute + daily auto-debit + defaulting."""
from __future__ import annotations

import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from accounts.models import Account
from core.exceptions import DomainError
from core.services.config import ConfigService
from core.services.events import NotifySpec, emit_event
from credit.models import CreditLine, Loan, LoanRepayment
from credit.services.scores import ScoreService
from credit.services.wallet_repay import LoanRepayWalletService
from notifications.models import Notification

logger = logging.getLogger("kura.credit.jobs")

_RISK_RANK = {
    Account.RiskStatus.NORMAL: 0,
    Account.RiskStatus.WATCH: 1,
    Account.RiskStatus.RESTRICTED: 2,
    Account.RiskStatus.FROZEN: 3,
}


def recompute_scores(*, limit: int = 200) -> dict:
    if not ConfigService.is_enabled("credit"):
        return {"skipped": True, "reason": "CREDIT_DISABLED", "recomputed": 0}

    qs = Account.objects.filter(status=Account.Status.ACTIVE).order_by("created_at")[
        :limit
    ]
    n = 0
    for account in qs:
        ScoreService.recompute(account=account, actor=None)
        n += 1
    return {"recomputed": n}


def auto_debit_loans(*, limit: int = 200) -> dict:
    """
    Daily installment attempt.
    Miss path: ACTIVE → GRACE → RESTRICTED → DEFAULTED (config days).
    """
    if not ConfigService.is_enabled("credit"):
        return {"skipped": True, "reason": "CREDIT_DISABLED", "debited": 0, "missed": 0}

    now = timezone.now()
    today = now.date()
    loans = (
        Loan.objects.select_related("account", "account__owner_user")
        .filter(status__in=[Loan.Status.ACTIVE, Loan.Status.GRACE, Loan.Status.RESTRICTED])
        .order_by("due_at")[:limit]
    )
    debited = 0
    missed = 0
    paid_off = 0

    for loan in loans:
        if loan.status == Loan.Status.PAID:
            continue
        remaining = max(0, loan.total_due_kobo - loan.repaid_kobo)
        if remaining <= 0:
            continue
        already = LoanRepayment.objects.filter(
            loan=loan,
            kind=LoanRepayment.Kind.AUTO_DEBIT,
            status=LoanRepayment.Status.SUCCESS,
            created_at__date=today,
        ).exists()
        if already:
            continue

        amount = min(int(loan.daily_installment_kobo), remaining)
        idem = f"auto-debit:{loan.id}:{today.isoformat()}"
        try:
            with transaction.atomic():
                locked = Loan.objects.select_for_update().get(pk=loan.pk)
                payment = LoanRepayWalletService.debit(
                    account=locked.account,
                    amount_kobo=amount,
                    idempotency_key=idem[:64],
                )
                LoanRepayment.objects.create(
                    loan=locked,
                    amount_kobo=amount,
                    payment=payment,
                    kind=LoanRepayment.Kind.AUTO_DEBIT,
                    status=LoanRepayment.Status.SUCCESS,
                    idempotency_key=f"repay:{idem}"[:64],
                )
                locked.repaid_kobo = locked.repaid_kobo + amount
                if locked.repaid_kobo >= locked.total_due_kobo:
                    locked.status = Loan.Status.PAID
                    locked.swap_credit_remaining_kobo = 0
                    paid_off += 1
                elif locked.status == Loan.Status.GRACE:
                    locked.status = Loan.Status.ACTIVE
                    locked.grace_until = None
                locked.save(
                    update_fields=[
                        "repaid_kobo",
                        "status",
                        "swap_credit_remaining_kobo",
                        "grace_until",
                        "updated_at",
                    ]
                )
            debited += 1
            emit_event(
                action="credit.auto_debit_ok",
                subject_type="loan",
                subject_id=str(loan.id),
                after={"amount_kobo": amount},
            )
        except DomainError:
            missed += 1
            _mark_miss(loan=loan, now=now)
        except Exception:
            logger.exception("auto_debit_failed loan=%s", loan.id)
            missed += 1
            _mark_miss(loan=loan, now=now)

    return {"debited": debited, "missed": missed, "paid_off": paid_off}


def _raise_risk(*, account: Account, target: str) -> None:
    current = account.risk_status or Account.RiskStatus.NORMAL
    if _RISK_RANK.get(target, 0) <= _RISK_RANK.get(current, 0):
        return
    account.risk_status = target
    account.save(update_fields=["risk_status", "updated_at"])


def _mark_miss(*, loan: Loan, now) -> None:
    cfg = ConfigService.get_effective("credit")
    grace_days = max(1, int(cfg.get("grace_days") or 3))
    default_after = max(1, int(cfg.get("default_after_restricted_days") or 7))

    with transaction.atomic():
        locked = (
            Loan.objects.select_for_update()
            .select_related("account", "account__owner_user")
            .get(pk=loan.pk)
        )
        before = locked.status
        account = locked.account

        if locked.status == Loan.Status.ACTIVE:
            locked.status = Loan.Status.GRACE
            locked.grace_until = now + timedelta(days=grace_days)
            locked.save(update_fields=["status", "grace_until", "updated_at"])
        elif locked.status == Loan.Status.GRACE:
            if locked.grace_until and now >= locked.grace_until:
                locked.status = Loan.Status.RESTRICTED
                locked.swap_credit_remaining_kobo = 0
                locked.save(
                    update_fields=[
                        "status",
                        "swap_credit_remaining_kobo",
                        "updated_at",
                    ]
                )
                CreditLine.objects.filter(account_id=locked.account_id).update(
                    status=CreditLine.Status.RESTRICTED,
                    updated_at=now,
                )
                _raise_risk(account=account, target=Account.RiskStatus.WATCH)
        elif locked.status == Loan.Status.RESTRICTED:
            restricted_since = locked.grace_until or locked.updated_at
            if restricted_since and now >= restricted_since + timedelta(days=default_after):
                locked.status = Loan.Status.DEFAULTED
                locked.swap_credit_remaining_kobo = 0
                locked.save(
                    update_fields=[
                        "status",
                        "swap_credit_remaining_kobo",
                        "updated_at",
                    ]
                )
                CreditLine.objects.filter(account_id=locked.account_id).update(
                    status=CreditLine.Status.CLOSED,
                    updated_at=now,
                )
                _raise_risk(account=account, target=Account.RiskStatus.RESTRICTED)

        emit_event(
            action="credit.auto_debit_miss",
            subject_type="loan",
            subject_id=str(locked.id),
            before={"status": before},
            after={
                "status": locked.status,
                "risk_status": account.risk_status,
            },
            notify=NotifySpec(
                user=locked.account.owner_user,
                title="Credit repayment missed",
                body="Fund your wallet — auto-debit could not collect today's installment.",
                severity=Notification.Severity.WARNING,
                dedupe_key=f"credit.miss:{locked.id}:{now.date().isoformat()}",
            ),
        )
