from django.db import models

from accounts.models import Account
from core.ids import receipt_code as generate_receipt_code
from core.models import BaseModel


class Wallet(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        FROZEN = "FROZEN", "Frozen"
        CLOSED = "CLOSED", "Closed"

    account = models.OneToOneField(Account, on_delete=models.CASCADE, related_name="wallet")
    balance_kobo = models.BigIntegerField(default=0)
    hold_kobo = models.BigIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    @property
    def available_kobo(self) -> int:
        return max(0, int(self.balance_kobo) - int(self.hold_kobo))

    def __str__(self):
        return f"Wallet {self.account.kura_id} ({self.status})"


class VirtualAccount(BaseModel):
    """NUBAN + bank fields are written only after PSP assign succeeds."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACTIVE = "ACTIVE", "Active"
        CLOSED = "CLOSED", "Closed"

    account = models.OneToOneField(
        Account, on_delete=models.CASCADE, related_name="virtual_account"
    )
    nuban = models.CharField(max_length=10, unique=True, null=True, blank=True, db_index=True)
    bank_name = models.CharField(max_length=100, blank=True, default="")
    account_name = models.CharField(max_length=150, blank=True, default="")
    psp_reference = models.CharField(max_length=100, blank=True, default="", db_index=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )

    def __str__(self):
        return f"VA {self.nuban or 'pending'} ({self.status})"


class LedgerAccount(BaseModel):
    class AccountType(models.TextChoices):
        ASSET = "ASSET", "Asset"
        LIABILITY = "LIABILITY", "Liability"
        REVENUE = "REVENUE", "Revenue"
        EXPENSE = "EXPENSE", "Expense"
        CLEARING = "CLEARING", "Clearing"

    code = models.CharField(max_length=100, unique=True, db_index=True)
    account_type = models.CharField(max_length=20, choices=AccountType.choices)
    balance_kobo = models.BigIntegerField(default=0)

    def __str__(self):
        return f"[{self.account_type}] {self.code}"


class LedgerTransaction(BaseModel):
    class Kind(models.TextChoices):
        FUNDING = "FUNDING", "Wallet Funding"
        HOLD = "HOLD", "Authorization Hold"
        CAPTURE = "CAPTURE", "Hold Capture"
        RELEASE = "RELEASE", "Hold Release"
        SWAP_FEE = "SWAP_FEE", "Direct Swap Fee"
        PLAN_FEE = "PLAN_FEE", "Plan Subscription Fee"
        AGENT_CASH = "AGENT_CASH", "Agent Cash Float"
        LOAN_REPAY = "LOAN_REPAY", "Loan repayment"
        REVERSAL = "REVERSAL", "Swap / fee reversal"

    kind = models.CharField(max_length=30, choices=Kind.choices)
    reference = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.CharField(max_length=255)
    posted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.kind}] {self.reference}"


class LedgerEntry(BaseModel):
    transaction = models.ForeignKey(
        LedgerTransaction, on_delete=models.CASCADE, related_name="entries"
    )
    ledger_account = models.ForeignKey(
        LedgerAccount, on_delete=models.PROTECT, related_name="entries"
    )
    debit_kobo = models.BigIntegerField(default=0)
    credit_kobo = models.BigIntegerField(default=0)

    def __str__(self):
        return f"Entry {self.ledger_account.code}"


class Payment(BaseModel):
    class Channel(models.TextChoices):
        NUBAN_TRANSFER = "NUBAN_TRANSFER", "Bank Transfer (NUBAN)"
        WALLET_DEBIT = "WALLET_DEBIT", "Wallet Balance"
        CARD = "CARD", "Debit Card"
        AGENT_CASH = "AGENT_CASH", "Cash at Hub"
        CREDIT = "CREDIT", "Swap Credit"

    class Status(models.TextChoices):
        SUCCESS = "SUCCESS", "Successful"
        PENDING = "PENDING", "Pending"
        FAILED = "FAILED", "Failed"
        REVERSED = "REVERSED", "Reversed"

    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="payments")
    channel = models.CharField(
        max_length=30, choices=Channel.choices, default=Channel.WALLET_DEBIT
    )
    amount_kobo = models.BigIntegerField()
    vat_kobo = models.BigIntegerField(default=0)
    receipt_code = models.CharField(
        max_length=30,
        unique=True,
        db_index=True,
        default=generate_receipt_code,
    )
    psp_reference = models.CharField(
        max_length=120, unique=True, null=True, blank=True, db_index=True
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUCCESS)
    purpose = models.CharField(max_length=50, default="SWAP")
    idempotency_key = models.CharField(
        max_length=64, unique=True, null=True, blank=True, db_index=True
    )

    def __str__(self):
        return f"{self.receipt_code} ({self.status})"
