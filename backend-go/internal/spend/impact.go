package spend

import (
	"context"
	"fmt"
	"math/big"
	"strconv"
	"time"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
)

// Disclaimer is analytics.services.impact.DISCLAIMER.
const Disclaimer = "Estimate from swap energy vs configured petrol price — not a bank balance."

// co2KgPerLitre is CO2_KG_PER_LITRE ("2.31").
var co2KgPerLitre = big.NewRat(231, 100)

// Impact is account_impact: the owner's savings estimate.
type Impact struct {
	SwapsCompleted int32   `json:"swaps_completed"`
	SavedKobo      int64   `json:"saved_vs_petrol_kobo"`
	SavedSince     *string `json:"saved_since"`
	SwapsPerWeek   string  `json:"swaps_per_week"`
	CO2KgEst       string  `json:"co2_kg_est"`
	Disclaimer     string  `json:"disclaimer"`
}

// NoImpact is the body for a caller without an account.
func NoImpact() Impact {
	return Impact{SwapsPerWeek: "0.0", CO2KgEst: "0", Disclaimer: Disclaimer}
}

// AccountImpact counts completed swaps and prices them against petrol.
func AccountImpact(ctx context.Context, q *db.Queries, account uuid.UUID, p Petrol, now time.Time) (Impact, error) {
	row, err := q.SwapImpact(ctx, account)
	if err != nil {
		return Impact{}, err
	}
	out := Impact{SwapsCompleted: row.Swaps, SavedKobo: p.FuelSavedKobo(int64(row.Swaps)),
		CO2KgEst: p.co2(row.Swaps), Disclaimer: Disclaimer}
	weeks := 1.0
	if row.HasFirst {
		first := DateOf(row.FirstAt.In(Lagos))
		iso := first.ISO()
		out.SavedSince = &iso
		days := max(1, first.DaysUntil(LagosToday(now))+1)
		weeks = max(float64(days)/7.0, 1.0)
	}
	out.SwapsPerWeek = strconv.FormatFloat(float64(row.Swaps)/weeks, 'f', 1, 64)
	return out, nil
}

// co2 is Decimal(str(litres)) × swaps × 2.31, quantized to 0.001.
func (p Petrol) co2(swaps int32) string {
	litres, ok := new(big.Rat).SetString(strconv.FormatFloat(p.LitresPerSwap, 'f', -1, 64))
	if !ok {
		return "0.000"
	}
	v := new(big.Rat).Mul(litres, new(big.Rat).SetInt64(int64(swaps)))
	v.Mul(v, co2KgPerLitre)
	return fmt.Sprint(v.FloatString(3))
}
