package engines

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
)

// ordering is OrderingFilter: the first allowed ?ordering= term, else "".
func ordering(raw string, allowed ...string) string {
	for _, t := range strings.Split(raw, ",") {
		t = strings.TrimSpace(t)
		for _, a := range allowed {
			if t == a || t == "-"+a {
				return t
			}
		}
	}
	return ""
}

func isNull(raw json.RawMessage) bool { return bytes.Equal(bytes.TrimSpace(raw), []byte("null")) }

// strList is ListField(child=CharField(max_length=max), min_length=minLen):
// returns the trimmed items, or the DRF error for the field.
func strList(raw json.RawMessage, minLen, max int) ([]string, any) {
	if isNull(raw) {
		return nil, []string{"This field may not be null."}
	}
	var items []json.RawMessage
	if err := json.Unmarshal(raw, &items); err != nil {
		var v any
		_ = json.Unmarshal(raw, &v)
		return nil, []string{fmt.Sprintf("Expected a list of items but got type \"%s\".", pyType(v, raw))}
	}
	out, errs := make([]string, 0, len(items)), map[string]any{}
	for i, it := range items {
		var v any
		_ = json.Unmarshal(it, &v)
		var s string
		switch x := v.(type) {
		case nil:
			errs[strconv.Itoa(i)] = []string{"This field may not be null."}
			continue
		case string:
			s = strings.TrimSpace(x)
		case float64:
			s = strings.TrimSpace(string(it))
		default:
			errs[strconv.Itoa(i)] = []string{"Not a valid string."}
			continue
		}
		switch {
		case s == "":
			errs[strconv.Itoa(i)] = []string{"This field may not be blank."}
		case len([]rune(s)) > max:
			errs[strconv.Itoa(i)] = []string{fmt.Sprintf("Ensure this field has no more than %d characters.", max)}
		}
		out = append(out, s)
	}
	if len(errs) > 0 {
		return nil, errs
	}
	if len(out) < minLen {
		return nil, []string{fmt.Sprintf("Ensure this field has at least %d elements.", minLen)}
	}
	return out, nil
}

// dictField is DictField(required=False): nil when absent.
func dictField(obj map[string]json.RawMessage, name string, errs apperr.Details) map[string]any {
	raw, ok := obj[name]
	if !ok {
		return nil
	}
	if isNull(raw) {
		errs[name] = []string{"This field may not be null."}
		return nil
	}
	var v any
	_ = json.Unmarshal(raw, &v)
	m, isMap := v.(map[string]any)
	if !isMap {
		errs[name] = []string{fmt.Sprintf("Expected a dictionary of items but got type \"%s\".", pyType(v, raw))}
	}
	return m
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
	case map[string]any:
		return "dict"
	}
	return "NoneType"
}

// object reads the body as a JSON object (DRF's "Expected a dictionary").
func object(body []byte) (map[string]json.RawMessage, error) {
	if len(bytes.TrimSpace(body)) == 0 {
		return map[string]json.RawMessage{}, nil
	}
	var obj map[string]json.RawMessage
	if err := json.Unmarshal(body, &obj); err != nil || obj == nil {
		var v any
		if json.Unmarshal(body, &v) == nil {
			return nil, apperr.Field("non_field_errors",
				fmt.Sprintf("Invalid data. Expected a dictionary, but got %s.", pyType(v, body)))
		}
		return nil, apperr.Field("non_field_errors", "Malformed JSON.")
	}
	return obj, nil
}
