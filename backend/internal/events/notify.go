package events

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/ids"
)

// Channels and severities — same values as notifications.models.Notification.
const (
	InApp = "IN_APP"
	SMS   = "SMS"
	Email = "EMAIL"
	Push  = "PUSH"

	Info     = "INFO"
	Warning  = "WARNING"
	Critical = "CRITICAL"
)

// NotifySpec is one recipient's notification (core NotifySpec).
type NotifySpec struct {
	UserID       uuid.UUID
	Title        string
	Body         string
	Source       string // default "System"
	Severity     string // default INFO
	Channels     []string
	TemplateCode string
	LinkPath     string
	Params       Map
	DedupeKey    string
}

// notify writes one row per allowed channel, honouring dedupe keys.
func notify(ctx context.Context, q *db.Queries, spec NotifySpec) error {
	channels := spec.Channels
	if len(channels) == 0 {
		channels = []string{InApp}
	}
	multi := len(channels) > 1
	channels, err := allowedChannels(ctx, q, spec.UserID, spec.TemplateCode, channels)
	if err != nil {
		return err
	}
	for _, ch := range channels {
		dedupe := spec.DedupeKey
		if dedupe != "" && multi {
			dedupe += ":" + ch
		}
		if err := insertNotification(ctx, q, spec, ch, dedupe); err != nil {
			return err
		}
	}
	return nil
}

func insertNotification(ctx context.Context, q *db.Queries, spec NotifySpec, channel, dedupe string) error {
	if dedupe != "" {
		_, err := q.NotificationByDedupe(ctx, db.NotificationByDedupeParams{UserID: spec.UserID, DedupeKey: dedupe})
		if err == nil {
			return nil // already sent once
		}
		if !database.IsNoRows(err) {
			return fmt.Errorf("notify: dedupe lookup: %w", err)
		}
	}
	params, _ := json.Marshal(orEmpty(spec.Params))
	status := "QUEUED"
	if channel == InApp {
		status = "SENT"
	}
	_, err := q.InsertNotification(ctx, db.InsertNotificationParams{
		ID: ids.New(), UserID: spec.UserID, Channel: channel,
		TemplateCode: spec.TemplateCode, Title: spec.Title, Body: spec.Body,
		Severity: def(spec.Severity, Info), Source: def(spec.Source, "System"),
		Status: status, Params: params, LinkPath: spec.LinkPath, DedupeKey: dedupe,
	})
	if database.IsNoRows(err) { // ON CONFLICT: a concurrent writer won
		return nil
	}
	return err
}

// allowedChannels drops SMS when the rider switched that category off
// (notifications.preferences.allowed_channels). IN_APP is never gated.
func allowedChannels(ctx context.Context, q *db.Queries, user uuid.UUID, template string, channels []string) ([]string, error) {
	category := categoryFor(template)
	if category == "" {
		return channels, nil
	}
	raw, err := q.UserNotificationPrefs(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("notify: prefs: %w", err)
	}
	var prefs map[string]any
	_ = json.Unmarshal(raw, &prefs)
	if on, ok := prefs[category].(bool); !ok || on {
		return channels, nil
	}
	out := channels[:0:0]
	for _, c := range channels {
		if c != SMS {
			out = append(out, c)
		}
	}
	return out, nil
}

var alwaysSend = []string{"auth.", "otp.", "pin.", "phone.", "security.", "account.", "kyc.", "user.", "tariff."}

var exactCategory = map[string]string{
	"swap.completed": "swap_sms", "cash.deposit_receipt": "payment_alerts",
	"plan.purchased": "payment_alerts", "plan.renewed": "payment_alerts",
	"plan.expired": "plan_expiry", "plan.lapsed": "plan_expiry",
}

var prefixCategory = [][2]string{
	{"swap.", "swap_sms"}, {"payment.", "payment_alerts"}, {"receipt.", "payment_alerts"},
	{"wallet.", "payment_alerts"}, {"plan.expir", "plan_expiry"}, {"loan.", "loan_updates"},
}

// categoryFor maps a template to a rider preference category ("" = always).
func categoryFor(template string) string {
	code := strings.ToLower(strings.TrimSpace(template))
	if code == "" {
		return ""
	}
	for _, p := range alwaysSend {
		if strings.HasPrefix(code, p) {
			return ""
		}
	}
	if c, ok := exactCategory[code]; ok {
		return c
	}
	for _, pc := range prefixCategory {
		if strings.HasPrefix(code, pc[0]) {
			return pc[1]
		}
	}
	return ""
}

func def(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}
