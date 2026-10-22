// Package decode reads JSON request bodies and query params into typed
// structs and validates them, producing DRF-shaped VALIDATION_ERROR details.
package decode

import (
	"encoding/json"
	"errors"
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
// validates `validate:` tags. Empty body is treated as {}.
func JSON(r *http.Request, dst any) error {
	body := http.MaxBytesReader(nil, r.Body, maxBody)
	dec := json.NewDecoder(body)
	if err := dec.Decode(dst); err != nil && !errors.Is(err, io.EOF) {
		var syn *json.SyntaxError
		var typ *json.UnmarshalTypeError
		switch {
		case errors.As(err, &typ):
			return apperr.Field(typ.Field, "Invalid type.")
		case errors.As(err, &syn):
			return apperr.Field("non_field_errors", "Malformed JSON.")
		default:
			return apperr.Field("non_field_errors", "Invalid request body.")
		}
	}
	return Struct(dst)
}

// Struct validates any struct and maps failures to field errors.
func Struct(dst any) error {
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

// message turns a validator tag into the DRF-style sentence.
func message(fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return "This field is required."
	case "email":
		return "Enter a valid email address."
	case "uuid", "uuid4", "uuid7":
		return "Must be a valid UUID."
	case "min":
		return "Ensure this value is at least " + fe.Param() + "."
	case "max":
		return "Ensure this value is at most " + fe.Param() + "."
	case "len":
		return "Ensure this field has exactly " + fe.Param() + " characters."
	case "oneof":
		return "Must be one of: " + strings.ReplaceAll(fe.Param(), " ", ", ") + "."
	case "numeric":
		return "Must contain digits only."
	default:
		return "Invalid value."
	}
}
