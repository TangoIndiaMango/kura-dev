package reports

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/export"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/rollup"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/scope"
)

const (
	previewSize = 20
	// fileRowCap bounds one CSV; PDFs keep export.PDFRowCap.
	fileRowCap     = 100_000
	previewTimeout = 10 * time.Second
	countTimeout   = 3 * time.Second
	fileTimeout    = 90 * time.Second
)

// buildReq is one builder run: a dataset, the fields in column order, a
// Lagos date range, filters and an optional search.
type buildReq struct {
	Dataset   string            `json:"dataset"`
	Fields    []string          `json:"fields"`
	StartDate string            `json:"start_date"`
	EndDate   string            `json:"end_date"`
	Filters   map[string]string `json:"filters"`
	Search    string            `json:"search"`
	Format    string            `json:"format,omitempty"`
	Page      int               `json:"page,omitempty"`
}

// plan is a validated request: the dataset, picked fields and bound args.
type plan struct {
	ds         *Dataset
	fields     []Field
	from, to   time.Time
	where      []string
	args       []any
	start, end string
	pdf        bool
	heavy      bool // a filter needs the full FROM to count
}

// access is who is building: staff only (riders hold finance:read and
// swaps:read for their own rows, never for everyone's), and hub-limited
// staff only see datasets that carry a hub, narrowed to their hubs.
type access struct {
	p    *reqctx.Principal
	hubs scope.Hubs
}

func (s *service) access(ctx context.Context) (access, error) {
	p := reqctx.User(ctx)
	a := access{p: p}
	if p == nil || !p.IsStaff {
		return a, nil
	}
	var err error
	a.hubs, err = scope.HubsFor(ctx, s.q, p)
	return a, err
}

func (a access) allows(d *Dataset) bool {
	return a.p != nil && a.p.IsStaff && a.p.Can(d.capability) && (a.hubs.All || d.hub != "")
}

// visible lists the datasets this user may export.
func (a access) visible() []Dataset {
	out := []Dataset{}
	for i := range datasets {
		if a.allows(&datasets[i]) {
			out = append(out, datasets[i])
		}
	}
	return out
}

func parseISODay(name, v string) (time.Time, error) {
	t, err := time.ParseInLocation(time.DateOnly, v, time.UTC)
	if err != nil {
		return time.Time{}, apperr.Field(name, name+" must be YYYY-MM-DD.")
	}
	return rollup.Day(time.Date(t.Year(), t.Month(), t.Day(), 12, 0, 0, 0, time.UTC)), nil
}

// compile checks the request against the catalogue and the user's access.
func compile(a access, b buildReq) (plan, error) {
	ds, ok := datasetByCode[b.Dataset]
	if !ok || !a.allows(ds) {
		return plan{}, apperr.Field("dataset", "Unknown report.")
	}
	pl := plan{ds: ds}
	switch strings.ToLower(b.Format) {
	case "", "csv":
	case "pdf":
		pl.pdf = true
	default:
		return plan{}, apperr.Field("format", "Pick csv or pdf.")
	}
	byKey := make(map[string]Field, len(ds.Fields))
	for _, f := range ds.Fields {
		byKey[f.Key] = f
	}
	seen := map[string]bool{}
	for _, k := range b.Fields {
		f, ok := byKey[k]
		if !ok {
			return plan{}, apperr.Field("fields", "Unknown field "+strconv.Quote(k)+".")
		}
		if !seen[k] {
			seen[k] = true
			pl.fields = append(pl.fields, f)
		}
	}
	if len(pl.fields) == 0 {
		return plan{}, apperr.Field("fields", "Pick at least one field.")
	}
	var err error
	if pl.from, err = parseISODay("start_date", b.StartDate); err != nil {
		return plan{}, err
	}
	if pl.to, err = parseISODay("end_date", b.EndDate); err != nil {
		return plan{}, err
	}
	if pl.from.After(pl.to) {
		pl.from, pl.to = pl.to, pl.from
	}
	pl.start, pl.end = pl.from.Format(time.DateOnly), pl.to.Format(time.DateOnly)
	bind := func(v any) string {
		pl.args = append(pl.args, v)
		return "$" + strconv.Itoa(len(pl.args))
	}
	pl.where = append(pl.where, ds.date+" >= "+bind(pl.from), ds.date+" < "+bind(pl.to.AddDate(0, 0, 1)))
	if !a.hubs.All {
		pl.where = append(pl.where, ds.hub+" = ANY("+bind(a.hubs.IDs)+"::uuid[])")
	}
	for _, flt := range ds.Filters {
		v := strings.TrimSpace(b.Filters[flt.Key])
		if v == "" {
			continue
		}
		var arg any = v
		switch flt.Kind {
		case filterHub, filterCooperative:
			id, err := uuid.Parse(v)
			if err != nil {
				return plan{}, apperr.Field("filters", flt.Label+" is not valid.")
			}
			arg = id
		case filterChoice:
			if !contains(flt.Choices, v) {
				return plan{}, apperr.Field("filters", flt.Label+" "+strconv.Quote(v)+" is not a choice.")
			}
		}
		pl.where = append(pl.where, fmt.Sprintf(flt.cond, bind(arg)))
		pl.heavy = pl.heavy || flt.heavy
	}
	if q := strings.TrimSpace(b.Search); q != "" && len(ds.search) > 0 {
		if len(q) > 100 {
			return plan{}, apperr.Field("search", "Keep the search under 100 characters.")
		}
		ph := bind("%" + likeEscape.Replace(q) + "%")
		parts := make([]string, len(ds.search))
		for i, e := range ds.search {
			parts[i] = e + " ILIKE " + ph
		}
		pl.where = append(pl.where, "("+strings.Join(parts, " OR ")+")")
	}
	return pl, nil
}

var likeEscape = strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)

func contains(xs []string, v string) bool {
	for _, x := range xs {
		if x == v {
			return true
		}
	}
	return false
}

var sqlType = map[string]string{typeText: "text", typeNumber: "bigint", typeMoney: "bigint", typeDatetime: "timestamptz"}

// selectSQL is the row query (limit/offset bound by the caller).
func (pl plan) selectSQL(limit, offset int) string {
	cols := make([]string, len(pl.fields))
	for i, f := range pl.fields {
		cols[i] = "(" + f.expr + ")::" + sqlType[f.Type]
	}
	return "SELECT " + strings.Join(cols, ", ") + " FROM " + pl.ds.from + " WHERE " + strings.Join(pl.where, " AND ") +
		" ORDER BY " + pl.ds.order + fmt.Sprintf(" LIMIT %d OFFSET %d", limit, offset)
}

func (pl plan) countSQL() string {
	from := pl.ds.from
	if pl.ds.countFrom != "" && !pl.heavy {
		from = pl.ds.countFrom
	}
	return "SELECT count(*) FROM " + from + " WHERE " + strings.Join(pl.where, " AND ")
}

type column struct {
	Key   string `json:"key"`
	Label string `json:"label"`
	Type  string `json:"type"`
}

func (pl plan) columns() []column {
	out := make([]column, len(pl.fields))
	for i, f := range pl.fields {
		out[i] = column{f.Key, f.Label, f.Type}
	}
	return out
}

// datasetsList is GET /reports/datasets/: the modules this user can export.
func (s *service) datasetsList(w http.ResponseWriter, r *http.Request) {
	a, err := s.access(r.Context())
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, a.visible())
}

// preview is POST /reports/preview/: one page of rows plus a row count
// (null when counting would take too long).
func (s *service) preview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b buildReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	a, err := s.access(ctx)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	pl, err := compile(a, b)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	page := max(1, b.Page)
	var rows [][]any
	err = database.ReadOnly(ctx, s.pool, previewTimeout, func(tx pgx.Tx) error {
		res, err := tx.Query(ctx, pl.selectSQL(previewSize+1, (page-1)*previewSize), pl.args...)
		if err != nil {
			return err
		}
		defer res.Close()
		for res.Next() {
			vals, err := res.Values()
			if err != nil {
				return err
			}
			rows = append(rows, jsonRow(vals))
		}
		return res.Err()
	})
	if database.IsTimeout(err) {
		err = apperr.New("TOO_SLOW", "That range is too big to preview. Pick fewer days or add a filter.").
			WithStatus(http.StatusUnprocessableEntity)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	more := len(rows) > previewSize
	if more {
		rows = rows[:previewSize]
	}
	var count *int64
	if err := database.ReadOnly(ctx, s.pool, countTimeout, func(tx pgx.Tx) error {
		var n int64
		if err := tx.QueryRow(ctx, pl.countSQL(), pl.args...).Scan(&n); err != nil {
			return err
		}
		count = &n
		return nil
	}); err != nil && !database.IsTimeout(err) {
		respond.Error(w, r, err)
		return
	}
	if rows == nil {
		rows = [][]any{}
	}
	respond.OK(w, map[string]any{"columns": pl.columns(), "rows": rows, "count": count, "page": page,
		"page_size": previewSize, "has_more": more, "range": map[string]string{"start_date": pl.start, "end_date": pl.end}})
}

// jsonRow keeps kobo and numbers as numbers and dates as ISO strings.
func jsonRow(vals []any) []any {
	out := make([]any, len(vals))
	for i, v := range vals {
		if t, ok := v.(time.Time); ok {
			out[i] = t.In(lagosLoc).Format(time.RFC3339)
			continue
		}
		out[i] = v
	}
	return out
}

var lagosLoc, _ = time.LoadLocation("Africa/Lagos")

// fileCell writes one value for a CSV or PDF: naira for money, Lagos time.
func fileCell(f Field, v any) string {
	switch x := v.(type) {
	case nil:
		return ""
	case time.Time:
		return x.In(lagosLoc).Format("2006-01-02 15:04")
	case int64:
		if f.Type == typeMoney {
			return strconv.FormatFloat(float64(x)/100, 'f', 2, 64)
		}
		return strconv.FormatInt(x, 10)
	case string:
		return x
	}
	return fmt.Sprint(v)
}

// compileParams validates a stored job's params for the current user.
func (s *service) compileParams(ctx context.Context, params map[string]any) (plan, error) {
	raw, _ := json.Marshal(params)
	var b buildReq
	if err := json.Unmarshal(raw, &b); err != nil {
		return plan{}, apperr.Field("params", "Invalid report parameters.")
	}
	a, err := s.access(ctx)
	if err != nil {
		return plan{}, err
	}
	return compile(a, b)
}

// renderDataset streams the whole result into a CSV (or a capped PDF).
// Rows go straight from the cursor to the writer, so memory stays flat.
func (s *service) renderDataset(ctx context.Context, params map[string]any) ([]byte, string, string, map[string]any, error) {
	pl, err := s.compileParams(ctx, params)
	if err != nil {
		return nil, "", "", nil, err
	}
	pdf := pl.pdf
	limit := fileRowCap
	if pdf {
		limit = export.PDFRowCap
	}
	stem := fmt.Sprintf("kura-%s-%s-to-%s", pl.ds.Code, pl.start, pl.end)
	headers := make([]string, len(pl.fields))
	for i, f := range pl.fields {
		headers[i] = f.Label
		if f.Type == typeMoney {
			headers[i] += " (NGN)"
		}
	}
	var buf bytes.Buffer
	cw := csv.NewWriter(&buf)
	cw.UseCRLF = true
	title := "Kura " + strings.ToLower(pl.ds.Label) + " · " + pl.start + " to " + pl.end
	var pdfRows [][]string
	if !pdf {
		_ = cw.Write(headers)
	}
	n := 0
	err = database.ReadOnly(ctx, s.pool, fileTimeout, func(tx pgx.Tx) error {
		res, err := tx.Query(ctx, pl.selectSQL(limit+1, 0), pl.args...)
		if err != nil {
			return err
		}
		defer res.Close()
		row := make([]string, len(pl.fields))
		for res.Next() {
			if n++; n > limit {
				break
			}
			vals, err := res.Values()
			if err != nil {
				return err
			}
			for i, v := range vals {
				row[i] = fileCell(pl.fields[i], v)
			}
			if pdf {
				pdfRows = append(pdfRows, append([]string(nil), row...))
			} else if err := cw.Write(row); err != nil {
				return err
			}
		}
		return res.Err()
	})
	if database.IsTimeout(err) {
		err = apperr.New("TOO_SLOW", "That export took too long. Pick fewer days or add a filter.").
			WithStatus(http.StatusUnprocessableEntity)
	}
	if err != nil {
		return nil, "", "", nil, err
	}
	truncated := n > limit
	meta := map[string]any{"rows": min(n, limit), "truncated": truncated}
	if pdf {
		data, err := export.RenderPDF(title, headers, pdfRows, truncated)
		return data, stem + ".pdf", "application/pdf", meta, err
	}
	if truncated {
		_ = cw.Write([]string{fmt.Sprintf("TRUNCATED at %d rows: narrow the dates or filters for the rest.", limit)})
	}
	cw.Flush()
	return buf.Bytes(), stem + ".csv", "text/csv; charset=utf-8", meta, cw.Error()
}
