package mobility

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
)

// precheck is GET /reservations/precheck/: the account-wide rules that would
// refuse a booking, checked before the rider picks a vehicle, hub and PIN
// (create_reservation still enforces them). 200 {ok} or {ok:false, code, message}.
func (b *Bay) precheck(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid, _ := uuid.Parse(reqctx.User(ctx).UserID)
	d, err := b.q.DriverRowByUser(ctx, uid)
	if database.IsNoRows(err) {
		respond.OK(w, map[string]any{"ok": true}) // nothing to check yet (no driver profile)
		return
	}
	var blocked error
	if err == nil {
		acct, aerr := b.q.AccountByID(ctx, d.AccountID)
		switch {
		case aerr != nil:
			err = aerr
		case acct.Status != "ACTIVE":
			blocked = apperr.Conflict("ACCOUNT_RESTRICTED",
				"Your account is paused, so booking is off for now. Contact support or your cooperative.")
		default:
			blocked = assertNoOverdue(ctx, b.q, acct.ID)
		}
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	if e, ok := apperr.As(blocked); ok {
		respond.OK(w, map[string]any{"ok": false, "code": e.Code, "message": e.Message})
		return
	}
	if blocked != nil {
		respond.Error(w, r, blocked)
		return
	}
	respond.OK(w, map[string]any{"ok": true})
}
