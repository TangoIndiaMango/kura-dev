// Package platformcfg ports core.services.config: per-namespace platform
// settings (defaults + the ACTIVE version) with maker-checker propose/approve.
package platformcfg

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
)

// SettingsKey is SETTINGS_KEY.
const SettingsKey = "settings"

// defaults is DEFAULTS (fresh copy per call via JSON round trip).
const defaults = `{
 "credit": {"enabled": false, "score_threshold": 60, "min_active_days": 60, "min_on_time_pct": 80,
  "min_trusted_device_days": 7, "min_amount_kobo": 500000, "max_amount_kobo": 5000000, "tenor_days": [7, 14, 30],
  "interest_rate_bps": 500, "auto_approve_max_kobo": 0, "disbursement": "SWAP_CREDIT", "grace_days": 3,
  "default_after_restricted_days": 7},
 "offers": {"enabled": false},
 "ussd": {"enabled": false, "shortcode": "*347*88#", "session_timeout_seconds": 90, "primary_language": "en",
  "menu": {"1": {"label": "Find hub", "flow": "hubs"}, "2": {"label": "Wallet balance", "flow": "wallet"},
   "3": {"label": "Reserve swap", "flow": "reserve"}}},
 "sms_templates": {"enabled": false, "templates": [
  {"code": "SWAP_CODE", "name": "Swap reservation code", "body": "KURA: your bay code is {code}. Valid {mins} min.",
   "status": "ACTIVE"},
  {"code": "WALLET_CREDIT", "name": "Wallet funded", "body": "KURA: {amount} credited. Bal {balance}.",
   "status": "ACTIVE"}]}
}`

// Caps is NAMESPACE_CAPS.
var Caps = map[string]string{"credit": "credit:approve", "offers": "offers:manage", "ussd": "accounts:manage",
	"sms_templates": "accounts:manage"}

func unknown(ns string) error {
	return apperr.New("CONFIG_NAMESPACE", "Unknown namespace '"+ns+"'.").WithStatus(http.StatusNotFound)
}

// Defaults is defaults_for.
func Defaults(ns string) (map[string]any, error) {
	var all map[string]map[string]any
	_ = json.Unmarshal([]byte(defaults), &all)
	d, ok := all[ns]
	if !ok {
		return nil, unknown(ns)
	}
	return d, nil
}

// Known reports a namespace with defaults.
func Known(ns string) bool {
	_, err := Defaults(ns)
	return err == nil
}

// Effective is get_effective: defaults overlaid by the ACTIVE version.
func Effective(ctx context.Context, q *db.Queries, ns string) (map[string]any, error) {
	base, err := Defaults(ns)
	if err != nil {
		return nil, err
	}
	row, err := q.ActiveConfig(ctx, db.ActiveConfigParams{Namespace: ns, Key: SettingsKey})
	if database.IsNoRows(err) {
		return base, nil
	}
	if err != nil {
		return nil, err
	}
	var v map[string]any
	_ = json.Unmarshal(row.Value, &v)
	for k, x := range v {
		base[k] = x
	}
	return base, nil
}

// truthy is Python bool() on a JSON value.
func truthy(v any) bool {
	switch x := v.(type) {
	case nil:
		return false
	case bool:
		return x
	case float64:
		return x != 0
	case string:
		return x != ""
	case []any:
		return len(x) > 0
	case map[string]any:
		return len(x) > 0
	}
	return true
}

// IsEnabled is is_enabled.
func IsEnabled(ctx context.Context, q *db.Queries, ns string) (bool, error) {
	e, err := Effective(ctx, q, ns)
	if err != nil {
		return false, err
	}
	return truthy(e["enabled"]), nil
}

// RequireEnabled is require_enabled (CREDIT_DISABLED / OFFERS_DISABLED 403).
func RequireEnabled(ctx context.Context, q *db.Queries, ns string) error {
	on, err := IsEnabled(ctx, q, ns)
	if err != nil || on {
		return err
	}
	code := "OFFERS_DISABLED"
	if ns == "credit" {
		code = "CREDIT_DISABLED"
	}
	return apperr.New(code, strings.ToUpper(ns[:1])+strings.ToLower(ns[1:])+" is turned off in platform settings.").
		WithStatus(http.StatusForbidden)
}

// Int reads a numeric setting (JSON numbers decode as float64).
func Int(m map[string]any, k string) int64 {
	switch x := m[k].(type) {
	case float64:
		return int64(x)
	case bool:
		if x {
			return 1
		}
	}
	return 0
}
