package psp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

var client = &http.Client{Timeout: 20 * time.Second}

// requestJSON is core.helpers.http_client.request_json: one outbound JSON
// call, never logging secrets. Non-2xx and transport failures are *Error.
func requestJSON(ctx context.Context, provider, method, url string, headers map[string]string, body any) (map[string]any, error) {
	var rdr io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		rdr = bytes.NewReader(raw)
	}
	method = strings.ToUpper(method)
	req, err := http.NewRequestWithContext(ctx, method, url, rdr)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "KuraBackend/1.0") // Cloudflare rejects default agents
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	slog.InfoContext(ctx, "outbound_http", "provider", provider, "method", method, "url", url, "has_body", body != nil)
	resp, err := client.Do(req)
	if err != nil {
		slog.WarnContext(ctx, "outbound_http_unreachable", "provider", provider, "method", method, "url", url)
		return nil, &Error{Message: provider + " unreachable."}
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		slog.WarnContext(ctx, "outbound_http_error", "provider", provider, "method", method, "url", url,
			"status_code", resp.StatusCode)
		text := string(raw)
		if len(text) > 500 {
			text = text[:500]
		}
		return nil, &Error{Message: fmt.Sprintf("%s %s failed (%d).", provider, method, resp.StatusCode),
			Status: resp.StatusCode, Body: text}
	}
	var parsed any
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &parsed); err != nil {
			return nil, &Error{Message: provider + " returned non-JSON."}
		}
	}
	if m, ok := parsed.(map[string]any); ok {
		return m, nil
	}
	if parsed == nil {
		return map[string]any{}, nil
	}
	return map[string]any{"data": parsed}, nil
}

// asMap returns payload["data"] when it is an object, else {"data": v}.
func dataOf(payload map[string]any) map[string]any {
	if d, ok := payload["data"].(map[string]any); ok {
		return d
	}
	return map[string]any{"data": payload["data"]}
}

// pyStr is Python's str(x or "") for JSON values.
func pyStr(v any) string {
	switch t := v.(type) {
	case nil:
		return ""
	case string:
		return t
	case bool:
		if t {
			return "True"
		}
		return ""
	case float64:
		if t == 0 {
			return ""
		}
		if t == float64(int64(t)) {
			return fmt.Sprintf("%d", int64(t))
		}
		return fmt.Sprint(t)
	}
	return fmt.Sprint(v)
}

// truthy is Python truthiness for decoded JSON.
func truthy(v any) bool {
	switch t := v.(type) {
	case nil:
		return false
	case bool:
		return t
	case string:
		return t != ""
	case float64:
		return t != 0
	case map[string]any:
		return len(t) > 0
	case []any:
		return len(t) > 0
	}
	return true
}
