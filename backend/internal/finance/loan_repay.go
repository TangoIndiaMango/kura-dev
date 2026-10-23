package finance

import (
	"context"
	"fmt"
	"strings"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
)

// LoanRepayDebit is LoanRepayWalletService.debit: take the repayment from the
// wallet and split it to the loan receivable (principal) and interest
// revenue + VAT.
func LoanRepayDebit(ctx context.Context, q *db.Queries, acct Account, amount, interest, principal int64,
	key string) (db.FinancePayment, error) {
	if amount <= 0 {
		return db.FinancePayment{}, apperr.New("VALIDATION_ERROR", "amount_kobo must be positive.")
	}
	interest = max(0, interest)
	if interest+principal != amount {
		return db.FinancePayment{}, apperr.New("VALIDATION_ERROR", "interest_kobo + principal_kobo must equal amount_kobo.")
	}
	key = strings.TrimSpace(key)
	if key != "" {
		if p, err := q.PaymentByIdempotency(ctx, &key); err == nil {
			return p, nil
		} else if !database.IsNoRows(err) {
			return p, err
		}
	}
	w, err := LockedWallet(ctx, q, acct.ID)
	if err != nil {
		return db.FinancePayment{}, err
	}
	if available := w.BalanceKobo - w.HoldKobo; available < amount {
		return db.FinancePayment{}, insufficient("Insufficient available balance for loan repayment.", available, amount)
	}
	w.BalanceKobo -= amount
	if err := saveWallet(ctx, q, w); err != nil {
		return db.FinancePayment{}, err
	}
	p, err := CreatePayment(ctx, q, PaymentIn{Account: acct.ID, Channel: "WALLET_DEBIT", Amount: amount,
		Purpose: "LOAN_REPAY", Status: "SUCCESS", IdemKey: key})
	if err != nil {
		return p, err
	}
	entries := []Entry{{Code: "wallet:" + acct.KuraID, Type: Liability, Debit: amount}}
	if principal > 0 {
		entries = append(entries, Entry{Code: "asset:loan_receivable", Type: Asset, Credit: principal})
	}
	if interest > 0 {
		net, vat := SplitVAT(interest)
		entries = append(entries, Entry{Code: "revenue:loan_interest", Type: Revenue, Credit: net})
		if vat > 0 {
			entries = append(entries, Entry{Code: "vat_payable", Type: Liability, Credit: vat})
		}
	}
	_, err = Post(ctx, q, "LOAN_REPAY", "loan-repay:"+p.ID.String(),
		fmt.Sprintf("Loan repayment %d kobo (interest %d, principal %d)", amount, interest, principal), entries)
	return p, err
}
