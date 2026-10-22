// Package paginate implements Django's two list shapes:
//
//   - Cursor (feeds: swaps, payments, activity, audit) — keyset on
//     (created_at DESC, id DESC); response {"results","next","previous"}.
//   - Page (small admin catalogues) — LIMIT/OFFSET with a count; response
//     {"count","page_size","current_page","total_pages","next","previous","results"}.
//
// The cursor token is opaque to clients (they follow next/previous URLs).
package paginate

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
)

const (
	DefaultSize = 10
	MaxSize     = 100
)

// Size reads ?page_size (default 10, max 100) like DRF.
func Size(r *http.Request) int {
	n, err := strconv.Atoi(r.URL.Query().Get("page_size"))
	if err != nil || n <= 0 {
		return DefaultSize
	}
	if n > MaxSize {
		return MaxSize
	}
	return n
}

// Key is a keyset position: the last row's (created_at, id).
type Key struct {
	CreatedAt time.Time `json:"t"`
	ID        string    `json:"i"`
	// Back marks a "previous" cursor (walk ascending, then reverse).
	Back bool `json:"b,omitempty"`
}

// Cursor is the decoded ?cursor (nil = first page).
func Cursor(r *http.Request) (*Key, error) {
	raw := r.URL.Query().Get("cursor")
	if raw == "" {
		return nil, nil
	}
	b, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil {
		return nil, apperr.NotFound("Invalid cursor")
	}
	var k Key
	if err := json.Unmarshal(b, &k); err != nil || k.ID == "" {
		return nil, apperr.NotFound("Invalid cursor")
	}
	return &k, nil
}

func encode(k Key) string {
	b, _ := json.Marshal(k)
	return base64.RawURLEncoding.EncodeToString(b)
}

// CursorPage is the feed response body.
type CursorPage[T any] struct {
	Results  []T     `json:"results"`
	Next     *string `json:"next"`
	Previous *string `json:"previous"`
}

// BuildCursorPage takes up to size+1 rows fetched in display order (newest
// first) and builds next/previous links. keyOf returns a row's position.
func BuildCursorPage[T any](r *http.Request, rows []T, size int, at *Key, keyOf func(T) Key) CursorPage[T] {
	hasMore := len(rows) > size
	if hasMore {
		rows = rows[:size]
	}
	if rows == nil {
		rows = []T{}
	}
	page := CursorPage[T]{Results: rows}
	forward := at == nil || !at.Back
	if len(rows) > 0 && (hasMore || !forward) {
		k := keyOf(rows[len(rows)-1])
		page.Next = link(r, "cursor", encode(k))
	}
	if len(rows) > 0 && at != nil && (forward || hasMore) {
		k := keyOf(rows[0])
		k.Back = true
		page.Previous = link(r, "cursor", encode(k))
	}
	return page
}

// NumberPage is the admin-table response body.
type NumberPage[T any] struct {
	Count       int     `json:"count"`
	PageSize    int     `json:"page_size"`
	CurrentPage int     `json:"current_page"`
	TotalPages  int     `json:"total_pages"`
	Next        *string `json:"next"`
	Previous    *string `json:"previous"`
	Results     []T     `json:"results"`
}

// Page reads ?page (1-based). Out-of-range pages are 404 like DRF.
func Page(r *http.Request) int {
	n, err := strconv.Atoi(r.URL.Query().Get("page"))
	if err != nil || n < 1 {
		return 1
	}
	return n
}

// Offset is the SQL OFFSET for page/size.
func Offset(page, size int) int { return (page - 1) * size }

// BuildNumberPage assembles the page body; total is the full COUNT(*).
func BuildNumberPage[T any](r *http.Request, rows []T, total, page, size int) (NumberPage[T], error) {
	pages := (total + size - 1) / size
	if pages == 0 {
		pages = 1
	}
	if page > pages {
		return NumberPage[T]{}, apperr.NotFound("Invalid page.")
	}
	if rows == nil {
		rows = []T{}
	}
	out := NumberPage[T]{Count: total, PageSize: size, CurrentPage: page, TotalPages: pages, Results: rows}
	if page < pages {
		out.Next = link(r, "page", strconv.Itoa(page+1))
	}
	if page == 2 {
		out.Previous = linkWithout(r, "page") // DRF drops page=1
	} else if page > 2 {
		out.Previous = link(r, "page", strconv.Itoa(page-1))
	}
	return out, nil
}

// linkWithout rebuilds the absolute request URL without one query param.
func linkWithout(r *http.Request, key string) *string {
	q := r.URL.Query()
	q.Del(key)
	return absolute(r, q)
}

// link rebuilds the absolute request URL with one query param replaced.
func link(r *http.Request, key, value string) *string {
	q := r.URL.Query()
	q.Set(key, value)
	return absolute(r, q)
}

func absolute(r *http.Request, q url.Values) *string {
	scheme := "http"
	if r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	u := url.URL{Scheme: scheme, Host: r.Host, Path: r.URL.Path, RawQuery: q.Encode()}
	s := u.String()
	return &s
}
