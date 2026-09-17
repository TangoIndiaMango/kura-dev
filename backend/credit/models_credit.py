from django.conf import settings
from django.db import models

from accounts.models import Account
from core.models import BaseModel


class CreditScore(BaseModel):
    class ComputedBy(models.TextChoices):
        SYSTEM = "SYSTEM", "System"
        MANUAL = "MANUAL", "Manual"

    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="credit_scores")
    score = models.PositiveSmallIntegerField(default=0)
    factors = models.JSONField(default=dict, blank=True)
    recommended_limit_kobo = models.BigIntegerField(default=0)
    version = models.CharField(max_length=40, default="v1")
    computed_by = models.CharField(
        max_length=20, choices=ComputedBy.choices, default=ComputedBy.SYSTEM
    )
    override_reason = models.CharField(max_length=255, blank=True, default="")
    override_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="credit_score_overrides",
    )
    computed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-computed_at"]
        indexes = [models.Index(fields=["account", "-computed_at"])]


class CreditLine(BaseModel):
    class Status(models.TextChoices):
        ELIGIBLE = "ELIGIBLE", "Eligible"
        ACTIVE = "ACTIVE", "Active"
        RESTRICTED = "RESTRICTED", "Restricted"
        CLOSED = "CLOSED", "Closed"

    account = models.OneToOneField(Account, on_delete=models.CASCADE, related_name="credit_line")
    score = models.ForeignKey(
        CreditScore,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lines",
    )
    limit_kobo = models.BigIntegerField(default=0)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ELIGIBLE, db_index=True
    )


class CreditApplication(BaseModel):
    class Disbursement(models.TextChoices):
        SWAP_CREDIT = "SWAP_CREDIT", "Swap credit"

    class Status(models.TextChoices):
        SUBMITTED = "SUBMITTED", "Submitted"
        APPROVED = "APPROVED", "Approved"
        DECLINED = "DECLINED", "Declined"
        DISBURSED = "DISBURSED", "Disbursed"
        CANCELLED = "CANCELLED", "Cancelled"

    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name="credit_applications"
    )
    credit_line = models.ForeignKey(
        CreditLine,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="applications",
    )
    amount_kobo = models.BigIntegerField()
    tenor_days = models.PositiveSmallIntegerField()
    interest_rate_bps = models.PositiveIntegerField(default=500)
    disbursement = models.CharField(
        max_length=20,
        choices=Disbursement.choices,
        default=Disbursement.SWAP_CREDIT,
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SUBMITTED, db_index=True
    )
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="credit_decisions",
    )
    decision_reason = models.CharField(max_length=255, blank=True, default="")
    idempotency_key = models.CharField(max_length=64, unique=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["account", "status"])]


class Loan(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        GRACE = "GRACE", "Grace"
        RESTRICTED = "RESTRICTED", "Restricted"
        DEFAULTED = "DEFAULTED", "Defaulted"
        PAID = "PAID", "Paid"
        WRITTEN_OFF = "WRITTEN_OFF", "Written off"

    application = models.OneToOneField(
        CreditApplication, on_delete=models.PROTECT, related_name="loan"
    )
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="loans")
    principal_kobo = models.BigIntegerField()
    interest_kobo = models.BigIntegerField(default=0)
    total_due_kobo = models.BigIntegerField()
    repaid_kobo = models.BigIntegerField(default=0)
    daily_installment_kobo = models.BigIntegerField()
    swap_credit_remaining_kobo = models.BigIntegerField()
    starts_at = models.DateTimeField()
    due_at = models.DateTimeField()
    grace_until = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["account", "status"])]


class LoanRepayment(BaseModel):
    class Kind(models.TextChoices):
        AUTO_DEBIT = "AUTO_DEBIT", "Auto debit"
        MANUAL = "MANUAL", "Manual"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"

    loan = models.ForeignKey(Loan, on_delete=models.CASCADE, related_name="repayments")
    amount_kobo = models.BigIntegerField()
    payment = models.ForeignKey(
        "finance.Payment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="loan_repayments",
    )
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.MANUAL)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    idempotency_key = models.CharField(max_length=64, unique=True)

    class Meta:
        ordering = ["-created_at"]
