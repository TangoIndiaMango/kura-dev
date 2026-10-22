package decode

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
)

// Query reads typed query parameters. Invalid values become field errors
// collected on q.Err(), so a handler validates every param in one pass.
type Query struct {
	r    *http.Request
	errs apperr.Details
}

// Params wraps the request's query string.
func Params(r *http.Request) *Query { return &Query{r: r, errs: apperr.Details{}} }

// String returns the trimmed value, or "".
func (q *Query) String(name string) string {
	return strings.TrimSpace(q.r.URL.Query().Get(name))
}

// UUID returns a parsed UUID or nil when absent; records an error if invalid.
func (q *Query) UUID(name string) *uuid.UUID {
	raw := q.String(name)
	if raw == "" {
		return nil
	}
	id, err := uuid.Parse(raw)
	if err != nil {
		q.fail(name, "Enter a valid UUID.")
		return nil
	}
	return &id
}

// Int returns the value or def; records an error if not an integer.
func (q *Query) Int(name string, def int) int {
	raw := q.String(name)
	if raw == "" {
		return def
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		q.fail(name, "A valid integer is required.")
		return def
	}
	return n
}

// Bool accepts true/false/1/0 (DRF BooleanFilter semantics).
func (q *Query) Bool(name string) *bool {
	switch strings.ToLower(q.String(name)) {
	case "":
		return nil
	case "true", "1", "yes":
		b := true
		return &b
	case "false", "0", "no":
		b := false
		return &b
	default:
		q.fail(name, "Must be true or false.")
		return nil
	}
}

// Date parses YYYY-MM-DD (django-filters DateFilter).
func (q *Query) Date(name string) *time.Time {
	raw := q.String(name)
	if raw == "" {
		return nil
	}
	d, err := time.Parse(time.DateOnly, raw)
	if err != nil {
		q.fail(name, "Enter a valid date.")
		return nil
	}
	return &d
}

// Err returns a VALIDATION_ERROR when any param was invalid.
func (q *Query) Err() error {
	if len(q.errs) == 0 {
		return nil
	}
	return apperr.Validation(q.errs)
}

func (q *Query) fail(name, msg string) {
	q.errs[name] = []string{msg}
}

// dateTimeLayouts are what Django's parse_datetime / fromisoformat accept.
var dateTimeLayouts = []string{time.RFC3339Nano, "2006-01-02T15:04:05.999999999", "2006-01-02T15:04",
	"2006-01-02 15:04:05.999999999Z07:00", "2006-01-02 15:04:05.999999999", "2006-01-02 15:04", time.DateOnly}

// DateTime parses an ISO 8601 value (django-filters IsoDateTimeFilter);
// naive values are read in loc, like Django's make_aware.
func (q *Query) DateTime(name string, loc *time.Location) *time.Time {
	raw := q.String(name)
	if raw == "" {
		return nil
	}
	for _, l := range dateTimeLayouts {
		if t, err := time.ParseInLocation(l, raw, loc); err == nil {
			return &t
		}
	}
	q.fail(name, "Enter a valid date/time.")
	return nil
}
