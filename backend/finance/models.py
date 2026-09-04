import random
from django.db import models
from core.models import BaseModel
from accounts.models import Account

class Wallet(BaseModel):
    account = models.OneToOneField(Account, on_delete=models.CASCADE, related_name='wallet')
    balance_kobo = models.BigIntegerField(default=500000) # ₦5,000.00 default starting balance for pilot riders
    hold_kobo = models.BigIntegerField(default=0)
    status = models.CharField(max_length=20, default='ACTIVE')

    @property
    def available_kobo(self):
        return max(0, self.balance_kobo - self.hold_kobo)

    def __str__(self):
        return f"Wallet for {self.account.kura_id}: ₦{self.balance_kobo / 100:,.2f}"

class VirtualAccount(BaseModel):
    account = models.OneToOneField(Account, on_delete=models.CASCADE, related_name='virtual_account')
    nuban = models.CharField(max_length=10, unique=True, db_index=True)
    bank_name = models.CharField(max_length=100, default='Wema Bank / Paystack')
    account_name = models.CharField(max_length=150)
    status = models.CharField(max_length=20, default='ACTIVE')

    def save(self, *args, **kwargs):
        if not self.nuban:
            self.nuban = '99' + ''.join(random.choices('0123456789', k=8))
        if not self.account_name:
            self.account_name = f"KURA / {self.account.display_name}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.bank_name} - {self.nuban} ({self.account_name})"

class LedgerAccount(BaseModel):
    class AccountType(models.TextChoices):
        ASSET = 'ASSET', 'Asset'
        LIABILITY = 'LIABILITY', 'Liability'
        REVENUE = 'REVENUE', 'Revenue'
        EXPENSE = 'EXPENSE', 'Expense'
        CLEARING = 'CLEARING', 'Clearing'

    code = models.CharField(max_length=100, unique=True, db_index=True) # e.g. "wallet:KR-1234", "revenue:swap"
    account_type = models.CharField(max_length=20, choices=AccountType.choices)
    balance_kobo = models.BigIntegerField(default=0)

    def __str__(self):
        return f"[{self.account_type}] {self.code}: ₦{self.balance_kobo / 100:,.2f}"

class LedgerTransaction(BaseModel):
    class Kind(models.TextChoices):
        FUNDING = 'FUNDING', 'Wallet Funding'
        HOLD = 'HOLD', 'Authorization Hold'
        CAPTURE = 'CAPTURE', 'Hold Capture'
        RELEASE = 'RELEASE', 'Hold Release'
        SWAP_FEE = 'SWAP_FEE', 'Direct Swap Fee'
        PLAN_FEE = 'PLAN_FEE', 'Plan Subscription Fee'

    kind = models.CharField(max_length=30, choices=Kind.choices)
    reference = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.CharField(max_length=255)
    posted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.kind}] {self.reference} - {self.description}"

class LedgerEntry(BaseModel):
    transaction = models.ForeignKey(LedgerTransaction, on_delete=models.CASCADE, related_name='entries')
    ledger_account = models.ForeignKey(LedgerAccount, on_delete=models.PROTECT, related_name='entries')
    debit_kobo = models.BigIntegerField(default=0)
    credit_kobo = models.BigIntegerField(default=0)

    def __str__(self):
        return f"Entry for {self.ledger_account.code}: DR ₦{self.debit_kobo/100:,.2f} | CR ₦{self.credit_kobo/100:,.2f}"

class Payment(BaseModel):
    class Channel(models.TextChoices):
        NUBAN_TRANSFER = 'NUBAN_TRANSFER', 'Bank Transfer (NUBAN)'
        WALLET_DEBIT = 'WALLET_DEBIT', 'Wallet Balance'
        CARD = 'CARD', 'Debit Card'
        AGENT_CASH = 'AGENT_CASH', 'Cash at Hub'
        CREDIT = 'CREDIT', 'Swap Credit'

    class Status(models.TextChoices):
        SUCCESS = 'SUCCESS', 'Successful'
        PENDING = 'PENDING', 'Pending'
        FAILED = 'FAILED', 'Failed'

    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='payments')
    channel = models.CharField(max_length=30, choices=Channel.choices, default=Channel.WALLET_DEBIT)
    amount_kobo = models.BigIntegerField()
    vat_kobo = models.BigIntegerField(default=0)
    receipt_code = models.CharField(max_length=30, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUCCESS)
    purpose = models.CharField(max_length=50, default='SWAP') # SWAP, PLAN, FUND

    def save(self, *args, **kwargs):
        if not self.receipt_code:
            rand_code = ''.join(random.choices('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', k=8))
            self.receipt_code = f"RC-{rand_code}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Receipt {self.receipt_code} - ₦{self.amount_kobo / 100:,.2f} ({self.status})"
