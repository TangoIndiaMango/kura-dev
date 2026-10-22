// Package listq reads the shared admin list parameters (DRF filter backends):
// ?q= search (TrigramSearchFilter → icontains), exact filters, page/page_size.
package listq

import (
	"net/http"
	"strings"
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
