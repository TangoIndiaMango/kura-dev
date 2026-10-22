package platformcfg

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

// Handler serves /api/v1/config/*.
type Handler struct {
	pool *pgxpool.Pool
	q    *db.Queries
}

// VersionDTO is ConfigVersionSerializer.
type VersionDTO struct {
	ID              string          `json:"id"`
	Namespace       string          `json:"namespace"`
	Key             string          `json:"key"`
	Value           json.RawMessage `json:"value"`
	Status          string          `json:"status"`
	EffectiveFrom   *jsontime.Field `json:"effective_from"`
	CreatedByID     *string         `json:"created_by_id"`
	ApprovedByID    *string         `json:"approved_by_id"`
	CreatedByLabel  string          `json:"created_by_label"`
	ApprovedByLabel string          `json:"approved_by_label"`
	Note            string          `json:"note"`
	CreatedAt       jsontime.Field  `json:"created_at"`
	UpdatedAt       jsontime.Field  `json:"updated_at"`
}

func idStr(p *uuid.UUID) *string {
	if p == nil {
		return nil
	}
	s := p.String()
	return &s
}

func label(first, last, email, phone *string) string {
	d := func(p *string) string {
		if p == nil {
			return ""
		}
		return *p
	}
	if n := strings.TrimSpace(d(first) + " " + d(last)); n != "" {
		return n
	}
	if e := d(email); e != "" {
		return e
	}
	return d(phone)
}

func versionDTO(v db.ConfigVersionRowsRow) VersionDTO {
	return VersionDTO{ID: v.ID.String(), Namespace: v.Namespace, Key: v.Key, Value: v.Value, Status: v.Status,
		EffectiveFrom: jsontime.FieldPtr(v.EffectiveFrom), CreatedByID: idStr(v.CreatedByID),
		ApprovedByID: idStr(v.ApprovedByID), CreatedByLabel: label(v.CFirst, v.CLast, v.CEmail, v.CPhone),
		ApprovedByLabel: label(v.AFirst, v.ALast, v.AEmail, v.APhone), Note: v.Note,
		CreatedAt: jsontime.Field(v.CreatedAt), UpdatedAt: jsontime.Field(v.UpdatedAt)}
}

func (h *Handler) row(ctx context.Context, id uuid.UUID) (db.ConfigVersionRowsRow, error) {
	rows, err := h.q.ConfigVersionRows(ctx, []uuid.UUID{id})
	if err == nil && len(rows) == 0 {
		err = apperr.NotFound("No ConfigVersion matches the given query.")
	}
	if err != nil {
		return db.ConfigVersionRowsRow{}, err
	}
	return rows[0], nil
}

// namespaceGate: unknown → DRF's raw {"detail": "Not found."}; then the
// read (namespace cap or finance:read) / write (namespace cap) check.
func namespaceGate(w http.ResponseWriter, r *http.Request, write bool) (string, bool) {
	ns := r.PathValue("namespace")
	if !Known(ns) {
		respond.JSON(w, http.StatusNotFound, map[string]string{"detail": "Not found."})
		return "", false
	}
	p := reqctx.User(r.Context())
	if !(p.Can(Caps[ns]) || (!write && p.Can("finance:read"))) {
		respond.Error(w, r, apperr.Forbidden(""))
		return "", false
	}
	return ns, true
}

// snapshot is namespace_snapshot.
func (h *Handler) snapshot(w http.ResponseWriter, r *http.Request) {
	ns, ok := namespaceGate(w, r, false)
	if !ok {
		return
	}
	ctx := r.Context()
	eff, err := Effective(ctx, h.q, ns)
	var active, pending *db.CoreConfigversion
	if err == nil {
		if a, aerr := h.q.ActiveConfig(ctx, db.ActiveConfigParams{Namespace: ns, Key: SettingsKey}); aerr == nil {
			active = &a
		} else if !database.IsNoRows(aerr) {
			err = aerr
		}
	}
	if err == nil {
		if p, perr := h.q.PendingConfig(ctx, db.PendingConfigParams{Namespace: ns, Key: SettingsKey}); perr == nil {
			pending = &p
		} else if !database.IsNoRows(perr) {
			err = perr
		}
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := map[string]any{"namespace": ns, "effective": eff, "active_version_id": nil, "pending": nil}
	if active != nil {
		out["active_version_id"] = active.ID.String()
	}
	if pending != nil {
		out["pending"] = map[string]any{"id": pending.ID.String(), "value": json.RawMessage(pending.Value),
			"created_by_id": idStr(pending.CreatedByID), "note": pending.Note,
			"created_at": jsontime.FormatISO(pending.CreatedAt)}
	}
	respond.OK(w, out)
}

func pyType(v any) string {
	switch v.(type) {
	case []any:
		return "list"
	case string:
		return "str"
	case float64:
		return "int"
	case bool:
		return "bool"
	}
	return "NoneType"
}

type proposeReq struct {
	Value json.RawMessage `json:"value"`
	Note  string          `json:"note" validate:"max=255"`
}

// propose is ConfigService.propose: merged over the effective value, any
// older PENDING draft rejected.
func (h *Handler) propose(w http.ResponseWriter, r *http.Request) {
	ns, ok := namespaceGate(w, r, true)
	if !ok {
		return
	}
	ctx := r.Context()
	keys := decode.Keys(r)
	var b proposeReq
	err := decode.JSON(r, &b)
	d := apperr.Details{}
	if e, ok := apperr.As(err); ok && e.Code == "VALIDATION_ERROR" {
		d, err = e.Details, nil
	}
	var value map[string]any
	if d["value"] == nil {
		var v any
		_ = json.Unmarshal(b.Value, &v)
		m, isMap := v.(map[string]any)
		switch {
		case !keys["value"]:
			d["value"] = []string{"This field is required."}
		case v == nil:
			d["value"] = []string{"This field may not be null."}
		case !isMap:
			d["value"] = []string{fmt.Sprintf("Expected a dictionary of items but got type \"%s\".", pyType(v))}
		case len(m) == 0:
			d["value"] = []string{"This dictionary may not be empty."}
		default:
			value = m
		}
	}
	if err == nil && len(d) > 0 {
		err = apperr.Validation(d)
	}
	var merged map[string]any
	if err == nil {
		merged, err = Effective(ctx, h.q, ns)
	}
	if err == nil {
		for k, v := range value {
			merged[k] = v
		}
		if e, has := merged["enabled"]; has {
			if _, isBool := e.(bool); !isBool {
				err = apperr.New("VALIDATION_ERROR", "enabled must be a boolean.")
			}
		}
	}
	id := ids.New()
	if err == nil {
		uid, _ := uuid.Parse(reqctx.User(ctx).UserID)
		note := []rune(b.Note)
		if len(note) > 255 {
			note = note[:255]
		}
		raw, _ := json.Marshal(merged)
		err = database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
			q := db.New(tx)
			if err := q.RejectPendingConfig(ctx, db.RejectPendingConfigParams{Namespace: ns, Key: SettingsKey}); err != nil {
				return err
			}
			if err := q.InsertConfig(ctx, db.InsertConfigParams{ID: id, Namespace: ns, Key: SettingsKey, Value: raw,
				CreatedByID: &uid, Note: string(note)}); err != nil {
				return err
			}
			who, err := actor.FromRequest(ctx, q)
			if err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "config.proposed", SubjectType: "config_version",
				SubjectID: id.String(), Actor: who, After: events.Map{"namespace": ns, "key": SettingsKey,
					"enabled": merged["enabled"], "note": string(note)}})
		})
	}
	var row db.ConfigVersionRowsRow
	if err == nil {
		row, err = h.row(ctx, id)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, http.StatusCreated, versionDTO(row))
}
