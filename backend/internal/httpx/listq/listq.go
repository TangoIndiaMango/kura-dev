// Package listq reads the shared admin list parameters (DRF filter backends):
// ?q= search (TrigramSearchFilter → icontains), exact filters, page/page_size.
package listq

import (
	"net/http"
	"strings"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/google/uuid"
)

// Search returns the escaped ?q= term for `ILIKE '%' || $q || '%'`, or nil
// when absent. % and _ are escaped so they match literally (Django icontains).
func Search(r *http.Request) *string {
	term := strings.TrimSpace(r.URL.Query().Get("q"))
	if term == "" {
		return nil
	}
	esc := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(term)
	return &esc
}

// Exact returns a trimmed exact-match filter value, or nil when absent.
func Exact(r *http.Request, name string) *string {
	v := strings.TrimSpace(r.URL.Query().Get(name))
	if v == "" {
		return nil
	}
	return &v
}

// Choice is django-filter's ChoiceFilter (filterset_fields on a field with
// choices): absent/empty means no filter, anything else must be one of the
// choices exactly (not trimmed), else a 400 like the form error.
func Choice(r *http.Request, name string, choices ...string) (*string, error) {
	v := r.URL.Query().Get(name)
	if v == "" {
		return nil, nil
	}
	for _, c := range choices {
		if v == c {
			return &v, nil
		}
	}
	return nil, apperr.Field(name, "Select a valid choice. "+v+" is not one of the available choices.")
}

// Merge combines several filter errors into one 400 with every field's
// message, like a django-filter form reporting all invalid fields at once.
func Merge(errs ...error) error {
	d := apperr.Details{}
	for _, err := range errs {
		e, ok := apperr.As(err)
		if !ok {
			if err != nil {
				return err
			}
			continue
		}
		for k, v := range e.Details {
			d[k] = v
		}
	}
	if len(d) == 0 {
		return nil
	}
	return apperr.Validation(d)
}

// Model is django-filter's ModelChoiceFilter: absent means no filter; the
// value must parse and exist, else the form's "Select a valid choice" error.
func Model(r *http.Request, name string, exists func(uuid.UUID) (bool, error)) (*uuid.UUID, error) {
	raw := r.URL.Query().Get(name)
	if raw == "" {
		return nil, nil
	}
	bad := apperr.Field(name, "Select a valid choice. That choice is not one of the available choices.")
	id, err := uuid.Parse(strings.TrimSpace(raw))
	if err != nil {
		return nil, bad
	}
	ok, err := exists(id)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, bad
	}
	return &id, nil
}

// NullBool is django-filter's BooleanFilter (NullBooleanSelect): only
// true/false/True/False filter; anything else is ignored.
func NullBool(r *http.Request, name string) *bool {
	t, f := true, false
	switch r.URL.Query().Get(name) {
	case "true", "True":
		return &t
	case "false", "False":
		return &f
	}
	return nil
}
