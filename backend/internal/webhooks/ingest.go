package webhooks

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/integrations/psp"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/integrations/va"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
)

// Handler serves /api/v1/webhooks/*.
type Handler struct {
	pool         *pgxpool.Pool
	q            *db.Queries
	settings     psp.Settings
	nombaWebhook string
	log          *slog.Logger
}

func truncate(s string, n int) string {
	if r := []rune(s); len(r) > n {
		return string(r[:n])
	}
	return s
}

func (h *Handler) emit(ctx context.Context, ev events.Event) error {
	return events.EmitTx(ctx, h.pool, ev)
}

// ingest is ingest_webhook: verify, normalise, store once per
// (psp, event id), audit, then process.
func (h *Handler) ingest(ctx context.Context, provider string, hdr map[string][]string, body []byte) (db.IntegrationsPspwebhookevent, bool, error) {
	ok := false
	if provider == "PAYSTACK" {
		ok = verifyPaystack(hdr, body, h.settings.PaystackSecret)
	} else {
		ok = verifyNomba(hdr, body, h.nombaWebhook)
	}
	if !ok {
		h.log.Warn("psp_webhook_rejected", "psp", provider)
		return db.IntegrationsPspwebhookevent{}, false, apperr.New("AUTH_INVALID", "Invalid PSP webhook signature.").
			WithStatus(http.StatusUnauthorized)
	}
	payload, okJSON := parse(body)
	if !okJSON {
		return db.IntegrationsPspwebhookevent{}, false, errors.New("webhook body is not a JSON object")
	}
	ev := normalizeNomba(payload)
	if provider == "PAYSTACK" {
		ev = normalizePaystack(payload)
	}
	raw, _ := json.Marshal(ev.Raw)
	id := ids.New()
	eid := truncate(ev.EventID, 120)
	err := h.q.InsertPspEvent(ctx, db.InsertPspEventParams{ID: id, Psp: ev.Provider, PspEventID: eid,
		EventKind: ev.Kind, Payload: raw})
	if _, dup := database.IsUniqueViolation(err); dup {
		row, err := h.q.PspEventByKey(ctx, db.PspEventByKeyParams{Psp: ev.Provider, PspEventID: eid})
		h.log.Info("psp_webhook_duplicate", "psp", provider, "psp_event_id", eid)
		return row, false, err
	}
	if err != nil {
		return db.IntegrationsPspwebhookevent{}, false, err
	}
	label := ev.Provider + ":" + eid
	if err := h.emit(ctx, events.Event{Action: "psp.webhook.received", SubjectType: "psp_webhook_event",
		SubjectID: id.String(), SubjectLabel: label,
		After:    events.Map{"psp": ev.Provider, "kind": ev.Kind, "status": "RECEIVED"},
		Metadata: events.Map{"psp_reference": ev.Reference}}); err != nil {
		return db.IntegrationsPspwebhookevent{}, false, err
	}
	perr := h.process(ctx, id, ev, label)
	row, err := h.q.PspEventByID(ctx, id)
	if perr != nil {
		return row, true, perr
	}
	// Django answers with the object it created (status still RECEIVED);
	// processing saved a separate copy.
	row.Status = "RECEIVED"
	return row, true, err
}

// process is process_psp_event: apply funding / VA assignment, else IGNORED;
// failures are recorded (FAILED + audit) and re-raised.
func (h *Handler) process(ctx context.Context, id uuid.UUID, ev Event, label string) error {
	var err error
	switch ev.Kind {
	case FundingSuccess:
		err = h.applyFunding(ctx, ev)
	case VAAssigned:
		err = h.applyVA(ctx, ev)
	default:
		h.log.Info("psp_webhook_ignored", "id", id, "kind", ev.Kind)
		return h.q.SetPspEventStatus(ctx, db.SetPspEventStatusParams{ID: id, Status: "IGNORED"})
	}
	if err != nil {
		msg := err.Error()
		if e, ok := apperr.As(err); ok {
			msg = e.Message
		}
		msg = truncate(msg, 255)
		_ = h.q.SetPspEventStatus(ctx, db.SetPspEventStatusParams{ID: id, Status: "FAILED", Error: msg})
		_ = h.emit(ctx, events.Event{Action: "psp.webhook.failed", SubjectType: "psp_webhook_event",
			SubjectID: id.String(), SubjectLabel: label, After: events.Map{"status": "FAILED", "error": msg}})
		h.log.Error("psp_event_failed", "event_id", id, "err", err)
		return err
	}
	if err := h.q.SetPspEventStatus(ctx, db.SetPspEventStatusParams{ID: id, Status: "PROCESSED"}); err != nil {
		return err
	}
	return h.emit(ctx, events.Event{Action: "psp.webhook.processed", SubjectType: "psp_webhook_event",
		SubjectID: id.String(), SubjectLabel: label, After: events.Map{"status": "PROCESSED", "kind": ev.Kind},
		Metadata: events.Map{"psp_reference": ev.Reference}})
}

// resolveAccount is _resolve_account: NUBAN, PSP reference, then the hint
// (an account id or a VA reference).
func (h *Handler) resolveAccount(ctx context.Context, ev Event) (*db.AccountsAccount, error) {
	try := func(id uuid.UUID, err error) (*db.AccountsAccount, error) {
		if database.IsNoRows(err) {
			return nil, nil
		}
		if err != nil {
			return nil, err
		}
		a, err := h.q.AccountByID(ctx, id)
		return &a, err
	}
	if ev.NUBAN != "" {
		if a, err := try(h.q.VAAccountByNuban(ctx, &ev.NUBAN)); a != nil || err != nil {
			return a, err
		}
	}
	if ev.Reference != "" {
		if a, err := try(h.q.VAAccountByReference(ctx, ev.Reference)); a != nil || err != nil {
			return a, err
		}
	}
	if ev.AccountHint != "" {
		if id, err := uuid.Parse(ev.AccountHint); err == nil {
			if a, err := h.q.AccountByID(ctx, id); err == nil {
				return &a, nil
			}
		}
		return try(h.q.VAAccountByReference(ctx, ev.AccountHint))
	}
	return nil, nil
}

func (h *Handler) applyFunding(ctx context.Context, ev Event) error {
	if ev.Reference == "" {
		return apperr.New("VALIDATION_ERROR", "Missing PSP reference on funding event.")
	}
	client, err := psp.Get(ev.Provider, h.settings)
	if err != nil {
		return err
	}
	verified, err := client.VerifyTransaction(ctx, ev.Reference)
	if err != nil {
		var pe *psp.Error
		if errors.As(err, &pe) {
			return apperr.New("INTEGRATION_ERROR", pe.Message)
		}
		return err
	}
	if !verified.OK {
		return apperr.New("INTEGRATION_ERROR", "PSP verify rejected funding event.")
	}
	// A wallet top-up started in the app (Paystack Checkout): settle that
	// checkout — same path as the app's verify call, credited once.
	if _, err := h.q.CheckoutByReference(ctx, ev.Reference); err == nil {
		return database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
			_, err := finance.SettleCheckout(ctx, db.New(tx), ev.Reference, verified, nil)
			return err
		})
	} else if !database.IsNoRows(err) {
		return err
	}
	amount := ev.AmountKobo
	if verified.AmountKobo != nil {
		amount = verified.AmountKobo
	}
	if amount == nil || *amount <= 0 {
		return apperr.New("VALIDATION_ERROR", "Funding amount missing after PSP verify.")
	}
	acct, err := h.resolveAccount(ctx, ev)
	if err != nil {
		return err
	}
	if acct == nil {
		return apperr.New("NOT_FOUND", "No account matched this funding webhook.").WithStatus(http.StatusNotFound)
	}
	return database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		p, err := finance.Fund(ctx, q, finance.Account{ID: acct.ID, KuraID: acct.KuraID}, *amount, "NUBAN_TRANSFER", ev.Reference)
		if err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "wallet.funded", SubjectType: "wallet",
			SubjectID: acct.ID.String(), SubjectLabel: acct.KuraID,
			After: events.Map{"amount_kobo": *amount, "psp_reference": ev.Reference, "payment_id": p.ID.String(),
				"provider": ev.Provider},
			Metadata: events.Map{"receipt_code": p.ReceiptCode}})
	})
}

func (h *Handler) applyVA(ctx context.Context, ev Event) error {
	if ev.NUBAN == "" || ev.Bank == "" || ev.Name == "" {
		return apperr.New("VALIDATION_ERROR", "VA assign event missing NUBAN fields.")
	}
	acct, err := h.resolveAccount(ctx, ev)
	if err != nil {
		return err
	}
	if acct == nil {
		return apperr.New("NOT_FOUND", "No account matched this VA assign webhook.").WithStatus(http.StatusNotFound)
	}
	got, err := va.Assign(ctx, h.pool, acct.ID, ev.NUBAN, ev.Bank, ev.Name, ev.Reference)
	if err != nil {
		return err
	}
	return h.emit(ctx, events.Event{Action: "virtual_account.assigned", SubjectType: "virtual_account",
		SubjectID: acct.ID.String(), SubjectLabel: acct.KuraID,
		After:    events.Map{"nuban": got.NUBAN, "bank_name": got.BankName, "status": "ACTIVE", "provider": ev.Provider},
		Metadata: events.Map{"psp_reference": got.Reference}})
}

// receive is the paystack / nomba view: DomainErrors come back as a bare
// {"error": {code, message}} (no details / request id), like the view.
func (h *Handler) receive(provider string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(http.MaxBytesReader(w, r.Body, 1<<20))
		row, created, err := h.ingest(r.Context(), provider, r.Header, body)
		if err != nil {
			if e, ok := apperr.As(err); ok {
				status := e.Status
				if status == 0 {
					status = http.StatusBadRequest
				}
				respond.JSON(w, status, map[string]any{"error": map[string]string{"code": e.Code, "message": e.Message}})
				return
			}
			respond.Error(w, r, err)
			return
		}
		respond.OK(w, map[string]any{"id": row.ID.String(), "created": created, "status": row.Status})
	}
}
