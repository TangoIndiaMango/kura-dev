// Package decode reads JSON request bodies and query params into typed
// structs and validates them, producing DRF-shaped VALIDATION_ERROR details.
package decode

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"reflect"
	"strings"
	"sync"

	"github.com/go-playground/validator/v10"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
)

const maxBody = 12 << 20 // 12 MB, same as Django DATA_UPLOAD_MAX_MEMORY_SIZE

var (
	once     sync.Once
	validate *validator.Validate
)

func v() *validator.Validate {
	once.Do(func() {
		validate = validator.New(validator.WithRequiredStructEnabled())
		// notblank is enforced by blankFields (needs the raw body); no-op here.
		_ = validate.RegisterValidation("notblank", func(validator.FieldLevel) bool { return true })
		// Report JSON field names ("phone"), not Go names ("Phone").
		validate.RegisterTagNameFunc(func(f reflect.StructField) string {
			name := strings.SplitN(f.Tag.Get("json"), ",", 2)[0]
			if name == "-" {
				return ""
			}
			return name
		})
	})
	return validate
}

// JSON decodes the body into dst (unknown fields allowed, like DRF) and
// validates `validate:` tags, reporting every field's problem at once like a
// DRF serializer: type errors first (per-field, DRF wording), then blank
// strings, then validators. Strings are trimmed (CharField), and a
// present-but-blank `required`/`notblank` field says "This field may not be
// blank.". Empty body is treated as {}.
func JSON(r *http.Request, dst any) error {
	raw, err := io.ReadAll(http.MaxBytesReader(nil, r.Body, maxBody))
	if err != nil {
		return apperr.Field("non_field_errors", "Invalid request body.")
	}
	if len(strings.TrimSpace(string(raw))) == 0 {
		raw = []byte("{}")
	}
	var obj map[string]json.RawMessage
	if err := json.Unmarshal(raw, &obj); err != nil || obj == nil {
		var other any
		if json.Unmarshal(raw, &other) == nil {
			return apperr.Field("non_field_errors",
				fmt.Sprintf("Invalid data. Expected a dictionary, but got %s.", pyTypeName(other)))
		}
		return apperr.Field("non_field_errors", "Malformed JSON.")
	}
	if !isStruct(dst) { // maps etc.: plain decode, nothing to validate
		if err := json.Unmarshal(raw, dst); err != nil {
			return apperr.Field("non_field_errors", "Invalid request body.")
		}
		return nil
	}
	errs := decodeFields(obj, dst)
	trimStrings(reflect.ValueOf(dst))
	merge(errs, blankFields(obj, dst))
	var verr *apperr.Error
	if err := Struct(dst); errors.As(err, &verr) {
		merge(errs, verr.Details)
	} else if err != nil {
		return err
	}
	if len(errs) > 0 {
		return apperr.Validation(errs)
	}
	return nil
}

func isStruct(dst any) bool {
	v := reflect.ValueOf(dst)
	for v.Kind() == reflect.Pointer && !v.IsNil() {
		v = v.Elem()
	}
	return v.Kind() == reflect.Struct
}

// merge adds field errors for fields that don't have one yet (a field
// reports only its first failing stage, like DRF).
func merge(dst, src apperr.Details) {
	for k, v := range src {
		if _, ok := dst[k]; !ok {
			dst[k] = v
		}
	}
}

// Struct validates a struct (or pointer to one) and maps failures to field
// errors. Maps and other shapes have no tags, so they pass through.
func Struct(dst any) error {
	rv := reflect.ValueOf(dst)
	for rv.Kind() == reflect.Pointer && !rv.IsNil() {
		rv = rv.Elem()
	}
	if rv.Kind() != reflect.Struct {
		return nil
	}
	err := v().Struct(dst)
	if err == nil {
		return nil
	}
	var verrs validator.ValidationErrors
	if !errors.As(err, &verrs) {
		return apperr.Field("non_field_errors", err.Error())
	}
	details := apperr.Details{}
	for _, fe := range verrs {
		field := fe.Field()
		msgs, _ := details[field].([]string)
		details[field] = append(msgs, message(fe))
	}
	return apperr.Validation(details)
}

// message turns a validator tag into DRF's exact sentence.
func message(fe validator.FieldError) string {
	isString := fe.Kind() == reflect.String
	switch fe.Tag() {
	case "required":
		return "This field is required."
	case "email":
		return "Enter a valid email address."
	case "uuid", "uuid4", "uuid7":
		return "Must be a valid UUID."
	case "min":
		if isString {
			return "Ensure this field has at least " + fe.Param() + " characters."
		}
		return "Ensure this value is greater than or equal to " + fe.Param() + "."
	case "max":
		if isString {
			return "Ensure this field has no more than " + fe.Param() + " characters."
		}
		return "Ensure this value is less than or equal to " + fe.Param() + "."
	case "len":
		return "Ensure this field has exactly " + fe.Param() + " characters."
	case "oneof":
		return fmt.Sprintf("\"%v\" is not a valid choice.", fe.Value())
	case "numeric":
		return "Must contain digits only."
	default:
		return "Invalid value."
	}
}

// trimStrings strips surrounding whitespace from every string (and *string)
// field, recursively — DRF CharField(trim_whitespace=True).
func trimStrings(v reflect.Value) {
	for v.Kind() == reflect.Pointer {
		if v.IsNil() {
			return
		}
		v = v.Elem()
	}
	if v.Kind() != reflect.Struct {
		return
	}
	for i := 0; i < v.NumField(); i++ {
		f := v.Field(i)
		if !f.CanSet() {
			continue
		}
		switch {
		case f.Kind() == reflect.String:
			f.SetString(strings.TrimSpace(f.String()))
		case f.Kind() == reflect.Pointer && !f.IsNil() && f.Elem().Kind() == reflect.String:
			f.Elem().SetString(strings.TrimSpace(f.Elem().String()))
		case f.Kind() == reflect.Struct:
			trimStrings(f.Addr())
		}
	}
}

// blankFields finds string fields sent as "" (after trimming) whose tags say
// required or notblank.
func blankFields(present map[string]json.RawMessage, dst any) apperr.Details {
	v := reflect.ValueOf(dst)
	for v.Kind() == reflect.Pointer && !v.IsNil() {
		v = v.Elem()
	}
	if v.Kind() != reflect.Struct {
		return nil
	}
	out := apperr.Details{}
	t := v.Type()
	for i := 0; i < t.NumField(); i++ {
		sf := t.Field(i)
		name := strings.SplitN(sf.Tag.Get("json"), ",", 2)[0]
		tag := sf.Tag.Get("validate")
		// ChoiceFields (oneof) report "" as an invalid choice, not as blank.
		if name == "" || strings.Contains(tag, "oneof") ||
			!(strings.Contains(tag, "required") || strings.Contains(tag, "notblank")) {
			continue
		}
		if _, ok := present[name]; !ok {
			continue
		}
		f := v.Field(i)
		if f.Kind() == reflect.Pointer && !f.IsNil() {
			f = f.Elem()
		}
		if f.Kind() == reflect.String && f.String() == "" {
			out[name] = []string{"This field may not be blank."}
		}
	}
	return out
}

// Keys returns the top-level keys of a JSON object body and restores the
// body for a later decode — for fields that must be present but may be
// null (DRF required + allow_null), which a nil pointer can't express.
func Keys(r *http.Request) map[string]bool {
	raw, err := io.ReadAll(http.MaxBytesReader(nil, r.Body, maxBody))
	r.Body = io.NopCloser(bytes.NewReader(raw))
	keys := map[string]bool{}
	if err != nil {
		return keys
	}
	var obj map[string]json.RawMessage
	if json.Unmarshal(raw, &obj) == nil {
		for k := range obj {
			keys[k] = true
		}
	}
	return keys
}
