package finance

import (
	"context"
	"strings"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

// RenderReceiptPDF is render_receipt_pdf.
func RenderReceiptPDF(doc map[string]any) ([]byte, error) { return renderReceiptPDF(doc) }

// CashReceiptDoc is build_cash_receipt_document for an agent cash deposit.
func CashReceiptDoc(ctx context.Context, q *db.Queries, key []byte, d db.CashDepositReceiptRow) (map[string]any, error) {
	purpose := strings.ToUpper(firstOf(d.Purpose, "SWAP"))
	purposeLabel := "Battery swap · cash at hub"
	if purpose == "FUND" {
		purposeLabel = "Wallet top-up · cash at hub"
	}
	operator, operatorID := "—", any(nil)
	if d.OwnerID != nil {
		operator = personLabel(deref(d.OwnerFirst), deref(d.OwnerLast), d.OwnerEmail, d.OwnerPhone, d.OwnerID.String())
		operatorID = d.OwnerID.String()
	}
	var payment any
	if d.PaymentID != nil {
		payment = d.PaymentID.String()
	}
	doc := map[string]any{"schema": "kura.receipt.v1", "kind": "AGENT_CASH", "receipt_code": d.ReceiptCode,
		"deposit_id": d.ID.String(), "payment_id": payment, "account_id": d.AccountID.String(),
		"account_kura_id": d.AccountKuraID, "amount_kobo": d.AmountKobo, "amount_label": FormatNaira(d.AmountKobo),
		"purpose": purpose, "purpose_label": purposeLabel, "hub_code": d.HubCode, "hub_name": d.HubName,
		"operator_name": operator, "operator_user_id": operatorID,
		"agent_name":   personLabel(d.AgentFirst, d.AgentLast, d.AgentEmail, d.AgentPhone, d.AgentID.String()),
		"agent_id":     d.AgentID.String(), "shift_id": d.ShiftID.String(), "status": d.Status,
		"psp_agent_ref": d.PspAgentRef, "issued_at": jsontime.FormatISO(d.CreatedAt),
		"issued_at_label": d.CreatedAt.In(lagos).Format("02 Jan 2006, 15:04 WAT")}
	if purpose == "SWAP" && d.PaymentID != nil {
		s, err := q.ReceiptSwap(ctx, d.PaymentID)
		if err == nil {
			attachSwap(doc, s)
		} else if !database.IsNoRows(err) {
			return nil, err
		}
	}
	seal := Seal(key, doc)
	doc["integrity_hash"], doc["signature"] = seal, seal
	return doc, nil
}
