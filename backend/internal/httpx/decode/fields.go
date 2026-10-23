package decode

import (
	"bytes"
	"encoding/json"
	"fmt"
	"reflect"
	"regexp"
	"strconv"
	"strings"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
)

var uuidType = reflect.TypeOf(uuid.UUID{})

// DRF BooleanField TRUE_VALUES / FALSE_VALUES (strings and numbers).
var (
	trueValues  = map[string]bool{"t": true, "y": true, "yes": true, "true": true, "on": true, "1": true}
	falseValues = map[string]bool{"f": true, "n": true, "no": true, "false": true, "off": true, "0": true}
	intPattern  = regexp.MustCompile(`^-?\d+(\.0*)?$`)
)

// decodeFields sets each struct field from its JSON key independently, so a
// bad value in one field doesn't hide the others. Absent keys are left alone.
// null is accepted only by pointer / slice / map fields (allow_null).
func decodeFields(obj map[string]json.RawMessage, dst any) apperr.Details {
	errs := apperr.Details{}
	v := reflect.ValueOf(dst)
	for v.Kind() == reflect.Pointer && !v.IsNil() {
		v = v.Elem()
	}
	if v.Kind() != reflect.Struct {
		return errs
	}
	t := v.Type()
	for i := 0; i < t.NumField(); i++ {
		sf := t.Field(i)
		name := strings.SplitN(sf.Tag.Get("json"), ",", 2)[0]
		raw, ok := obj[name]
		if name == "" || name == "-" || !ok || !sf.IsExported() {
			continue
		}
		f := v.Field(i)
		if bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
			switch f.Kind() {
			case reflect.Pointer, reflect.Slice, reflect.Map, reflect.Interface:
				f.Set(reflect.Zero(f.Type()))
			default:
				errs[name] = []string{"This field may not be null."}
			}
			continue
		}
		if f.Kind() == reflect.Pointer {
			f.Set(reflect.New(f.Type().Elem()))
			f = f.Elem()
		}
		if f.Type() == dateTimeType {
			var val any
			_ = json.Unmarshal(raw, &val)
			if msg := setDateTime(f, val); msg != "" {
				errs[name] = []string{msg}
			}
			continue
		}
		if f.Type() == dateType {
			var val any
			_ = json.Unmarshal(raw, &val)
			if msg := setDate(f, val); msg != "" {
				errs[name] = []string{msg}
			}
			continue
		}
		if f.Type() == decimalType {
			var val any
			_ = json.Unmarshal(raw, &val)
			if msg := setDecimal(f, val, raw, sf.Tag.Get("decimal")); msg != "" {
				errs[name] = []string{msg}
			}
			continue
		}
		if msg := setField(f, raw); msg != "" {
			errs[name] = []string{msg}
		}
	}
	return errs
}

// setField decodes raw into f with DRF's coercions; returns DRF's message on
// failure ("" when ok).
func setField(f reflect.Value, raw json.RawMessage) string {
	var val any
	if err := json.Unmarshal(raw, &val); err != nil {
		return "Invalid value."
	}
	switch {
	case f.Type() == uuidType:
		id, ok := uuidValue(val)
		if !ok {
			return "Must be a valid UUID."
		}
		f.Set(reflect.ValueOf(id))
	case f.Kind() == reflect.String:
		switch x := val.(type) { // CharField: str, or a number rendered as text
		case string:
			f.SetString(x)
		case float64:
			f.SetString(strings.TrimSpace(string(raw)))
		default:
			return "Not a valid string."
		}
	case f.Kind() == reflect.Bool:
		b, ok := boolValue(val)
		if !ok {
			return "Must be a valid boolean."
		}
		f.SetBool(b)
	case f.CanInt():
		n, ok := intValue(val)
		if !ok {
			return "A valid integer is required."
		}
		if f.OverflowInt(n) {
			return fmt.Sprintf("Ensure this value is less than or equal to %d.", maxInt(f.Type().Bits()))
		}
		f.SetInt(n)
	case f.Kind() == reflect.Float64 || f.Kind() == reflect.Float32:
		x, ok := val.(float64)
		if !ok {
			s, isStr := val.(string)
			p, err := strconv.ParseFloat(strings.TrimSpace(s), 64)
			if !isStr || err != nil {
				return "A valid number is required."
			}
			x = p
		}
		f.SetFloat(x)
	case f.Kind() == reflect.Slice && f.Type().Elem().Kind() != reflect.Uint8:
		if _, ok := val.([]any); !ok {
			return fmt.Sprintf("Expected a list of items but got type \"%s\".", pyTypeName(val))
		}
		if err := json.Unmarshal(raw, f.Addr().Interface()); err != nil {
			if f.Type().Elem() == uuidType {
				return "Must be a valid UUID."
			}
			return "Invalid value."
		}
	default:
		if err := json.Unmarshal(raw, f.Addr().Interface()); err != nil {
			return "Invalid value."
		}
	}
	return ""
}

// uuidValue is UUIDField.to_internal_value: a UUID string, or an integer
// read as UUID(int=n).
func uuidValue(v any) (uuid.UUID, bool) {
	switch x := v.(type) {
	case string:
		id, err := uuid.Parse(strings.TrimSpace(x))
		return id, err == nil
	case float64:
		if x < 0 || x != float64(uint64(x)) {
			return uuid.Nil, false
		}
		var id uuid.UUID
		n := uint64(x)
		for i := 15; i >= 8; i-- {
			id[i] = byte(n)
			n >>= 8
		}
		return id, true
	}
	return uuid.Nil, false
}

func boolValue(v any) (bool, bool) {
	switch x := v.(type) {
	case bool:
		return x, true
	case float64:
		if x == 1 {
			return true, true
		}
		if x == 0 {
			return false, true
		}
	case string:
		k := strings.ToLower(strings.TrimSpace(x))
		if trueValues[k] {
			return true, true
		}
		if falseValues[k] {
			return false, true
		}
	}
	return false, false
}

// intValue is IntegerField.to_internal_value: integral numbers or numeric
// strings ("12", "12.0"); bools are rejected.
func intValue(v any) (int64, bool) {
	switch x := v.(type) {
	case float64:
		if x != float64(int64(x)) {
			return 0, false
		}
		return int64(x), true
	case string:
		s := strings.TrimSpace(x)
		if !intPattern.MatchString(s) {
			return 0, false
		}
		n, err := strconv.ParseInt(strings.SplitN(s, ".", 2)[0], 10, 64)
		return n, err == nil
	}
	return 0, false
}

func maxInt(bits int) int64 { return int64(1)<<(bits-1) - 1 }

// pyTypeName is type(x).__name__ for decoded JSON.
func pyTypeName(v any) string {
	switch v.(type) {
	case nil:
		return "NoneType"
	case bool:
		return "bool"
	case float64:
		if x := v.(float64); x == float64(int64(x)) {
			return "int" // json.loads("12") is an int
		}
		return "float"
	case string:
		return "str"
	case []any:
		return "list"
	case map[string]any:
		return "dict"
	}
	return "object"
}
