// Package finance ports finance.services: the double-entry ledger, payments,
// wallets, authorization holds and plan-fee debits. Every function runs on
// the caller's transaction (pass db.New(tx)).
package finance

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
)

// Ledger account types.
const (
	Asset     = "ASSET"
	Liability = "LIABILITY"
	Revenue   = "REVENUE"
	Expense   = "EXPENSE"
	Clearing  = "CLEARING"
)

// Entry is one ledger line.
type Entry struct {
	Code, Type    string
	Debit, Credit int64
}

// Account is what money flows need about an operator account.
type Account struct {
	ID     uuid.UUID
	KuraID string
}

// Post is LedgerService.post_transaction: balanced entries, accounts created
// on first use, debit-normal balances for asset/expense/clearing.
func Post(ctx context.Context, q *db.Queries, kind, reference, description string, entries []Entry) (uuid.UUID, error) {
	var debit, credit int64
	for _, e := range entries {
		debit, credit = debit+e.Debit, credit+e.Credit
	}
	if debit != credit {
		return uuid.Nil, apperr.New("LEDGER_UNBALANCED", fmt.Sprintf("Debits (%d) != credits (%d).", debit, credit))
	}
	tx := ids.New()
	if err := q.InsertLedgerTransaction(ctx, db.InsertLedgerTransactionParams{ID: tx, Kind: kind,
		Reference: reference, Description: description}); err != nil {
		return uuid.Nil, err
	}
	for _, e := range entries {
		if err := q.EnsureLedgerAccount(ctx, db.EnsureLedgerAccountParams{ID: ids.New(), Code: e.Code,
			AccountType: e.Type}); err != nil {
			return uuid.Nil, err
		}
		acct, err := q.LedgerAccountForUpdate(ctx, e.Code)
		if err != nil {
			return uuid.Nil, err
		}
		if err := q.InsertLedgerEntry(ctx, db.InsertLedgerEntryParams{ID: ids.New(), DebitKobo: e.Debit,
			CreditKobo: e.Credit, LedgerAccountID: acct.ID, TransactionID: tx}); err != nil {
			return uuid.Nil, err
		}
		delta := e.Credit - e.Debit
		if e.Type == Asset || e.Type == Expense || e.Type == Clearing {
			delta = -delta
		}
		if err := q.SetLedgerBalance(ctx, db.SetLedgerBalanceParams{ID: acct.ID, BalanceKobo: acct.BalanceKobo + delta}); err != nil {
			return uuid.Nil, err
		}
	}
	return tx, nil
}
