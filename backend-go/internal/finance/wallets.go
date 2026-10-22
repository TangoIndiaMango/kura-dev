package finance

import (
	"context"
	"net/http"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
)

// LockedWallet is _locked_wallet: the account's wallet FOR UPDATE (created
// if missing); a non-ACTIVE wallet is WALLET_FROZEN.
func LockedWallet(ctx context.Context, q *db.Queries, account uuid.UUID) (db.FinanceWallet, error) {
	w, err := q.WalletForUpdate(ctx, account)
	if database.IsNoRows(err) {
		if err = q.EnsureWallet(ctx, db.EnsureWalletParams{ID: ids.New(), AccountID: account}); err != nil {
			return w, err
		}
		w, err = q.WalletForUpdate(ctx, account)
	}
	if err != nil {
		return w, err
	}
	if w.Status != "ACTIVE" {
		return w, apperr.Conflict("WALLET_FROZEN", "Wallet is not active.")
	}
	return w, nil
}

func saveWallet(ctx context.Context, q *db.Queries, w db.FinanceWallet) error {
	return q.SaveWalletBalances(ctx, db.SaveWalletBalancesParams{ID: w.ID, BalanceKobo: w.BalanceKobo,
		HoldKobo: w.HoldKobo})
}

func insufficient(msg string, available, need int64) error {
	return apperr.New("WALLET_INSUFFICIENT", msg).WithStatus(http.StatusConflict).
		WithDetails(apperr.Details{"available_kobo": available, "shortfall_kobo": need - available})
}

// Fund is WalletService.fund_wallet: credit the wallet, Payment(FUND) and a
// FUNDING ledger entry. A known PSP reference returns its payment unchanged.
func Fund(ctx context.Context, q *db.Queries, acct Account, amount int64, channel, pspRef string) (db.FinancePayment, error) {
	if amount <= 0 {
		return db.FinancePayment{}, apperr.New("VALIDATION_ERROR", "amount_kobo must be positive.")
	}
	if ref := optional(pspRef); ref != nil {
		if p, err := q.PaymentByPSPRef(ctx, ref); err == nil {
			return p, nil
		} else if !database.IsNoRows(err) {
			return p, err
		}
	}
	w, err := q.WalletForUpdate(ctx, acct.ID)
	if database.IsNoRows(err) { // fund_wallet doesn't check the wallet status
		if err = q.EnsureWallet(ctx, db.EnsureWalletParams{ID: ids.New(), AccountID: acct.ID}); err == nil {
			w, err = q.WalletForUpdate(ctx, acct.ID)
		}
	}
	if err != nil {
		return db.FinancePayment{}, err
	}
	w.BalanceKobo += amount
	if err := saveWallet(ctx, q, w); err != nil {
		return db.FinancePayment{}, err
	}
	if channel == "" {
		channel = "NUBAN_TRANSFER"
	}
	p, err := CreatePayment(ctx, q, PaymentIn{Account: acct.ID, Amount: amount, Channel: channel, Purpose: "FUND",
		Status: "SUCCESS", PSPReference: pspRef})
	if err != nil {
		return p, err
	}
	_, err = Post(ctx, q, "FUNDING", "FUND-"+p.ReceiptCode, "Wallet top-up via "+channel, []Entry{
		{Code: "psp_clearing", Type: Clearing, Debit: amount},
		{Code: "wallet:" + acct.KuraID, Type: Liability, Credit: amount}})
	return p, err
}

func trunc100(s string) string {
	if len(s) > 100 {
		return s[:100]
	}
	return s
}

// CreditWallet is the agent-cash FUND path: get_or_create the wallet, lock it
// and add to the balance (no status check, like the Django service).
func CreditWallet(ctx context.Context, q *db.Queries, account uuid.UUID, amount int64) error {
	w, err := q.WalletForUpdate(ctx, account)
	if database.IsNoRows(err) {
		if err = q.EnsureWallet(ctx, db.EnsureWalletParams{ID: ids.New(), AccountID: account}); err == nil {
			w, err = q.WalletForUpdate(ctx, account)
		}
	}
	if err != nil {
		return err
	}
	w.BalanceKobo += amount
	return saveWallet(ctx, q, w)
}
