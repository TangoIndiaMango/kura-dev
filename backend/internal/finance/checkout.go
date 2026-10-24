package finance

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/integrations/psp"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
)

// Checkout limits for one wallet top-up (kobo).
const (
	MinCheckoutKobo = 10_000     // ₦100
	MaxCheckoutKobo = 50_000_000 // ₦500,000
)

// CheckoutConfig is what Paystack Checkout top-ups need.
type CheckoutConfig struct {
	PSP         psp.Settings
	ClientURL   string // rider app origin, for the redirect fallback's return page
	EmailDomain string // placeholder customer email for riders without one
}

func newReference() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return "KURA-TOPUP-" + strings.ToUpper(hex.EncodeToString(b))
}

// channelOf maps Paystack's channel to our payment channels.
func channelOf(c string) string {
	if c == "card" {
		return "CARD"
	}
	return "NUBAN_TRANSFER" // bank transfer, bank, USSD, QR…
}

// SettleCheckout credits a verified Paystack Checkout payment exactly once
// (locks the checkout; Fund is idempotent on the reference too). A failed
// verify marks it FAILED; anything not final leaves it PENDING. Shared by the
// webhook and the app's verify call, whichever arrives first.
func SettleCheckout(ctx context.Context, q *db.Queries, reference string, v psp.VerifyResult,
	who *events.Actor) (db.FinanceWalletcheckout, error) {
	c, err := q.CheckoutForUpdate(ctx, reference)
	if err != nil {
		return c, err
	}
	if c.Status == "SUCCESS" {
		return c, nil
	}
	if !v.OK {
		if v.Status == "failed" || v.Status == "reversed" {
			c.Status, c.FailureReason = "FAILED", "Paystack: "+v.Status
			err = q.SettleCheckout(ctx, db.SettleCheckoutParams{ID: c.ID, Status: c.Status,
				FailureReason: c.FailureReason})
		}
		return c, err
	}
	if v.Currency != "" && v.Currency != "NGN" {
		return c, apperr.New("CHECKOUT_CURRENCY", "Only NGN payments can fund the wallet.")
	}
	amount := c.AmountKobo
	if v.AmountKobo != nil {
		amount = *v.AmountKobo // what Paystack actually collected
	}
	acct, err := q.AccountByID(ctx, c.AccountID)
	if err != nil {
		return c, err
	}
	channel := channelOf(v.Channel)
	// Every Paystack payment lands in the rider's balance. The first payment
	// for a still-open swap is credited quietly and becomes the swap's own
	// payment at Complete; anything else (a top-up, a second payment, a swap
	// already finished or aborted) is a visible "Payment received" — so money
	// is never lost and the rider never sees one card payment twice.
	acctRef := Account{ID: acct.ID, KuraID: acct.KuraID}
	forOpenSwap := false
	if c.SwapID != nil {
		if forOpenSwap, err = swapAwaitsPayment(ctx, q, *c.SwapID, c.ID); err != nil {
			return c, err
		}
	}
	var p db.FinancePayment
	var paymentID *uuid.UUID
	if forOpenSwap {
		err = creditForSwap(ctx, q, acctRef, amount, channel, reference)
	} else {
		p, err = Fund(ctx, q, acctRef, amount, channel, reference)
		paymentID = &p.ID
	}
	if err != nil {
		return c, err
	}
	c.Status, c.PaymentID, c.Channel = "SUCCESS", paymentID, channel
	if err := q.SettleCheckout(ctx, db.SettleCheckoutParams{ID: c.ID, Status: "SUCCESS", PaymentID: paymentID,
		Channel: channel}); err != nil {
		return c, err
	}
	after := events.Map{"amount_kobo": amount, "psp_reference": reference, "provider": "PAYSTACK", "channel": channel}
	if paymentID != nil {
		after["payment_id"] = paymentID.String()
	}
	if c.SwapID != nil {
		title, body := "Swap paid", FormatNaira(amount)+" received — the hub can now complete your swap."
		if !forOpenSwap {
			title, body = "Payment added to your balance", FormatNaira(amount)+
				" was added to your Kura balance — it pays for your next swap."
		}
		return c, events.Emit(ctx, q, events.Event{Action: "swap.paid", SubjectType: "swap",
			SubjectID: c.SwapID.String(), SubjectLabel: reference, Actor: who, After: after,
			Notify: []events.NotifySpec{{UserID: acct.OwnerUserID, Title: title, Body: body, Source: "Swaps",
				Severity: events.Info, LinkPath: "/swap", TemplateCode: "swap.paid",
				DedupeKey: "swap.paid:" + reference}}})
	}
	return c, events.Emit(ctx, q, events.Event{Action: "wallet.funded", SubjectType: "wallet",
		SubjectID: acct.ID.String(), SubjectLabel: acct.KuraID, Actor: who, After: after,
		Metadata: events.Map{"receipt_code": p.ReceiptCode},
		Notify: []events.NotifySpec{{UserID: acct.OwnerUserID, Title: "Payment received",
			Body: FormatNaira(amount) + " was added to your Kura balance.", Source: "Wallet", Severity: events.Info,
			LinkPath: "/wallet", TemplateCode: "wallet.funded", DedupeKey: "wallet.funded:" + reference}}})
}

// swapAwaitsPayment: the swap is still open and this is its first paid checkout.
func swapAwaitsPayment(ctx context.Context, q *db.Queries, swap, checkout uuid.UUID) (bool, error) {
	rows, err := q.SwapRows(ctx, []uuid.UUID{swap})
	if err != nil || len(rows) == 0 {
		return false, err
	}
	switch rows[0].Status {
	case "STARTED", "RETURN_RECORDED", "ISSUED":
	default:
		return false, nil
	}
	first, err := q.PaidSwapCheckout(ctx, &swap)
	if database.IsNoRows(err) {
		return true, nil
	}
	return err == nil && first.ID == checkout, err
}

// CheckoutIn is one Paystack Checkout to open.
type CheckoutIn struct {
	Account db.AccountsAccount
	Amount  int64
	Purpose string     // WALLET_TOPUP | SWAP
	Swap    *uuid.UUID // set for SWAP
	Return  string     // path the hosted page returns to (redirect fallback)
}

// StartCheckout initializes a Paystack transaction and records it.
func StartCheckout(ctx context.Context, q *db.Queries, cfg CheckoutConfig, in CheckoutIn) (db.FinanceWalletcheckout, error) {
	owner, err := q.GetUserRow(ctx, in.Account.OwnerUserID)
	if err != nil {
		return db.FinanceWalletcheckout{}, err
	}
	email := ""
	if owner.Email != nil {
		email = strings.TrimSpace(*owner.Email)
	}
	if email == "" {
		email = strings.ToLower(in.Account.KuraID) + "@" + cfg.EmailDomain
	}
	client, err := psp.Get("PAYSTACK", cfg.PSP)
	if err != nil {
		return db.FinanceWalletcheckout{}, err
	}
	ref := newReference()
	if in.Purpose == "SWAP" {
		ref = strings.Replace(ref, "TOPUP", "SWAP", 1)
	}
	callback := ""
	if base := strings.TrimRight(cfg.ClientURL, "/"); base != "" && in.Return != "" {
		callback = base + in.Return
	}
	meta := map[string]any{"account_id": in.Account.ID.String(), "purpose": strings.ToLower(in.Purpose)}
	if in.Swap != nil {
		meta["swap_id"] = in.Swap.String()
	}
	res, err := client.InitializeCheckout(ctx, psp.CheckoutRequest{Email: email, AmountKobo: in.Amount, Reference: ref,
		CallbackURL: callback, Metadata: meta})
	if err != nil {
		var pe *psp.Error
		if errors.As(err, &pe) {
			return db.FinanceWalletcheckout{}, apperr.New("INTEGRATION_ERROR", pe.Message).WithStatus(http.StatusBadGateway)
		}
		return db.FinanceWalletcheckout{}, err
	}
	uid := owner.ID
	return q.InsertCheckout(ctx, db.InsertCheckoutParams{ID: ids.New(), Reference: ref, AmountKobo: in.Amount,
		AccessCode: res.AccessCode, AuthorizationUrl: res.AuthorizationURL, AccountID: in.Account.ID, UserID: &uid,
		Purpose: in.Purpose, SwapID: in.Swap})
}

// VerifyAndSettle asks Paystack for a checkout's result and settles it. A
// verify that can't reach Paystack leaves it PENDING (the webhook settles it).
func VerifyAndSettle(ctx context.Context, pool *pgxpool.Pool, cfg CheckoutConfig, c db.FinanceWalletcheckout) (db.FinanceWalletcheckout, error) {
	if c.Status != "PENDING" {
		return c, nil
	}
	client, err := psp.Get("PAYSTACK", cfg.PSP)
	if err != nil {
		return c, err
	}
	v, err := client.VerifyTransaction(ctx, c.Reference)
	if err != nil {
		slog.WarnContext(ctx, "checkout_verify_failed", "reference", c.Reference, "err", err)
		return c, nil
	}
	err = database.InTx(ctx, pool, func(tx pgx.Tx) error {
		var err error
		c, err = SettleCheckout(ctx, db.New(tx), c.Reference, v, nil)
		return err
	})
	return c, err
}

// startCheckout opens a wallet top-up for the caller.
func (h *Handler) startCheckout(ctx context.Context, amount int64) (db.FinanceWalletcheckout, error) {
	if amount < MinCheckoutKobo || amount > MaxCheckoutKobo {
		return db.FinanceWalletcheckout{}, apperr.Field("amount_kobo", fmt.Sprintf("Top up between %s and %s.",
			FormatNaira(MinCheckoutKobo), FormatNaira(MaxCheckoutKobo)))
	}
	acct, err := h.ownAccount(ctx)
	if err != nil {
		return db.FinanceWalletcheckout{}, err
	}
	return StartCheckout(ctx, h.q, h.checkout, CheckoutIn{Account: acct, Amount: amount, Purpose: "WALLET_TOPUP",
		Return: "/?" + url.Values{"topup": {"1"}}.Encode()})
}

// verifyCheckout verifies the caller's own checkout.
func (h *Handler) verifyCheckout(ctx context.Context, reference string) (db.FinanceWalletcheckout, error) {
	acct, err := h.ownAccount(ctx)
	if err != nil {
		return db.FinanceWalletcheckout{}, err
	}
	c, err := h.q.CheckoutByReference(ctx, reference)
	if database.IsNoRows(err) || (err == nil && c.AccountID != acct.ID) {
		return c, apperr.NotFound("Payment not found.")
	}
	if err != nil {
		return c, err
	}
	return VerifyAndSettle(ctx, h.pool, h.checkout, c)
}
