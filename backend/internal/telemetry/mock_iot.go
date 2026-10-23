package telemetry

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"math"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
)

// stableUnit is _stable_unit: a deterministic [0, 1] from a key.
func stableUnit(key string) float64 {
	sum := sha256.Sum256([]byte(key))
	n, _ := strconv.ParseUint(hex.EncodeToString(sum[:])[:8], 16, 64)
	return float64(n) / 0xFFFFFFFF
}

func round(x float64, places int) float64 {
	v, _ := strconv.ParseFloat(strconv.FormatFloat(x, 'f', places, 64), 64)
	return v
}

// MockTick is tick_mock_iot: one fake OEM reading (SoC drain + an orbiting
// GPS fix) per ACTIVE vehicle carrying an ISSUED pack. Dev / demo only.
func MockTick(ctx context.Context, pool *pgxpool.Pool, enabled bool, limit int) (map[string]any, error) {
	if !enabled {
		return map[string]any{"updated": 0, "batch": "", "disabled": true}, nil
	}
	q := db.New(pool)
	rows, err := q.MockIoTVehicles(ctx, int32(limit))
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	batch := "mock-iot-tick:" + now.Format("20060102150405")
	for _, v := range rows {
		drain := 1 + int32(stableUnit("drain:"+v.Serial)*3)
		soc := int64(max(5, v.ChargePct-drain))
		var baseLat, baseLng float64
		if fix, err := q.LastVehicleFix(ctx, v.ID); err == nil {
			baseLat, baseLng = fix.Lat, fix.Lng
		} else if !database.IsNoRows(err) {
			return nil, err
		} else if hub, err := q.FirstOnlineHub(ctx); err == nil {
			baseLat = hub.Lat + (stableUnit("hub:"+v.Serial)-0.5)*0.02
			baseLng = hub.Lng + (stableUnit("hub2:"+v.Serial)-0.5)*0.02
		} else if database.IsNoRows(err) {
			baseLat, baseLng = 6.5244, 3.3792
		} else {
			return nil, err
		}
		angle := stableUnit("ang:"+v.Serial+":"+time.Now().UTC().Format("200601021504")) * 2 * math.Pi
		radius := 0.0015 + stableUnit("rad:"+v.Serial)*0.0025
		lat, lng := round(baseLat+math.Cos(angle)*radius, 6), round(baseLng+math.Sin(angle)*radius, 6)
		speed := round(8+stableUnit("spd:"+v.Serial)*25, 1)
		ts := time.Now()
		row := map[string]any{"vehicle_id": v.ID.String(), "battery_serial": v.Serial, "soc": soc,
			"gps": map[string]any{"lat": lat, "lng": lng}, "speed": speed, "ts": jsontime.FormatISO(ts)}
		in := Input{VehicleID: v.ID, RecordedAt: &ts, BatteryPct: &soc, Lat: &lat, Lng: &lng, SpeedKmh: &speed,
			IngestBatch: batch, Raw: map[string]any{"vendor": row}, Provider: "MOCK_IOT", Kind: "SOC_UPDATE",
			BatterySerial: v.Serial}
		if err := database.InTx(ctx, pool, func(tx pgx.Tx) error {
			_, err := Ingest(ctx, db.New(tx), in, nil)
			return err
		}); err != nil {
			return nil, err
		}
	}
	return map[string]any{"updated": len(rows), "batch": batch}, nil
}
