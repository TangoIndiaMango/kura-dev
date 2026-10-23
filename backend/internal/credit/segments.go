package credit

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
)

// allowedKeys is ALLOWED_FILTER_KEYS (in the summary's display order).
var allowedKeys = []string{"status", "kyc_status", "kind", "cooperative_id", "min_active_days", "max_active_days",
	"min_score"}

// Criteria is a decoded criteria object (numbers kept as written).
type Criteria map[string]any

// ParseCriteria decodes JSON keeping numbers as json.Number.
func ParseCriteria(raw []byte) Criteria {
	var c Criteria
	d := json.NewDecoder(bytes.NewReader(raw))
	d.UseNumber()
	_ = d.Decode(&c)
	return c
}

func allowed(k string) bool {
	for _, a := range allowedKeys {
		if a == k {
			return true
		}
	}
	return false
}

// pyStr is Python str() of a JSON value.
func pyStr(v any) string {
	switch x := v.(type) {
	case nil:
		return "None"
	case bool:
		if x {
			return "True"
		}
		return "False"
	case string:
		return x
	case json.Number:
		return x.String()
	case float64:
		return strconv.FormatFloat(x, 'f', -1, 64)
	}
	b, _ := json.Marshal(v)
	return string(b)
}

func pyList(keys []string) string {
	parts := make([]string, len(keys))
	for i, k := range keys {
		parts[i] = "'" + k + "'"
	}
	return "[" + strings.Join(parts, ", ") + "]"
}

func badCriteria(msg string) error { return apperr.New("VALIDATION_ERROR", msg) }

// ValidateCriteria is validate_criteria.
func ValidateCriteria(c Criteria) (Criteria, error) {
	unknown := []string{}
	for k := range c {
		if !allowed(k) && k != "segment_id" {
			unknown = append(unknown, k)
		}
	}
	if len(unknown) > 0 {
		sort.Strings(unknown)
		return nil, badCriteria("Unsupported segment_criteria keys: " + pyList(unknown))
	}
	out := Criteria{}
	for _, k := range allowedKeys {
		if v, ok := c[k]; ok {
			out[k] = v
		}
	}
	if sid, ok := c["segment_id"]; ok && truthy(sid) {
		out["segment_id"] = pyStr(sid)
		return out, nil
	}
	if len(out) == 0 {
		return nil, badCriteria("Provide at least one filter key or segment_id.")
	}
	return out, nil
}

func truthy(v any) bool {
	switch x := v.(type) {
	case nil:
		return false
	case bool:
		return x
	case string:
		return x != ""
	case json.Number:
		f, _ := x.Float64()
		return f != 0
	case []any:
		return len(x) > 0
	case map[string]any:
		return len(x) > 0
	}
	return true
}

var criteriaLabels = map[string]string{"status": "Account status", "kyc_status": "KYC", "kind": "Account kind",
	"cooperative_id": "Cooperative", "min_active_days": "Min tenure", "max_active_days": "Max tenure",
	"min_score": "Min credit score"}

var valueLabels = map[string]map[string]string{
	"status":     {"ACTIVE": "Active", "SUSPENDED": "Suspended", "PENDING": "Pending", "DEREGISTERED": "Deregistered"},
	"kyc_status": {"VERIFIED": "Verified", "PENDING": "Pending", "PROVISIONAL": "Provisional", "NONE": "None", "REJECTED": "Rejected"},
	"kind":       {"INDIVIDUAL": "Individual", "FLEET": "Fleet"},
}

// Summary is criteria_summary.
func Summary(c Criteria) string {
	parts := []string{}
	if sid, ok := c["segment_id"]; ok && truthy(sid) {
		s := pyStr(sid)
		if len([]rune(s)) > 8 {
			s = string([]rune(s)[:8])
		}
		parts = append(parts, "Saved segment "+s)
	}
	for _, k := range allowedKeys {
		v, ok := c[k]
		if !ok || v == nil || v == "" {
			continue
		}
		val := pyStr(v)
		switch k {
		case "min_active_days", "max_active_days":
			val += " days"
		case "min_score":
		default:
			if m := valueLabels[k][val]; m != "" {
				val = m
			}
		}
		parts = append(parts, criteriaLabels[k]+": "+val)
	}
	if len(parts) == 0 {
		return "—"
	}
	return strings.Join(parts, " · ")
}

// pyInt is int() on a JSON value (500 in Django on junk; 400 here).
func pyInt(k string, v any) (int64, error) {
	switch x := v.(type) {
	case json.Number:
		if n, err := x.Int64(); err == nil {
			return n, nil
		}
		f, err := x.Float64()
		if err == nil {
			return int64(math.Trunc(f)), nil
		}
	case string:
		if n, err := strconv.ParseInt(strings.TrimSpace(x), 10, 64); err == nil {
			return n, nil
		}
	case bool:
		if x {
			return 1, nil
		}
		return 0, nil
	}
	return 0, badCriteria(fmt.Sprintf("%s must be an integer.", k))
}

// expand is _expand_saved_segment: a segment_id swaps in that ACTIVE
// segment's own criteria.
func expand(ctx context.Context, q *db.Queries, c Criteria) (Criteria, error) {
	sid, ok := c["segment_id"]
	if !ok || !truthy(sid) {
		out := Criteria{}
		for _, k := range allowedKeys {
			if v, ok := c[k]; ok {
				out[k] = v
			}
		}
		return out, nil
	}
	notFound := apperr.New("SEGMENT_NOT_FOUND", "Saved segment not found.").WithStatus(http.StatusNotFound)
	id, err := uuid.Parse(pyStr(sid))
	if err != nil {
		return nil, notFound
	}
	seg, err := q.SegmentByID(ctx, id)
	if database.IsNoRows(err) {
		return nil, notFound
	}
	if err != nil {
		return nil, err
	}
	if seg.Status != "ACTIVE" {
		return nil, apperr.Conflict("SEGMENT_NOT_ACTIVE", "Only ACTIVE segments can be used for targeting.")
	}
	nested := ParseCriteria(seg.Criteria)
	delete(nested, "segment_id")
	return ValidateCriteria(nested)
}

// MatchParams turns criteria into the account query filters (accounts_queryset).
func MatchParams(ctx context.Context, q *db.Queries, c Criteria) (db.SegmentAccountsParams, error) {
	v, err := ValidateCriteria(c)
	if err != nil {
		return db.SegmentAccountsParams{}, err
	}
	f, err := expand(ctx, q, v)
	if err != nil {
		return db.SegmentAccountsParams{}, err
	}
	p := db.SegmentAccountsParams{}
	str := func(k string) *string {
		if x, ok := f[k]; ok && truthy(x) {
			s := pyStr(x)
			return &s
		}
		return nil
	}
	p.Status, p.KycStatus, p.Kind = str("status"), str("kyc_status"), str("kind")
	if coop := str("cooperative_id"); coop != nil {
		id, err := uuid.Parse(*coop)
		if err != nil {
			return p, apperr.Validation(apperr.Details{"non_field_errors": []string{"“" + *coop + "” is not a valid UUID."}})
		}
		p.Cooperative = &id
	}
	today := utcDay(timeNow())
	for _, k := range []string{"min_active_days", "max_active_days", "min_score"} {
		x, ok := f[k]
		if !ok || x == nil {
			continue
		}
		n, err := pyInt(k, x)
		if err != nil {
			return p, err
		}
		switch k {
		case "min_active_days":
			p.CreatedOnOrBefore = pgDate(today.AddDate(0, 0, -int(n)))
		case "max_active_days":
			p.CreatedOnOrAfter = pgDate(today.AddDate(0, 0, -int(n)))
		case "min_score":
			s := int32(n)
			p.MinScore = &s
		}
	}
	return p, nil
}
