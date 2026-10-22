package decode

import (
	"errors"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
)

type sample struct {
	Name    string     `json:"name" validate:"required,max=5"`
	Kind    string     `json:"kind" validate:"required,oneof=A B"`
	Face    uuid.UUID  `json:"face" validate:"required"`
	Consent bool       `json:"consent"`
	Count   int16      `json:"count"`
	Opt     *uuid.UUID `json:"opt"`
	Tags    []string   `json:"tags"`
}

func details(t *testing.T, body string) apperr.Details {
	t.Helper()
	var s sample
	err := JSON(httptest.NewRequest("POST", "/", strings.NewReader(body)), &s)
	if err == nil {
		return nil
	}
	var ae *apperr.Error
	if !errors.As(err, &ae) {
		t.Fatalf("unexpected error %v", err)
	}
	return ae.Details
}

// Every field reports at once, each with DRF's wording for its first failure.
func TestDRFFieldErrors(t *testing.T) {
	got := details(t, `{"name":"  ","kind":"C","face":"nope","consent":"maybe","count":"x","tags":"a"}`)
	want := apperr.Details{
		"name":    []string{"This field may not be blank."},
		"kind":    []string{`"C" is not a valid choice.`},
		"face":    []string{"Must be a valid UUID."},
		"consent": []string{"Must be a valid boolean."},
		"count":   []string{"A valid integer is required."},
		"tags":    []string{`Expected a list of items but got type "str".`},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %v\nwant %v", got, want)
	}
	if got := details(t, `{}`); len(got) != 3 { // name, kind, face required
		t.Fatalf("required: %v", got)
	}
	if got := details(t, `{"name":null,"kind":"A","face":"`+uuid.NewString()+`"}`); !reflect.DeepEqual(got,
		apperr.Details{"name": []string{"This field may not be null."}}) {
		t.Fatalf("null: %v", got)
	}
}

func TestDRFCoercions(t *testing.T) {
	var s sample
	body := `{"name":12,"kind":"A","face":"` + uuid.NewString() + `","consent":"yes","count":"7.0","opt":null}`
	if err := JSON(httptest.NewRequest("POST", "/", strings.NewReader(body)), &s); err != nil {
		t.Fatal(err)
	}
	if s.Name != "12" || !s.Consent || s.Count != 7 || s.Opt != nil {
		t.Fatalf("coerced %+v", s)
	}
	if got := details(t, `[1]`); !reflect.DeepEqual(got, apperr.Details{"non_field_errors": []string{
		"Invalid data. Expected a dictionary, but got list."}}) {
		t.Fatalf("list body: %v", got)
	}
}
