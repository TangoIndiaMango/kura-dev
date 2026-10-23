package operations

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/support"
)

// canAccess is _assert_can_access (finance:read, shifts:manage or the owner).
func canAccess(ctx context.Context, d db.DepositRowsRow) error {
	p := reqctx.User(ctx)
	if finance.CanReadAll(p) || p.Can("shifts:manage") || d.OwnerUserID.String() == p.UserID {
		return nil
	}
	return apperr.New("FORBIDDEN", "Not allowed to access this receipt.").WithStatus(http.StatusForbidden)
}

func (h *Handler) receipt(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	d, err := h.deposit(r)
	if err == nil {
		err = canAccess(ctx, d)
	}
	var doc map[string]any
	if err == nil {
		var row db.CashDepositReceiptRow
		if row, err = h.q.CashDepositReceipt(ctx, d.ID); err == nil {
			doc, err = finance.CashReceiptDoc(ctx, h.q, h.svc.receiptKey, row)
		}
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	format := r.URL.Query().Get("as")
	if format == "" {
		format = r.URL.Query().Get("download")
	}
	if strings.ToLower(format) != "pdf" {
		respond.OK(w, doc)
		return
	}
	pdf, err := finance.RenderReceiptPDF(doc)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", `attachment; filename="`+d.ReceiptCode+`.pdf"`)
	_, _ = w.Write(pdf)
}

type flagReq struct {
	Note    string `json:"note" validate:"required,min=8,max=2000"`
	Claimed *int64 `json:"claimed_amount_kobo" validate:"omitempty,min=0"`
}

// flag opens a PAYMENT_DISPUTE case: cash handed ≠ receipt amount.
// get_object and the access check run before the serializer, like the view.
func (h *Handler) flag(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	d, err := h.deposit(r)
	if err == nil {
		err = canAccess(ctx, d)
	}
	var b flagReq
	if err == nil {
		err = decode.JSON(r, &b)
	}
	var acct db.AccountsAccount
	if err == nil {
		acct, err = h.q.AccountByID(ctx, d.AccountID)
	}
	var caseID uuid.UUID
	var code string
	if err == nil {
		body := strings.TrimSpace(b.Note)
		if b.Claimed != nil {
			body = fmt.Sprintf("Claimed cash handed: %d kobo (receipt %d kobo).\n\n%s", *b.Claimed, d.AmountKobo, body)
		}
		label := acct.DisplayName
		if label == "" {
			label = acct.KuraID
		}
		uid, _ := uuid.Parse(reqctx.User(ctx).UserID)
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			var err error
			caseID, code, err = support.OpenCase(ctx, q, support.OpenIn{Account: acct.ID, AccountLabel: label,
				Subject: "Cash amount mismatch · " + d.ReceiptCode, Kind: "PAYMENT_DISPUTE", Priority: "HIGH",
				OpenedBy: &uid, Actor: who, Body: body})
			return err
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	var claimed any
	if b.Claimed != nil {
		claimed = *b.Claimed
	}
	respond.OK(w, map[string]any{"case_id": caseID.String(), "case_code": code, "receipt_code": d.ReceiptCode,
		"receipt_amount_kobo": d.AmountKobo, "claimed_amount_kobo": claimed})
}
