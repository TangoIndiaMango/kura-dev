// Package events is the Go port of core.services.events.emit_event: append a
// hash-chained audit row, then fan out notifications — inside the caller's
// transaction, so a failed mutation leaves neither behind.
package events

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/netip"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/canonjson"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

// Actor is who performed the action (nil for system jobs).
type Actor struct {
	ID    uuid.UUID
	Email string
	Phone string
	Role  string
}

// Map is a JSON object (before/after/metadata/params).
type Map = map[string]any

// record appends one audit row, chained to the current tip. Mirrors
// audit.services.AuditService.record. The hashed occurred_at is the stored
// created_at, so (unlike Django) each Go-written hash can be recomputed.
func record(ctx context.Context, q *db.Queries, ev Event) error {
	if err := q.LockAuditChain(ctx); err != nil {
		return fmt.Errorf("audit: lock: %w", err)
	}
	prev, err := q.AuditChainTip(ctx)
	if err != nil && !database.IsNoRows(err) {
		return fmt.Errorf("audit: tip: %w", err)
	}

	subjectType := strings.ToLower(strings.TrimSpace(ev.SubjectType))
	actorEmail, actorRole := "", ""
	var actorID *uuid.UUID
	if ev.Actor != nil {
		actorEmail = ev.Actor.Email
		if actorEmail == "" {
			actorEmail = ev.Actor.Phone
		}
		actorRole = ev.Actor.Role
		if ev.Actor.ID != uuid.Nil {
			id := ev.Actor.ID
			actorID = &id
		}
	}
	now := time.Now().UTC()
	body := Map{
		"action": ev.Action, "subject_type": subjectType, "subject_id": ev.SubjectID,
		"subject_label": ev.SubjectLabel, "actor_email": actorEmail,
		"before": orEmpty(ev.Before), "after": orEmpty(ev.After),
		"metadata": orEmpty(ev.Metadata), "prev_hash": prev,
		"occurred_at": jsontime.FormatISO(now),
	}
	canon, err := canonjson.Marshal(body)
	if err != nil {
		return err
	}
	sum := sha256.Sum256(canon)

	before, _ := json.Marshal(orEmpty(ev.Before))
	after, _ := json.Marshal(orEmpty(ev.After))
	meta, _ := json.Marshal(orEmpty(ev.Metadata))
	return q.InsertAuditEvent(ctx, db.InsertAuditEventParams{
		ID: ids.New(), CreatedAt: now, ActorID: actorID, ActorEmail: actorEmail,
		ActorRole: actorRole, Action: ev.Action, SubjectType: subjectType,
		SubjectID: ev.SubjectID, SubjectLabel: ev.SubjectLabel,
		Before: before, After: after, Metadata: meta,
		IpAddress: clientAddr(ctx), RequestID: reqctx.RequestID(ctx),
		PrevHash: prev, RowHash: hex.EncodeToString(sum[:]),
	})
}

func orEmpty(m Map) Map {
	if m == nil {
		return Map{}
	}
	return m
}

func clientAddr(ctx context.Context) *netip.Addr {
	ip, err := netip.ParseAddr(reqctx.ClientIP(ctx))
	if err != nil {
		return nil
	}
	return &ip
}
