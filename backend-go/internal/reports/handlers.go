package reports

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/router"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/throttle"
)

var kinds = map[string]bool{"IMPACT_PDF": true, "OPS_CSV": true, "FLEET_CSV": true, "REVENUE_CSV": true, "OTHER": true}

// create is ReportCreateView: validate, queue (idempotent per requester +
// key), then render synchronously while still QUEUED.
func (s *service) create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	body, _ := io.ReadAll(http.MaxBytesReader(nil, r.Body, 1<<20))
	var in struct {
		Kind *string `json:"kind" validate:"required"`
		Key  *string `json:"idempotency_key" validate:"omitempty,max=64"`
	}
	errs := apperr.Details{}
	var verr *apperr.Error
	if err := decode.Bytes(body, &in); errors.As(err, &verr) {
		if _, bad := verr.Details["non_field_errors"]; bad {
			respond.Error(w, r, err)
			return
		}
		for k, v := range verr.Details {
			errs[k] = v
		}
	}
	var obj map[string]json.RawMessage
	_ = json.Unmarshal(body, &obj)
	isNull := func(k string) bool { v, ok := obj[k]; return ok && bytes.Equal(bytes.TrimSpace(v), []byte("null")) }
	if isNull("kind") {
		errs["kind"] = []string{"This field may not be null."}
	} else if in.Kind != nil && !kinds[*in.Kind] {
		errs["kind"] = []string{fmt.Sprintf("\"%s\" is not a valid choice.", *in.Kind)}
	}
	if isNull("idempotency_key") {
		errs["idempotency_key"] = []string{"This field may not be null."}
	}
	params := map[string]any{}
	if v, ok := obj["params"]; ok {
		if isNull("params") {
			errs["params"] = []string{"This field may not be null."}
		} else if json.Unmarshal(v, &params) != nil || params == nil {
			var x any
			_ = json.Unmarshal(v, &x)
			errs["params"] = []string{fmt.Sprintf("Expected a dictionary of items but got type \"%s\".", pyType(x, v))}
		}
	}
	if len(errs) > 0 {
		respond.Error(w, r, apperr.Validation(errs))
		return
	}
	kind := *in.Kind
	if kind == "OTHER" {
		respond.Error(w, r, apperr.New("UNSUPPORTED", "Report kind OTHER is not available in this release.").
			WithStatus(http.StatusNotImplemented))
		return
	}
	key := ""
	if in.Key != nil {
		key = strings.TrimSpace(*in.Key)
	}
	var id uuid.UUID
	err := database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		who, err := actor.FromRequest(ctx, q)
		if err != nil {
			return err
		}
		var by *uuid.UUID
		if who != nil {
			by = &who.ID
		}
		if key != "" && by != nil {
			if j, err := q.ReportByKey(ctx, db.ReportByKeyParams{IdempotencyKey: key, RequestedByID: by}); err == nil {
				id = j.ID
				return nil
			} else if !database.IsNoRows(err) {
				return err
			}
		}
		id = ids.New()
		exp := time.Now().Add(ttl)
		paramsJSON, _ := json.Marshal(params)
		if err := q.InsertReport(ctx, db.InsertReportParams{ID: id, Kind: kind, Params: paramsJSON, ExpiresAt: &exp,
			RequestedByID: by, IdempotencyKey: key}); err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "report.queued", SubjectType: "report_job",
			SubjectID: id.String(), SubjectLabel: kind, Actor: who,
			After: events.Map{"kind": kind, "params": params, "status": "QUEUED"}})
	})
	var job db.AnalyticsReportjob
	if err == nil {
		job, err = s.q.ReportByID(ctx, id)
	}
	if err == nil && job.Status == "QUEUED" {
		if err = s.process(r, id); err == nil {
			job, err = s.q.ReportByID(ctx, id)
		}
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, http.StatusCreated, serialize(job))
}

func pyType(v any, raw json.RawMessage) string {
	switch v.(type) {
	case string:
		return "str"
	case float64:
		if !bytes.ContainsAny(raw, ".eE") {
			return "int"
		}
		return "float"
	case bool:
		return "bool"
	case []any:
		return "list"
	}
	return "NoneType"
}

func (s *service) job(r *http.Request) (db.AnalyticsReportjob, error) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.AnalyticsReportjob{}, apperr.NotFound("Not found.")
	}
	j, err := s.q.ReportByID(r.Context(), id)
	if database.IsNoRows(err) {
		err = apperr.NotFound("Report not found.")
	}
	return j, err
}

func (s *service) detail(w http.ResponseWriter, r *http.Request) {
	j, err := s.job(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, serialize(j))
}

// download is ReportDownloadView: the stored file as an attachment.
func (s *service) download(w http.ResponseWriter, r *http.Request) {
	j, err := s.job(r)
	if err == nil && (j.Status != "READY" || j.FilePublicID == "") {
		err = apperr.New("NOT_READY", "Report is not ready for download.").WithStatus(http.StatusConflict)
	}
	if err == nil && j.ExpiresAt != nil && j.ExpiresAt.Before(time.Now()) {
		err = apperr.New("EXPIRED", "Report download link has expired.").WithStatus(http.StatusGone)
	}
	var data []byte
	if err == nil {
		data, err = os.ReadFile(filepath.Join(s.root, filepath.FromSlash(j.FilePublicID)))
		if errors.Is(err, os.ErrNotExist) {
			err = apperr.NotFound("Report file missing.")
		}
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	raw := map[string]any{}
	_ = json.Unmarshal(j.Raw, &raw)
	name, _ := raw["filename"].(string)
	if name == "" {
		name = "kura-report-" + j.ID.String() + ".pdf"
	}
	ctype, _ := raw["content_type"].(string)
	if ctype == "" {
		ctype = "application/pdf"
	}
	w.Header().Set("Content-Type", ctype)
	w.Header().Set("Content-Length", fmt.Sprint(len(data)))
	w.Header().Set("Content-Disposition", disposition(name))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

// disposition is FileResponse's attachment header: a quoted ASCII name, or
// RFC 5987 filename* for anything else.
func disposition(name string) string {
	for _, r := range name {
		if r > 0x7e || r < 0x20 {
			return "attachment; filename*=utf-8''" + url.PathEscape(name)
		}
	}
	return `attachment; filename="` + strings.NewReplacer(`\`, `\\`, `"`, `\"`).Replace(name) + `"`
}

// Module mounts /api/v1/reports/*.
type Module struct {
	s       *service
	limiter *throttle.Limiter
}

func NewModule(pool *pgxpool.Pool, root string, limiter *throttle.Limiter) *Module {
	return &Module{s: &service{pool: pool, q: db.New(pool), root: root}, limiter: limiter}
}

func (m *Module) Register(mux *http.ServeMux) {
	g := router.New(mux, "/api/v1/reports", m.limiter)
	g.Cap("POST", "/", "analytics:impact", m.s.create)
	g.Cap("GET", "/{id}/", "analytics:impact", m.s.detail)
	g.Cap("GET", "/{id}/download/", "analytics:impact", m.s.download)
}
