package finance

import (
	"context"
	"crypto/rand"
	"math"
	"math/big"
	"strings"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
)

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

// ReceiptCode is core.ids.receipt_code (RC-XXXXXXXXXX).
func ReceiptCode() string {
	b := make([]byte, 10)
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(alphabet))))
		if err != nil {
			panic(err)
		}
		b[i] = alphabet[n.Int64()]
	}
	return "RC-" + string(b)
}

// SplitVAT is split_vat_inclusive: gross (VAT-inclusive, 7.5%) → (net, vat).
func SplitVAT(gross int64) (int64, int64) {
	if gross <= 0 {
		return 0, 0
	}
	vat := int64(math.RoundToEven(float64(gross*750) / 10750))
	return gross - vat, vat
}

// PaymentIn is PaymentService.create_payment's arguments.
type PaymentIn struct {
	Account               uuid.UUID
	Amount, VAT           int64
	Channel, Purpose      string
	Status                string
	PSPReference, IdemKey string
	Hub                   *uuid.UUID
}

func optional(s string) *string {
	if s = strings.TrimSpace(s); s == "" {
		return nil
	}
	return &s
}

// CreatePayment is PaymentService.create_payment: idempotent on the key (and
// PSP reference), retrying receipt-code clashes.
func CreatePayment(ctx context.Context, q *db.Queries, in PaymentIn) (db.FinancePayment, error) {
	key, ref := optional(in.IdemKey), optional(in.PSPReference)
	if key != nil {
		if p, err := q.PaymentByIdempotency(ctx, key); err == nil {
			return p, nil
		} else if !database.IsNoRows(err) {
			return p, err
		}
	}
	purpose, status := in.Purpose, in.Status
	if purpose == "" {
		purpose = "SWAP"
	}
	if status == "" {
		status = "SUCCESS"
	}
	for i := 0; i < 8; i++ {
		p, err := q.InsertPayment(ctx, db.InsertPaymentParams{ID: ids.New(), Channel: in.Channel,
			AmountKobo: in.Amount, VatKobo: in.VAT, ReceiptCode: ReceiptCode(), PspReference: ref, Status: status,
			Purpose: purpose, AccountID: in.Account, HubID: in.Hub, IdempotencyKey: key})
		if err == nil {
			return p, nil
		}
		if !database.IsNoRows(err) {
			return p, err
		}
		if key != nil {
			if p, err := q.PaymentByIdempotency(ctx, key); err == nil {
				return p, nil
			}
		}
		if ref != nil {
			if p, err := q.PaymentByPSPRef(ctx, ref); err == nil {
				return p, nil
			}
		}
	}
	return db.FinancePayment{}, apperr.New("INTEGRATION_ERROR", "Could not allocate a unique receipt code.")
}
