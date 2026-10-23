package operations

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
)

// DepositDTO is CashDepositListSerializer.
type DepositDTO struct {
	ID            string         `json:"id"`
	ReceiptCode   string         `json:"receipt_code"`
	AmountKobo    int64          `json:"amount_kobo"`
	Status        string         `json:"status"`
	Purpose       string         `json:"purpose"`
	PSPAgentRef   string         `json:"psp_agent_ref"`
	AgentID       string         `json:"agent_id"`
	HubID         string         `json:"hub_id"`
	HubCode       string         `json:"hub_code"`
	AccountID     string         `json:"account_id"`
	AccountKuraID string         `json:"account_kura_id"`
	ShiftID       string         `json:"shift_id"`
	PaymentID     *string        `json:"payment_id"`
	CreatedAt     jsontime.Field `json:"created_at"`
}

// DepositDetailDTO is CashDepositDetailSerializer.
type DepositDetailDTO struct {
	DepositDTO
	IdempotencyKey *string        `json:"idempotency_key"`
	UpdatedAt      jsontime.Field `json:"updated_at"`
}

func idStr(p *uuid.UUID) *string {
	if p == nil {
		return nil
	}
	s := p.String()
	return &s
}

func depositDTO(d db.DepositRowsRow) DepositDTO {
	return DepositDTO{ID: d.ID.String(), ReceiptCode: d.ReceiptCode, AmountKobo: d.AmountKobo, Status: d.Status,
		Purpose: d.Purpose, PSPAgentRef: d.PspAgentRef, AgentID: d.AgentID.String(), HubID: d.HubID.String(),
		HubCode: d.HubCode, AccountID: d.AccountID.String(), AccountKuraID: d.AccountKuraID, ShiftID: d.ShiftID.String(),
		PaymentID: idStr(d.PaymentID), CreatedAt: jsontime.Field(d.CreatedAt)}
}

// depositScope: finance staff / shifts:manage see every deposit, others only
// deposits on accounts they own.
func depositScope(ctx context.Context) (bool, uuid.UUID) {
	p := reqctx.User(ctx)
	uid, _ := uuid.Parse(p.UserID)
	return finance.CanReadAll(p) || p.Can("shifts:manage"), uid
}

func (h *Handler) deposits(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	exists := func(f func(context.Context, uuid.UUID) (bool, error)) func(uuid.UUID) (bool, error) {
		return func(id uuid.UUID) (bool, error) { return f(ctx, id) }
	}
	status, serr := listq.Choice(r, "status", "INITIATED", "SUCCESS", "FAILED")
	hub, herr := listq.Model(r, "hub", exists(h.q.HubExists))
	shift, sherr := listq.Model(r, "shift", exists(h.q.ShiftExists))
	agent, aerr := listq.Model(r, "agent", exists(h.q.UserExists))
	at, cerr := paginate.Cursor(r)
	if err := listq.Merge(serr, herr, sherr, aerr); err != nil || cerr != nil {
		if err == nil {
			err = cerr
		}
		respond.Error(w, r, err)
		return
	}
	all, owner := depositScope(ctx)
	size := paginate.Size(r)
	p := db.DepositsPageParams{AllRows: all, Owner: owner, Status: status, Hub: hub, Shift: shift, Agent: agent,
		Q: listq.Search(r), Lim: int32(size + 1)}
	if at != nil {
		p.AfterAt, p.Back = &at.CreatedAt, at.Back
		p.AfterID, _ = uuid.Parse(at.ID)
	}
	ids, err := h.q.DepositsPage(ctx, p)
	var rows []db.DepositRowsRow
	if err == nil {
		rows, err = h.depositRows(ctx, paginate.Display(ids, size, p.Back))
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]DepositDTO, len(rows))
	for i, d := range rows {
		out[i] = depositDTO(d)
	}
	respond.OK(w, paginate.BuildCursorPage(r, out, size, at, func(d DepositDTO) paginate.Key {
		return paginate.Key{CreatedAt: time.Time(d.CreatedAt), ID: d.ID}
	}))
}

func (h *Handler) depositRows(ctx context.Context, ids []uuid.UUID) ([]db.DepositRowsRow, error) {
	rows, err := h.q.DepositRows(ctx, ids)
	if err != nil {
		return nil, err
	}
	by := map[uuid.UUID]db.DepositRowsRow{}
	for _, d := range rows {
		by[d.ID] = d
	}
	out := make([]db.DepositRowsRow, 0, len(ids))
	for _, id := range ids {
		if d, ok := by[id]; ok {
			out = append(out, d)
		}
	}
	return out, nil
}

// deposit is get_object over the scoped queryset.
func (h *Handler) deposit(r *http.Request) (db.DepositRowsRow, error) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.DepositRowsRow{}, apperr.NotFound("Not found.")
	}
	all, owner := depositScope(r.Context())
	rows, err := h.q.DepositRows(r.Context(), []uuid.UUID{id})
	if err != nil {
		return db.DepositRowsRow{}, err
	}
	if len(rows) == 0 || (!all && rows[0].OwnerUserID != owner) {
		return db.DepositRowsRow{}, apperr.NotFound("No CashDeposit matches the given query.")
	}
	return rows[0], nil
}

func (h *Handler) respondDeposit(w http.ResponseWriter, r *http.Request, d db.DepositRowsRow, status int) {
	respond.JSON(w, status, DepositDetailDTO{DepositDTO: depositDTO(d), IdempotencyKey: d.IdempotencyKey,
		UpdatedAt: jsontime.Field(d.UpdatedAt)})
}

func (h *Handler) getDeposit(w http.ResponseWriter, r *http.Request) {
	d, err := h.deposit(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondDeposit(w, r, d, http.StatusOK)
}

type depositReq struct {
	AccountID uuid.UUID  `json:"account_id" validate:"required"`
	HubID     uuid.UUID  `json:"hub_id" validate:"required"`
	Amount    *int64     `json:"amount_kobo" validate:"required,min=1"`
	ShiftID   *uuid.UUID `json:"shift_id"`
	PSPRef    string     `json:"psp_agent_ref"`
	Purpose   *string    `json:"purpose" validate:"omitempty,oneof=SWAP FUND"`
	Key       string     `json:"idempotency_key"`
}

func (h *Handler) createDeposit(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b depositReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	hub, herr := h.q.HubRow(ctx, b.HubID)
	acct, aerr := h.q.AccountByID(ctx, b.AccountID)
	if database.IsNoRows(herr) || database.IsNoRows(aerr) {
		bad := func(missing bool) []string {
			if missing {
				return []string{"invalid"}
			}
			return []string{}
		}
		respond.Error(w, r, apperr.New("VALIDATION_ERROR", "Unknown hub or account.").WithDetails(apperr.Details{
			"hub_id": bad(database.IsNoRows(herr)), "account_id": bad(database.IsNoRows(aerr))}))
		return
	}
	err := herr
	if err == nil {
		err = aerr
	}
	var all bool
	var hubs []uuid.UUID
	if err == nil {
		all, hubs, err = h.hubScope(ctx)
		if err == nil && !all && !contains(hubs, hub.ID) {
			err = apperr.NotFound("Hub not found.")
		}
	}
	if err == nil && b.ShiftID != nil {
		if ok, serr := h.q.ShiftExists(ctx, *b.ShiftID); serr != nil || !ok {
			err = serr
			if err == nil {
				err = apperr.New("VALIDATION_ERROR", "Unknown shift.").WithDetails(apperr.Details{"shift_id": []string{"invalid"}})
			}
		}
	}
	var agent Agent
	if err == nil {
		agent, err = h.me(ctx)
	}
	var dep db.OperationsCashdeposit
	if err == nil {
		purpose := "SWAP"
		if b.Purpose != nil {
			purpose = *b.Purpose
		}
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			var err error
			dep, err = h.svc.Record(ctx, q, DepositIn{Agent: agent, Hub: hub, Account: acct, Amount: *b.Amount,
				Shift: b.ShiftID, PSPRef: b.PSPRef, Purpose: purpose, IdemKey: b.Key, Actor: who})
			return err
		})
	}
	var rows []db.DepositRowsRow
	if err == nil {
		h.svc.ReceiptEmail(dep.ID)
		rows, err = h.q.DepositRows(ctx, []uuid.UUID{dep.ID})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondDeposit(w, r, rows[0], http.StatusCreated)
}
