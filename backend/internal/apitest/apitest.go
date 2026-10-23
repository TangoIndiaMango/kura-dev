// Package apitest drives the real HTTP app against the test database, so
// tests exercise routing, middleware, auth and handlers together.
package apitest

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/app"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/config"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/testkit"
)

// Client calls the in-process app.
type Client struct {
	t    *testing.T
	h    http.Handler
	Pool *pgxpool.Pool
}

// Response is a decoded JSON reply.
type Response struct {
	Status int
	Body   map[string]any
	Header http.Header
}

// New builds the app on an empty test database (DEBUG on: dev OTP accepted).
func New(t *testing.T) *Client {
	t.Helper()
	pool := testkit.DB(t)
	cfg := config.Config{
		Env: "local", Debug: true, SecretKey: "test-secret-key-0123456789abcdef-test",
		AccessTTL: 15 * time.Minute, RefreshTTL: 720 * time.Hour, OTPDevCode: "123456",
	}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	return &Client{t: t, h: app.Build(cfg, log, pool), Pool: pool}
}

// Do sends method+path with an optional JSON body and bearer token.
func (c *Client) Do(method, path string, body any, token string) Response {
	c.t.Helper()
	var rdr io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rdr = bytes.NewReader(b)
	}
	req := httptest.NewRequest(method, path, rdr)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	c.h.ServeHTTP(rec, req)
	out := Response{Status: rec.Code, Header: rec.Header(), Body: map[string]any{}}
	_ = json.Unmarshal(rec.Body.Bytes(), &out.Body)
	return out
}

// Expect fails the test unless the status matches; returns the body.
func (r Response) Expect(t *testing.T, status int) map[string]any {
	t.Helper()
	if r.Status != status {
		t.Fatalf("status %d, want %d: %v", r.Status, status, r.Body)
	}
	return r.Body
}

// ErrorCode returns error.code from an envelope ("" if none).
func (r Response) ErrorCode() string {
	e, _ := r.Body["error"].(map[string]any)
	code, _ := e["code"].(string)
	return code
}

// Str reads a top-level string field.
func (r Response) Str(key string) string {
	s, _ := r.Body[key].(string)
	return s
}
