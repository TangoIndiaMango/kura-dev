from django.contrib import admin
from .models import Wallet, VirtualAccount, LedgerAccount, LedgerTransaction, LedgerEntry, Payment

@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ['account', 'balance_kobo', 'hold_kobo', 'status']

@admin.register(VirtualAccount)
class VirtualAccountAdmin(admin.ModelAdmin):
    list_display = ['account', 'nuban', 'bank_name', 'status']

@admin.register(LedgerAccount)
class LedgerAccountAdmin(admin.ModelAdmin):
    list_display = ['code', 'account_type', 'balance_kobo']
    list_filter = ['account_type']

@admin.register(LedgerTransaction)
class LedgerTransactionAdmin(admin.ModelAdmin):
    list_display = ['reference', 'kind', 'description', 'posted_at']
    list_filter = ['kind']

@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    list_display = ['transaction', 'ledger_account', 'debit_kobo', 'credit_kobo']

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['receipt_code', 'account', 'channel', 'amount_kobo', 'status', 'created_at']
    list_filter = ['channel', 'status', 'purpose']
