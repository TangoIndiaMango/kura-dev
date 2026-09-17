"""Credit applications — apply, approve/decline, disburse swap-credit loan."""
from __future__ import annotations

from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone

from accounts.models import Account
from accounts.services.auth import assert_pin_grant
from core.exceptions import DomainError
from core.services.config import ConfigService
from core.services.events import NotifySpec, emit_event
from credit.models import CreditApplication, CreditLine, Loan
from credit.services.eligibility import EligibilityService
from notifications.models import Notification


class ApplicationService:
    @classmethod
    def apply(
        cls,
        *,
        account: Account,
        amount_kobo: int,
        tenor_days: int,
        idempotency_key: str,
        pin_grant: str,
        actor,
    ) -> dict:
        ConfigService.require_enabled("credit")
        assert_pin_grant(token=pin_grant, user_id=actor.id)
        cfg = ConfigService.get_effective("credit")
        min_a = int(cfg["min_amount_kobo"])
        max_a = int(cfg["max_amount_kobo"])
        tenors = [int(x) for x in cfg["tenor_days"]]
        if amount_kobo < min_a or amount_kobo > max_a:
            raise DomainError(
                "CREDIT_LIMIT",
                f"Amount must be between {min_a} and {max_a} kobo.",
                http=400,
            )
        if tenor_days not in tenors:
            raise DomainError(
                "VALIDATION_ERROR",
                f"tenor_days must be one of {tenors}.",
                http=400,
            )

        existing = CreditApplication.objects.filter(
            idempotency_key=idempotency_key
        ).select_related("loan").first()
        if existing:
            return cls._application_payload(existing)

        elig = EligibilityService.evaluate(account=account)
        if not elig.eligible:
            raise DomainError(
                "CREDIT_INELIGIBLE",
                "Account is not eligible for swap credit.",
                details={"blockers": elig.blockers},
                http=403,
            )
        if amount_kobo > elig.recommended_limit_kobo:
            raise DomainError(
                "CREDIT_LIMIT",
                "Amount exceeds recommended limit.",
                details={"recommended_limit_kobo": elig.recommended_limit_kobo},
                http=400,
            )

        today_count = CreditApplication.objects.filter(
            account=account,
            created_at__date=timezone.now().date(),
        ).count()
        if today_count >= 3:
            raise DomainError("THROTTLED", "Max 3 credit applications per day.", http=429)

        interest_bps = int(cfg["interest_rate_bps"])
        auto_max = int(cfg["auto_approve_max_kobo"])

        with transaction.atomic():
            line, _ = CreditLine.objects.select_for_update().get_or_create(
                account=account,
                defaults={
                    "limit_kobo": elig.recommended_limit_kobo,
                    "status": CreditLine.Status.ELIGIBLE,
                },
            )
            try:
                app = CreditApplication.objects.create(
                    account=account,
                    credit_line=line,
                    amount_kobo=amount_kobo,
                    tenor_days=tenor_days,
                    interest_rate_bps=interest_bps,
                    disbursement=CreditApplication.Disbursement.SWAP_CREDIT,
                    status=CreditApplication.Status.SUBMITTED,
                    idempotency_key=idempotency_key,
                )
            except IntegrityError:
                app = CreditApplication.objects.get(idempotency_key=idempotency_key)
                return cls._application_payload(app)

            emit_event(
                action="credit.application_submitted",
                subject_type="credit_application",
                subject_id=str(app.id),
                actor=actor,
                after={
                    "amount_kobo": amount_kobo,
                    "tenor_days": tenor_days,
                    "status": app.status,
                },
                notify=NotifySpec(
                    user=account.owner_user,
                    title="Credit application received",
                    body=f"We received your ₦{amount_kobo // 100:,} swap-credit request.",
                    severity=Notification.Severity.INFO,
                    dedupe_key=f"credit.apply:{app.id}",
                ),
            )

            if auto_max > 0 and amount_kobo <= auto_max:
                return cls._disburse(app=app, actor=None, reason="auto_approve")

        return cls._application_payload(app)

    @classmethod
    def approve(cls, *, application: CreditApplication, actor, reason: str = "") -> dict:
        ConfigService.require_enabled("credit")
        if application.status == CreditApplication.Status.DISBURSED:
            return cls._application_payload(application)
        if application.status != CreditApplication.Status.SUBMITTED:
            raise DomainError(
                "INVALID_TRANSITION",
                f"Cannot approve application in {application.status}.",
                http=409,
            )
        with transaction.atomic():
            application = CreditApplication.objects.select_for_update().get(
                pk=application.pk
            )
            if application.status == CreditApplication.Status.DISBURSED:
                return cls._application_payload(application)
            application.status = CreditApplication.Status.APPROVED
            application.decided_by = actor
            application.decision_reason = (reason or "")[:255]
            application.save(
                update_fields=["status", "decided_by", "decision_reason", "updated_at"]
            )
            return cls._disburse(app=application, actor=actor, reason=reason or "approved")

    @classmethod
    def decline(cls, *, application: CreditApplication, actor, reason: str = "") -> dict:
        if application.status == CreditApplication.Status.DECLINED:
            return cls._application_payload(application)
        if application.status != CreditApplication.Status.SUBMITTED:
            raise DomainError(
                "INVALID_TRANSITION",
                f"Cannot decline application in {application.status}.",
                http=409,
            )
        with transaction.atomic():
            application = CreditApplication.objects.select_for_update().get(
                pk=application.pk
            )
            if application.status == CreditApplication.Status.DECLINED:
                return cls._application_payload(application)
            application.status = CreditApplication.Status.DECLINED
            application.decided_by = actor
            application.decision_reason = (reason or "declined")[:255]
            application.save(
                update_fields=["status", "decided_by", "decision_reason", "updated_at"]
            )
            emit_event(
                action="credit.application_declined",
                subject_type="credit_application",
                subject_id=str(application.id),
                actor=actor,
                after={"status": application.status, "reason": application.decision_reason},
                notify=NotifySpec(
                    user=application.account.owner_user,
                    title="Credit application declined",
                    body=application.decision_reason or "Your credit request was declined.",
                    severity=Notification.Severity.WARNING,
                    dedupe_key=f"credit.decline:{application.id}",
                ),
            )
        return cls._application_payload(application)

    @classmethod
    def _disburse(cls, *, app: CreditApplication, actor, reason: str) -> dict:
        if app.disbursement != CreditApplication.Disbursement.SWAP_CREDIT:
            raise DomainError(
                "DISBURSEMENT_FORBIDDEN",
                "Only SWAP_CREDIT disbursement is allowed (D10).",
                http=400,
            )
        interest = (app.amount_kobo * app.interest_rate_bps) // 10_000
        total = app.amount_kobo + interest
        daily = max(1, total // app.tenor_days)
        now = timezone.now()
        loan = Loan.objects.create(
            application=app,
            account=app.account,
            principal_kobo=app.amount_kobo,
            interest_kobo=interest,
            total_due_kobo=total,
            repaid_kobo=0,
            daily_installment_kobo=daily,
            swap_credit_remaining_kobo=app.amount_kobo,
            starts_at=now,
            due_at=now + timedelta(days=app.tenor_days),
            status=Loan.Status.ACTIVE,
        )
        app.status = CreditApplication.Status.DISBURSED
        if actor is not None:
            app.decided_by = actor
        app.decision_reason = (reason or "")[:255]
        app.save(
            update_fields=["status", "decided_by", "decision_reason", "updated_at"]
        )
        if app.credit_line_id:
            CreditLine.objects.filter(pk=app.credit_line_id).update(
                status=CreditLine.Status.ACTIVE,
                limit_kobo=app.amount_kobo,
                updated_at=now,
            )
        emit_event(
            action="credit.loan_disbursed",
            subject_type="loan",
            subject_id=str(loan.id),
            actor=actor,
            after={
                "principal_kobo": loan.principal_kobo,
                "swap_credit_remaining_kobo": loan.swap_credit_remaining_kobo,
                "tenor_days": app.tenor_days,
            },
            notify=NotifySpec(
                user=app.account.owner_user,
                title="Swap credit approved",
                body=(
                    f"₦{app.amount_kobo // 100:,} swap credit is ready. "
                    f"Repay over {app.tenor_days} days."
                ),
                severity=Notification.Severity.INFO,
                dedupe_key=f"credit.disburse:{loan.id}",
            ),
        )
        return cls._application_payload(app)

    @staticmethod
    def _application_payload(app: CreditApplication) -> dict:
        loan = getattr(app, "loan", None)
        if loan is None:
            try:
                loan = app.loan
            except Loan.DoesNotExist:
                loan = None
        return {
            "id": str(app.id),
            "status": app.status,
            "amount_kobo": app.amount_kobo,
            "tenor_days": app.tenor_days,
            "interest_rate_bps": app.interest_rate_bps,
            "disbursement": app.disbursement,
            "decision_reason": app.decision_reason,
            "loan_id": str(loan.id) if loan else None,
            "swap_credit_remaining_kobo": (
                loan.swap_credit_remaining_kobo if loan else None
            ),
            "created_at": app.created_at.isoformat(),
        }
