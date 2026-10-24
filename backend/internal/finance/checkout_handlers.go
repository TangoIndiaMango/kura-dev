package finance

import (
	"net/http"
	"strings"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
)

// CheckoutBody is the JSON shape of a checkout.
func CheckoutBody(c db.FinanceWalletcheckout) map[string]any {
	return map[string]any{"reference": c.Reference, "amount_kobo": c.AmountKobo, "status": c.Status,
		"access_code": c.AccessCode, "authorization_url": c.AuthorizationUrl}
}

// checkoutStart is POST /finance/wallets/checkout/ {amount_kobo}: returns the
// access_code for Paystack's InlineJS popup (resumeTransaction) and the
// authorization_url for the redirect fallback.
func (h *Handler) checkoutStart(w http.ResponseWriter, r *http.Request) {
	var b struct {
		Amount *int64 `json:"amount_kobo" validate:"required"`
	}
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	c, err := h.startCheckout(r.Context(), *b.Amount)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, http.StatusCreated, CheckoutBody(c))
}

// checkoutVerify is POST /finance/wallets/checkout/verify/ {reference}: called
// when the popup reports success or the redirect returns. The server asks
// Paystack; the browser's word is never trusted. Returns the checkout and the
// wallet balance.
func (h *Handler) checkoutVerify(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b struct {
		Reference string `json:"reference" validate:"required,max=64"`
	}
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	c, err := h.verifyCheckout(ctx, strings.TrimSpace(b.Reference))
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	body := CheckoutBody(c)
	delete(body, "access_code")
	if wl, err := h.q.WalletByAccount(ctx, c.AccountID); err == nil {
		body["balance_kobo"] = wl.BalanceKobo
	} else {
		respond.Error(w, r, apperr.NotFound("Wallet not found."))
		return
	}
	respond.OK(w, body)
}
