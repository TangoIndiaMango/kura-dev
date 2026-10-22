package events_test

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/canonjson"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/testkit"
)

func TestEmitChainsAuditAndDedupesNotifications(t *testing.T) {
	pool := testkit.DB(t)
	ctx := context.Background()
	user := testkit.CreateUser(t, pool, testkit.User{Email: "ops@test.eco", Role: "OPS_MANAGER"})

	emit := func(action string) {
		err := database.InTx(ctx, pool, func(tx pgx.Tx) error {
			return events.Emit(ctx, db.New(tx), events.Event{
				Action: action, SubjectType: "USER", SubjectID: user.String(),
				Actor: &events.Actor{ID: user, Email: "ops@test.eco", Role: "OPS_MANAGER"},
				Notify: []events.NotifySpec{{UserID: user, Title: "Hi", TemplateCode: "auth.x",
					DedupeKey: "same-key"}},
			})
		})
		if err != nil {
			t.Fatal(err)
		}
	}
	emit("first")
	emit("second")

	rows, _ := pool.Query(ctx, `SELECT subject_type, prev_hash, row_hash FROM audit_auditevent ORDER BY created_at`)
	type row struct{ Type, Prev, Hash string }
	got, err := pgx.CollectRows(rows, pgx.RowToStructByPos[row])
	if err != nil || len(got) != 2 {
		t.Fatalf("want 2 audit rows, got %d (%v)", len(got), err)
	}
	if got[0].Type != "user" || got[0].Prev != "" || len(got[0].Hash) != 64 {
		t.Fatalf("first row wrong: %+v", got[0])
	}
	if got[1].Prev != got[0].Hash {
		t.Fatalf("chain broken: prev %q != tip %q", got[1].Prev, got[0].Hash)
	}
	if n := testkit.Count(t, pool, `SELECT count(*) FROM notifications_notification`); n != 1 {
		t.Fatalf("dedupe failed: %d notifications", n)
	}
}

func TestSMSGatedByRiderPreference(t *testing.T) {
	pool := testkit.DB(t)
	ctx := context.Background()
	rider := testkit.CreateUser(t, pool, testkit.User{Phone: "+2348010000001",
		Prefs: `{"swap_sms": false}`})
	err := database.InTx(ctx, pool, func(tx pgx.Tx) error {
		return events.Emit(ctx, db.New(tx), events.Event{
			Action: "swap.completed", SubjectType: "swap", SubjectID: "s1",
			Notify: []events.NotifySpec{{UserID: rider, Title: "Swap done",
				TemplateCode: "swap.completed", Channels: []string{events.InApp, events.SMS}}},
		})
	})
	if err != nil {
		t.Fatal(err)
	}
	if n := testkit.Count(t, pool, `SELECT count(*) FROM notifications_notification WHERE channel = 'SMS'`); n != 0 {
		t.Fatalf("SMS should be gated off, got %d", n)
	}
	if n := testkit.Count(t, pool, `SELECT count(*) FROM notifications_notification WHERE channel = 'IN_APP'`); n != 1 {
		t.Fatalf("in-app must always send, got %d", n)
	}
}

// Go-written rows are reproducible: the hash is recomputable from stored columns.
func TestAuditHashIsRecomputable(t *testing.T) {
	pool := testkit.DB(t)
	ctx := context.Background()
	err := database.InTx(ctx, pool, func(tx pgx.Tx) error {
		return events.Emit(ctx, db.New(tx), events.Event{Action: "x.y", SubjectType: "thing",
			SubjectID: "42", SubjectLabel: "Thing \u20a6", After: events.Map{"n": 1}})
	})
	if err != nil {
		t.Fatal(err)
	}
	var action, stype, sid, label, email, prev, hash string
	var created time.Time
	var before, after, meta map[string]any
	err = pool.QueryRow(ctx, `SELECT action, subject_type, subject_id, subject_label, actor_email,
		before, after, metadata, prev_hash, row_hash, created_at FROM audit_auditevent`).
		Scan(&action, &stype, &sid, &label, &email, &before, &after, &meta, &prev, &hash, &created)
	if err != nil {
		t.Fatal(err)
	}
	body := map[string]any{"action": action, "subject_type": stype, "subject_id": sid,
		"subject_label": label, "actor_email": email, "before": before, "after": after,
		"metadata": meta, "prev_hash": prev,
		"occurred_at": created.UTC().Format("2006-01-02T15:04:05.000000") + "+00:00"}
	canon, _ := canonjson.Marshal(body)
	sum := sha256.Sum256(canon)
	if hex.EncodeToString(sum[:]) != hash {
		t.Fatalf("stored hash not reproducible from %s", canon)
	}
}
