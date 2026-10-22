package analytics

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
)

// storyIn is ImpactStoryWriteSerializer.
type storyIn struct {
	Title    *string `json:"title" validate:"omitempty,notblank,max=160"`
	Region   *string `json:"region" validate:"omitempty,max=80"`
	Metric   *string `json:"metric_highlight" validate:"omitempty,max=120"`
	Partners *string `json:"partners" validate:"omitempty,max=200"`
	Summary  *string `json:"summary"`
	Status   *string `json:"status"`
	Raw      map[string]any
}

func readStory(r *http.Request, partial bool) (storyIn, error) {
	var in storyIn
	body, err := io.ReadAll(http.MaxBytesReader(nil, r.Body, 1<<20))
	if err != nil {
		return in, apperr.Field("non_field_errors", "Invalid request body.")
	}
	errs := apperr.Details{}
	var verr *apperr.Error
	if err := decode.Bytes(body, &in); errors.As(err, &verr) {
		if _, ok := verr.Details["non_field_errors"]; ok {
			return in, err
		}
		for k, v := range verr.Details {
			errs[k] = v
		}
	} else if err != nil {
		return in, err
	}
	var obj map[string]json.RawMessage
	_ = json.Unmarshal(body, &obj)
	null := func(k string) bool { v, ok := obj[k]; return ok && bytes.Equal(bytes.TrimSpace(v), []byte("null")) }
	for _, k := range []string{"title", "region", "metric_highlight", "partners", "summary", "status", "raw"} {
		if null(k) {
			errs[k] = []string{"This field may not be null."}
		}
	}
	if in.Status != nil && !null("status") && *in.Status != "DRAFT" && *in.Status != "PUBLISHED" && *in.Status != "ARCHIVED" {
		errs["status"] = []string{fmt.Sprintf("\"%s\" is not a valid choice.", *in.Status)}
	}
	if v, ok := obj["raw"]; ok && !null("raw") {
		if json.Unmarshal(v, &in.Raw) != nil || in.Raw == nil {
			errs["raw"] = []string{"Expected a dictionary of items but got type \"" + pyType(v) + "\"."}
		}
	}
	if len(errs) > 0 {
		return in, apperr.Validation(errs)
	}
	if !partial && (in.Title == nil || strings.TrimSpace(*in.Title) == "") {
		return in, apperr.Validation(apperr.Details{"title": []string{"This field is required."}})
	}
	return in, nil
}

func pyType(raw json.RawMessage) string {
	var v any
	_ = json.Unmarshal(raw, &v)
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

func cut(s *string, n int) string {
	if s == nil {
		return ""
	}
	r := []rune(strings.TrimSpace(*s))
	if len(r) > n {
		r = r[:n]
	}
	return string(r)
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
