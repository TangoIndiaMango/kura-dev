// Package reports ports analytics ReportJob: queue a report (impact PDF,
// ops / fleet / revenue CSV), render it into default storage (a local
// directory, like Django's FileSystemStorage), then serve status + download.
package reports

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
)

const ttl = 24 * time.Hour

type service struct {
	pool *pgxpool.Pool
	q    *db.Queries
	root string
}

// render is _render_payload: (bytes, filename, content type).
func (s *service) render(r *http.Request, kind string, params map[string]any) ([]byte, string, string, error) {
	ctx := r.Context()
	switch kind {
	case "IMPACT_PDF":
		period := pyStr(params["period"])
		data, err := impactPDF(r, s.q, period)
		name := period
		if name == "" {
			name = "latest"
		}
		return data, "kura-impact-" + name + ".pdf", "application/pdf", err
	case "OPS_CSV":
		data, name, err := opsCSV(ctx, s.q, params)
		return data, name, "text/csv; charset=utf-8", err
	case "FLEET_CSV":
		data, name, err := fleetCSV(ctx, s.q, params)
		return data, name, "text/csv; charset=utf-8", err
	case "REVENUE_CSV":
		data, name, err := revenueCSV(ctx, s.q, params)
		return data, name, "text/csv; charset=utf-8", err
	}
	return nil, "", "", apperr.New("UNSUPPORTED", "Report kind "+kind+" is not implemented yet.").WithStatus(http.StatusNotImplemented)
}

func mergeRaw(raw []byte, kv map[string]any) []byte {
	m := map[string]any{}
	_ = json.Unmarshal(raw, &m)
	for k, v := range kv {
		m[k] = v
	}
	out, _ := json.Marshal(m)
	return out
}

func (s *service) save(ctx context.Context, q *db.Queries, j db.AnalyticsReportjob) error {
	return q.SaveReport(ctx, db.SaveReportParams{ID: j.ID, Status: j.Status, FilePublicID: j.FilePublicID,
		ExpiresAt: j.ExpiresAt, Raw: j.Raw})
}

// process is ReportJobService.process: QUEUED → RUNNING → READY (file
// written) or FAILED (error recorded, then re-raised).
func (s *service) process(r *http.Request, id uuid.UUID) error {
	ctx := r.Context()
	var job db.AnalyticsReportjob
	done := false
	err := database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		var err error
		if job, err = q.ReportForUpdate(ctx, id); err != nil {
			return err
		}
		switch job.Status {
		case "READY", "RUNNING":
			done = true
			return nil
		case "EXPIRED":
			return apperr.New("INVALID_STATE", "Report job expired.").WithStatus(http.StatusConflict)
		}
		job.Status = "RUNNING"
		return s.save(ctx, q, job)
	})
	if err != nil || done {
		return err
	}
	params := map[string]any{}
	_ = json.Unmarshal(job.Params, &params)
	payload, filename, ctype, err := s.render(r, job.Kind, params)
	key := ""
	if err == nil {
		folder, ext := "csv", "csv"
		if job.Kind == "IMPACT_PDF" {
			folder = "impact"
		}
		if ctype == "application/pdf" {
			ext = "pdf"
		}
		key = fmt.Sprintf("reports/%s/%s.%s", folder, job.ID, ext)
		path := filepath.Join(s.root, filepath.FromSlash(key))
		if err = os.MkdirAll(filepath.Dir(path), 0o755); err == nil {
			err = os.WriteFile(path, payload, 0o644)
		}
	}
	if err != nil {
		msg := err.Error()
		if e, ok := apperr.As(err); ok {
			msg = e.Message
		}
		_ = database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
			q := db.New(tx)
			locked, err := q.ReportForUpdate(ctx, id)
			if err != nil {
				return err
			}
			locked.Status, locked.Raw = "FAILED", mergeRaw(locked.Raw, map[string]any{"error": cut(msg, 500)})
			if err := s.save(ctx, q, locked); err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "report.failed", SubjectType: "report_job",
				SubjectID: id.String(), SubjectLabel: locked.Kind,
				After: events.Map{"status": "FAILED", "error": cut(msg, 200)}})
		})
		return err
	}
	return database.InTx(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		locked, err := q.ReportForUpdate(ctx, id)
		if err != nil {
			return err
		}
		exp := time.Now().Add(ttl)
		locked.FilePublicID, locked.Status, locked.ExpiresAt = key, "READY", &exp
		locked.Raw = mergeRaw(locked.Raw, map[string]any{"content_type": ctype, "bytes": len(payload),
			"filename": filename})
		if err := s.save(ctx, q, locked); err != nil {
			return err
		}
		return events.Emit(ctx, q, events.Event{Action: "report.ready", SubjectType: "report_job",
			SubjectID: id.String(), SubjectLabel: locked.Kind,
			After: events.Map{"status": "READY", "file_public_id": key}})
	})
}

func cut(s string, n int) string {
	if r := []rune(s); len(r) > n {
		return string(r[:n])
	}
	return s
}

// serialize is ReportJobService.serialize (READY past expiry reads EXPIRED).
func serialize(j db.AnalyticsReportjob) map[string]any {
	status := j.Status
	if j.ExpiresAt != nil && j.ExpiresAt.Before(time.Now()) && status == "READY" {
		status = "EXPIRED"
	}
	download := ""
	if status == "READY" && j.FilePublicID != "" {
		download = "/api/v1/reports/" + j.ID.String() + "/download/"
	}
	params := json.RawMessage(j.Params)
	if len(params) == 0 || string(params) == "null" {
		params = json.RawMessage("{}")
	}
	raw := map[string]any{}
	_ = json.Unmarshal(j.Raw, &raw)
	kept := map[string]any{}
	for _, k := range []string{"content_type", "filename", "bytes", "error"} {
		if v, ok := raw[k]; ok {
			kept[k] = v
		}
	}
	var exp any
	if j.ExpiresAt != nil {
		exp = jsontime.FormatISO(*j.ExpiresAt)
	}
	return map[string]any{"id": j.ID.String(), "kind": j.Kind, "params": params, "status": status,
		"file_public_id": j.FilePublicID, "download_path": download, "expires_at": exp, "raw": kept,
		"created_at": jsontime.FormatISO(j.CreatedAt)}
}
