package credit

import (
	"encoding/json"
	"net/http"
	"sort"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
)

type previewReq struct {
	Criteria json.RawMessage `json:"criteria"`
}

// preview is preview_segment + allowed_keys.
func (h *Handler) preview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	keys := decode.Keys(r)
	var b previewReq
	err := decode.JSON(r, &b)
	d := map[string]any{}
	raw := dictField(d, "criteria", b.Criteria, keys["criteria"], true)
	if err == nil && len(d) > 0 {
		err = apperr.Validation(apperr.Details(d))
	}
	c := ParseCriteria(raw)
	var p db.SegmentAccountsParams
	if err == nil {
		p, err = MatchParams(ctx, h.q, c)
	}
	var n int64
	var rows []db.SegmentAccountsRow
	if err == nil {
		n, err = count(ctx, h.q, c)
	}
	if err == nil {
		p.Lim, p.Off = 25, 0
		rows, err = h.q.SegmentAccounts(ctx, p)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	sample, idsOut := make([]map[string]any, len(rows)), make([]string, len(rows))
	for i, a := range rows {
		sample[i], idsOut[i] = memberRow(a), a.ID.String()
	}
	keysOut := append([]string{}, allowedKeys...)
	sort.Strings(keysOut)
	respond.OK(w, map[string]any{"count": n, "sample_account_ids": idsOut, "sample": sample,
		"summary": Summary(c), "allowed_keys": keysOut})
}

func (h *Handler) members(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	s, err := h.segment(r)
	var p db.SegmentAccountsParams
	if err == nil {
		p, err = MatchParams(ctx, h.q, ParseCriteria(s.Criteria))
	}
	var total int64
	if err == nil {
		total, err = count(ctx, h.q, ParseCriteria(s.Criteria))
	}
	page, size := paginate.Page(r), paginate.Size(r)
	var rows []db.SegmentAccountsRow
	if err == nil {
		p.Lim, p.Off = int32(size), int32(paginate.Offset(page, size))
		rows, err = h.q.SegmentAccounts(ctx, p)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]map[string]any, len(rows))
	for i, a := range rows {
		out[i] = memberRow(a)
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}
