// Package listq reads the shared admin list parameters (DRF filter backends):
// ?q= search (TrigramSearchFilter → icontains), exact filters, page/page_size.
package listq

import (
	"net/http"
	"strings"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
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
