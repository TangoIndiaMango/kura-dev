// Package numeric formats Postgres NUMERIC values the way DRF serializes
// DecimalFields: quantized to the field's decimal_places ("12.50", "0.00").
package numeric

import (
	"math/big"

	"github.com/jackc/pgx/v5/pgtype"
)

// Text renders n with exactly `places` decimals; "" for NULL / NaN / inf.
// (pgx drops the scale of zero, so the field's decimal_places is passed in.)
func Text(n pgtype.Numeric, places int) string {
	r := Rat(n)
	if r == nil {
		return ""
	}
	return r.FloatString(places)
}

// Rat is the exact value, or nil when it is not a finite number.
func Rat(n pgtype.Numeric) *big.Rat {
	if !n.Valid || n.NaN || n.InfinityModifier != pgtype.Finite || n.Int == nil {
		return nil
	}
	r := new(big.Rat).SetInt(n.Int)
	scale := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(abs(n.Exp))), nil)
	if n.Exp < 0 {
		return r.Quo(r, new(big.Rat).SetInt(scale))
	}
	return r.Mul(r, new(big.Rat).SetInt(scale))
}

// Float is float(Decimal) (DRF FloatField / Python float()).
func Float(n pgtype.Numeric) float64 {
	f, _ := n.Float64Value()
	return f.Float64
}

func abs(x int32) int32 {
	if x < 0 {
		return -x
	}
	return x
}
