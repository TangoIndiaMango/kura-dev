package mobility

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
)

// precheck is GET /reservations/precheck/: what would refuse a booking,
// checked before the rider picks a vehicle, hub and PIN (create_reservation
// still enforces it). {ok:false, code, message} when the account can't book;
// otherwise {ok:true, blocked_vehicles:[…]} — vehicles whose pack is overdue.
func (b *Bay) precheck(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid, _ := uuid.Parse(reqctx.User(ctx).UserID)
	d, err := b.q.DriverRowByUser(ctx, uid)
	if database.IsNoRows(err) {
		respond.OK(w, map[string]any{"ok": true}) // nothing to check yet (no driver profile)
		return
	}
	var acct db.AccountsAccount
	if err == nil {
		acct, err = b.q.AccountByID(ctx, d.AccountID)
	}
	var overdue []db.OverdueBatteriesForAccountRow
	if err == nil && acct.Status == "ACTIVE" {
		overdue, err = b.q.OverdueBatteriesForAccount(ctx, acct.ID)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	if acct.Status != "ACTIVE" {
		respond.OK(w, map[string]any{"ok": false, "code": "ACCOUNT_RESTRICTED",
			"message": "Your account is paused, so booking is off for now. Contact support or your cooperative."})
		return
	}
	// The driver's daily limits (set by the account owner) stop every vehicle.
	if lerr := assertWithinLimits(ctx, b.q, d.ID, 0); lerr != nil {
		if e, ok := apperr.As(lerr); ok {
			respond.OK(w, map[string]any{"ok": false, "code": e.Code, "message": e.Message})
			return
		}
		respond.Error(w, r, lerr)
		return
	}
	blocked := make([]map[string]any, 0, len(overdue))
	for _, o := range overdue {
		blocked = append(blocked, map[string]any{"vehicle": o.VehicleID.String(), "plate": o.RegistrationPlate,
			"battery": o.Serial, "code": "BATTERY_UNRETURNED", "message": overdueMessage(o.RegistrationPlate, o.Serial)})
	}
	respond.OK(w, map[string]any{"ok": true, "blocked_vehicles": blocked})
}
