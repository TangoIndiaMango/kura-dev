package engines

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/scope"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/support"
)

// parse reads a JSON object body into dst (scalar fields) and returns the
// raw object for list / dict fields, plus DRF field errors so far.
func parse(r *http.Request, dst any) (map[string]json.RawMessage, apperr.Details, error) {
	body, err := io.ReadAll(http.MaxBytesReader(nil, r.Body, 1<<20))
	if err != nil {
		return nil, nil, apperr.Field("non_field_errors", "Invalid request body.")
	}
	obj, err := object(body)
	if err != nil {
		return nil, nil, err
	}
	errs := apperr.Details{}
	var verr *apperr.Error
	if err := decode.Bytes(body, dst); errors.As(err, &verr) {
		for k, v := range verr.Details {
			errs[k] = v
		}
	} else if err != nil {
		return nil, nil, err
	}
	return obj, errs, nil
}

// engineScope is get_queryset: engine staff see all, others their accounts.
func (h *handler) engineScope(ctx context.Context) (bool, []uuid.UUID, error) {
	p := reqctx.User(ctx)
	if p.Can("engines:manage") || p.Can("engines:release") {
		return true, []uuid.UUID{}, nil
	}
	uid, _ := uuid.Parse(p.UserID)
	own, err := scope.OwnAccounts(ctx, h.q, uid)
	return false, own, err
}

func (h *handler) listEngines(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	all, own, err := h.engineScope(ctx)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	p := db.EnginePageParams{AllRows: all, Own: own, Status: listq.Exact(r, "status"), Q: listq.Search(r),
		Ord: ordering(r.URL.Query().Get("ordering"), "created_at", "tag", "status")}
	total, err := h.q.EngineCount(ctx, db.EngineCountParams{AllRows: all, Own: own, Status: p.Status, Q: p.Q})
	page, size := paginate.Page(r), paginate.Size(r)
	p.Lim, p.Off = int32(size), int32(paginate.Offset(page, size))
	var ids []uuid.UUID
	if err == nil {
		ids, err = h.q.EnginePage(ctx, p)
	}
	var rows []db.EngineRowsRow
	if err == nil {
		rows, err = h.engineRows(ctx, ids)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]EngineDTO, len(rows))
	for i, e := range rows {
		out[i] = engineDTO(e)
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

// engine is get_object: scoped (404), then HasCapabilityOrReadOwn's object
// check (accounts readers or the owner, else 403).
func (h *handler) engine(r *http.Request) (db.EngineRowsRow, error) {
	ctx := r.Context()
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.EngineRowsRow{}, apperr.NotFound("Not found.")
	}
	all, own, err := h.engineScope(ctx)
	if err != nil {
		return db.EngineRowsRow{}, err
	}
	rows, err := h.engineRows(ctx, []uuid.UUID{id})
	if err != nil {
		return db.EngineRowsRow{}, err
	}
	if len(rows) == 0 || !(all || contains(own, rows[0].AccountID)) {
		return db.EngineRowsRow{}, apperr.NotFound("No PetrolEngine matches the given query.")
	}
	p := reqctx.User(ctx)
	if !(p.Can("accounts:manage") || p.Can("accounts:read") || rows[0].OwnerUserID.String() == p.UserID) {
		return rows[0], apperr.Forbidden("")
	}
	return rows[0], nil
}

func contains(list []uuid.UUID, id uuid.UUID) bool {
	for _, x := range list {
		if x == id {
			return true
		}
	}
	return false
}

func (h *handler) respondEngine(w http.ResponseWriter, r *http.Request, id uuid.UUID) {
	rows, err := h.engineRows(r.Context(), []uuid.UUID{id})
	var d EngineDetailDTO
	if err == nil {
		d, err = h.engineDetail(r.Context(), rows[0])
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, d)
}

func (h *handler) getEngine(w http.ResponseWriter, r *http.Request) {
	e, err := h.engine(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondEngine(w, r, e.ID)
}

// releaseRequest is EngineCustodyService.request_release: STORED →
// RELEASE_REQUESTED, opens an ENGINE_RELEASE support case, tells the owner.
func (h *handler) releaseRequest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var in struct {
		Note *string `json:"note" validate:"omitempty,max=500"`
	}
	_, errs, err := parse(r, &in)
	if err == nil && len(errs) > 0 {
		err = apperr.Validation(errs)
	}
	var e db.EngineRowsRow
	if err == nil {
		e, err = h.engine(r)
	}
	if err == nil {
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			locked, err := q.EngineForUpdate(ctx, e.ID)
			if err != nil {
				return err
			}
			if locked.Status != "STORED" {
				return apperr.New("INVALID_STATE", "Only STORED engines can request release; is "+locked.Status+".").
					WithStatus(http.StatusConflict)
			}
			note := ""
			if in.Note != nil {
				note = *in.Note
			}
			label := e.OwnerName
			if label == "" {
				label = e.OwnerKuraID
			}
			var opener *uuid.UUID
			if who != nil {
				opener = &who.ID
			}
			caseID, code, err := support.OpenCase(ctx, q, support.OpenIn{Account: e.AccountID, AccountLabel: label,
				Subject: "Engine release — " + locked.Tag, Kind: "ENGINE_RELEASE", Priority: "NORMAL", OpenedBy: opener,
				Actor: who, Body: strings.TrimSpace("Engine release requested for tag " + locked.Tag + ". " +
					strings.TrimSpace(note))})
			if err != nil {
				return err
			}
			raw := map[string]any{}
			_ = json.Unmarshal(locked.Raw, &raw)
			raw["release_case_id"], raw["release_case_code"] = caseID.String(), code
			rawJSON, _ := json.Marshal(raw)
			if err := q.SetEngineReleaseRequested(ctx, db.SetEngineReleaseRequestedParams{ID: e.ID, Raw: rawJSON}); err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "engine.release_requested", SubjectType: "petrol_engine",
				SubjectID: e.ID.String(), SubjectLabel: locked.Tag, Actor: who,
				Before: events.Map{"status": locked.Status},
				After:  events.Map{"status": "RELEASE_REQUESTED", "case_id": caseID.String(), "case_code": code},
				Notify: []events.NotifySpec{{UserID: e.OwnerUserID, Title: "Engine release requested",
					Body: locked.Tag + " — support case " + code, Source: "Engines", LinkPath: "/support",
					TemplateCode: "engine.release_requested", DedupeKey: "engine-release-req:" + e.ID.String()}}})
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondEngine(w, r, e.ID)
}

// release is EngineCustodyService.release: RELEASE_REQUESTED → RELEASED
// with release photos + signature.
func (h *handler) release(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var in struct {
		Signature *string `json:"signature_asset_id" validate:"required,notblank,max=255"`
	}
	obj, errs, err := parse(r, &in)
	var photos []string
	if err == nil {
		if raw, ok := obj["photo_asset_ids"]; !ok {
			errs["photo_asset_ids"] = []string{"This field is required."}
		} else if list, e := strList(raw, 1, 255); e != nil {
			errs["photo_asset_ids"] = e
		} else {
			photos = list
		}
		if len(errs) > 0 {
			err = apperr.Validation(errs)
		}
	}
	var e db.EngineRowsRow
	if err == nil {
		e, err = h.engine(r)
	}
	if err == nil {
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			locked, err := q.EngineForUpdate(ctx, e.ID)
			if err != nil {
				return err
			}
			if locked.Status != "RELEASE_REQUESTED" {
				return apperr.New("INVALID_STATE", "Engine must be RELEASE_REQUESTED before release.").
					WithStatus(http.StatusConflict)
			}
			now := time.Now()
			photosJSON, _ := json.Marshal(photos)
			var by *uuid.UUID
			var byOut any
			if who != nil {
				by, byOut = &who.ID, who.ID.String()
			}
			if err := q.ReleaseEngine(ctx, db.ReleaseEngineParams{ID: e.ID, ReleasedAt: &now, ReleasePhotos: photosJSON,
				ReleaseSignature: strings.TrimSpace(*in.Signature), ReleaseByID: by}); err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "engine.released", SubjectType: "petrol_engine",
				SubjectID: e.ID.String(), SubjectLabel: locked.Tag, Actor: who,
				Before: events.Map{"status": locked.Status},
				After: events.Map{"status": "RELEASED", "released_at": jsontime.FormatISO(now),
					"release_by_id": byOut}})
		})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondEngine(w, r, e.ID)
}
