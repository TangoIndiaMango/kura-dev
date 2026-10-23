package decode

import (
	"fmt"
	"reflect"
	"regexp"
	"strconv"
	"strings"
)

// Decimal is a DRF DecimalField value: tag the field `decimal:"5,2"`
// (max_digits, decimal_places). Text is the quantized value ("12.50").
type Decimal struct{ Text string }

var (
	decimalType = reflect.TypeOf(Decimal{})
	decimalRE   = regexp.MustCompile(`^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$`)
)

// setDecimal is DecimalField.to_internal_value + validate_precision.
func setDecimal(f reflect.Value, val any, raw []byte, tag string) string {
	var text string
	switch x := val.(type) {
	case string:
		text = strings.TrimSpace(x)
	case float64:
		text = strings.TrimSpace(string(raw))
	default:
		return "A valid number is required."
	}
	m := decimalRE.FindStringSubmatch(text)
	if m == nil || (m[2] == "" && m[3] == "") {
		return "A valid number is required."
	}
	exp := 0
	if m[4] != "" {
		e, err := strconv.Atoi(m[4])
		if err != nil {
			return "A valid number is required."
		}
		exp = e
	}
	digits := strings.TrimLeft(m[2]+m[3], "0") // Decimal's coefficient tuple
	exp -= len(m[3])
	if digits == "" {
		digits = "0"
	}
	maxDigits, places := 0, 0
	fmt.Sscanf(tag, "%d,%d", &maxDigits, &places)
	var total, whole, dp int
	switch {
	case exp >= 0:
		total, whole, dp = len(digits)+exp, len(digits)+exp, 0
	case len(digits) > -exp:
		total, whole, dp = len(digits), len(digits)+exp, -exp
	default:
		total, whole, dp = -exp, 0, -exp
	}
	switch {
	case maxDigits > 0 && total > maxDigits:
		return fmt.Sprintf("Ensure that there are no more than %d digits in total.", maxDigits)
	case dp > places:
		return fmt.Sprintf("Ensure that there are no more than %d decimal places.", places)
	case maxDigits > 0 && whole > maxDigits-places:
		return fmt.Sprintf("Ensure that there are no more than %d digits before the decimal point.", maxDigits-places)
	}
	// Quantize: pad to `places` decimals (precision checks forbid more).
	full := digits + strings.Repeat("0", max(0, exp))
	frac := ""
	if exp < 0 {
		full = strings.Repeat("0", max(0, -exp-len(digits)+1)) + digits
		frac = full[len(full)+exp:]
		full = full[:len(full)+exp]
	}
	frac += strings.Repeat("0", places-len(frac))
	full = strings.TrimLeft(full, "0")
	if full == "" {
		full = "0"
	}
	out := full
	if places > 0 {
		out += "." + frac
	}
	if m[1] == "-" { // Decimal keeps the sign of zero ("-0" → "-0.00")
		out = "-" + out
	}
	f.Set(reflect.ValueOf(Decimal{Text: out}))
	return ""
}
