package operations

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
)

var lagosZone, _ = time.LoadLocation("Africa/Lagos")

// AutoCloseShifts is ShiftService.auto_close_stale_shifts: windows still
// open from an earlier Lagos day close with expected cash recorded and the
// count left pending.
func AutoCloseShifts(ctx context.Context, pool *pgxpool.Pool) (map[string]any, error) {
	now := time.Now()
	l := now.In(lagosZone)
	today := time.Date(l.Year(), l.Month(), l.Day(), 0, 0, 0, 0, lagosZone)
	ids, err := db.New(pool).StaleOpenShiftIDs(ctx, today)
	if err != nil {
		return nil, err
	}
	closed := 0
	for _, id := range ids {
		err := database.InTx(ctx, pool, func(tx pgx.Tx) error {
			q := db.New(tx)
			sh, err := q.ShiftForUpdate(ctx, id)
			if err != nil || sh.Status != "OPEN" {
				return err
			}
			deposits, err := q.ShiftDepositTotal(ctx, id)
			if err != nil {
				return err
			}
			hub, err := q.HubRow(ctx, sh.HubID)
			if err != nil {
				return err
			}
			expected := sh.OpeningCashKobo + deposits
			if err := q.AutoCloseShift(ctx, db.AutoCloseShiftParams{ID: id, ExpectedCashKobo: &expected,
				ClosedAt: &now}); err != nil {
				return err
			}
			closed++
			return events.Emit(ctx, q, events.Event{Action: "shift.auto_closed", SubjectType: "shift",
				SubjectID: id.String(), SubjectLabel: hub.Code + " · auto-closed",
				After: events.Map{"expected_cash_kobo": expected, "status": "CLOSED"},
				Notify: []events.NotifySpec{{UserID: sh.AgentID, Title: "Duty window closed for the day",
					Body: fmt.Sprintf("%s: expected cash %s. Count your drawer with ops to record it.", hub.Code,
						finance.FormatNaira(expected)),
					Source: "Shifts", Severity: events.Info, LinkPath: "/payments/cash/" + id.String(),
					TemplateCode: "shift.auto_closed", DedupeKey: "shift.auto_closed:" + id.String()}}})
		})
		if err != nil {
			return nil, err
		}
	}
	return map[string]any{"auto_closed": closed}, nil
}

// SettlementSweep is CashSettlementService.run_settlement_sweep: flag
// unlodged float and drawer variance on shifts closed over staleHours ago,
// total open-shift float, and escalate day-old cash alerts.
func SettlementSweep(ctx context.Context, pool *pgxpool.Pool, staleHours int) (map[string]any, error) {
	q := db.New(pool)
	cutoff := time.Now().Add(-time.Duration(max(1, staleHours)) * time.Hour)
	shifts, err := q.ClosedShiftsBefore(ctx, &cutoff)
	if err != nil {
		return nil, err
	}
	unlodged, variance := 0, 0
	for _, s := range shifts {
		deposits, err := q.ShiftDepositTotal(ctx, s.ID)
		if err != nil {
			return nil, err
		}
		hub := s.HubID
		if deposits > 0 && s.LodgedAt == nil {
			unlodged++
			prefix := "unlodged:" + s.ID.String() + ":"
			if err := openAlert(ctx, q, &hub, "SETTLEMENT_MISMATCH", "WARNING", prefix, fmt.Sprintf(
				"%s %s still has %s agent float unlodged after %dh.", prefix, s.HubCode, finance.FormatNaira(deposits),
				staleHours)); err != nil {
				return nil, err
			}
		}
		if s.VarianceKobo != nil && abs(*s.VarianceKobo) >= VarianceFlagKobo {
			v := *s.VarianceKobo
			sev := "WARNING"
			if abs(v) >= 50_000 {
				sev = "CRITICAL"
			}
			prefix := "shift-var:" + s.ID.String() + ":"
			if err := openAlert(ctx, q, &hub, "SHIFT_CASH_VARIANCE", sev, prefix, fmt.Sprintf(
				"%s %s drawer variance %s (expected %s, counted %s).", prefix, s.HubCode, finance.FormatNaira(v),
				finance.FormatNaira(orZero(s.ExpectedCashKobo)), finance.FormatNaira(orZero(s.ClosingCashKobo)))); err != nil {
				return nil, err
			}
			variance++
		}
	}
	float, err := q.OpenShiftFloat(ctx)
	if err != nil {
		return nil, err
	}
	stale, err := q.EscalatableAlertIDs(ctx, time.Now().Add(-24*time.Hour))
	if err != nil {
		return nil, err
	}
	for _, id := range stale {
		if err := q.EscalateAlert(ctx, id); err != nil {
			return nil, err
		}
	}
	return map[string]any{"closed_scanned": len(shifts), "unlodged_flagged": unlodged, "variance_reswept": variance,
		"alerts_auto_escalated": len(stale), "open_shift_float_kobo": float}, nil
}

func orZero(p *int64) int64 {
	if p == nil {
		return 0
	}
	return *p
}
