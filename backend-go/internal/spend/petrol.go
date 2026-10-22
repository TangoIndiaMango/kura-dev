package spend

import "math"

// Petrol prices the "saved vs petrol" estimate (COOP_PETROL_* settings).
type Petrol struct {
	LitresPerSwap float64
	KoboPerLitre  int64
}

// WithDefaults applies Django's `or` fallbacks (0 → 1.2 L, ₦850/L).
func (p Petrol) WithDefaults() Petrol {
	if p.LitresPerSwap == 0 {
		p.LitresPerSwap = 1.2
	}
	if p.KoboPerLitre == 0 {
		p.KoboPerLitre = 85_000
	}
	return p
}

// FuelSavedKobo is swaps × litres × price, in whole millilitres like Django.
func (p Petrol) FuelSavedKobo(swaps int64) int64 {
	ml := int64(math.RoundToEven(p.LitresPerSwap * 1000))
	return swaps * ml * p.KoboPerLitre / 1000
}
