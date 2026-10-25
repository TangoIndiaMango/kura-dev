package respond

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

// duplicateFallback is what a person sees when a unique clash has no
// specific message: say what likely happened and what to do next.
const duplicateFallback = "This was already saved, so it can't be saved again. Refresh and try again — " +
	"if it keeps happening, contact support."

// duplicateMessages turns a unique constraint into a sentence a rider, agent
// or admin can act on (instead of "A record with this value already exists").
var duplicateMessages = map[string]string{
	// Batteries, slots and vehicles — custody clashes at the bay.
	"mobility_hubslot_battery_id_key":               "That battery is already in a hub slot. Refresh, and ask the hub to check where the pack is.",
	"mobility_vehicle_current_battery_id_key":       "That battery is already fitted to another vehicle. Check the serial and try again.",
	"mobility_battery_serial_key":                   "A battery with this serial already exists.",
	"mobility_hubslot_hub_id_slot_no_3cd12b27_uniq": "This hub already has a slot with that number.",
	"mobility_vehicle_registration_plate_key":       "A vehicle with this registration is already on Kura.",
	"mobility_vehicle_hardware_id_key":              "This tracker is already linked to another vehicle.",
	"mobility_vehicle_petrol_engine_id_key":         "This engine is already linked to another vehicle.",
	"mobility_eboarder_serial_key":                  "An e-boarder with this serial already exists.",
	"mobility_eboarder_vehicle_id_key":              "This vehicle already has an e-boarder.",
	"mobility_petrolengine_tag_key":                 "An engine with this tag already exists.",
	"mobility_retrofit_petrol_engine_id_key":        "This engine already has a retrofit.",
	"uniq_open_vehicle_assignment":                  "This vehicle is already assigned to a driver. End that assignment first.",
	"uniq_active_subscription_per_vehicle":          "This vehicle already has an active plan.",

	// Bookings and bay sessions.
	"mobility_swap_reservation_id_key":  "This booking already has a swap session. Continue it from the hub's open sessions.",
	"uniq_swap_client_event_id_nonzero": "This swap was already started. Refresh to continue it.",
	"mobility_reservation_code_key":     "We couldn't create a booking code. Please try again.",
	"operations_override_swap_id_key":   "This session already has a supervisor override.",

	// Money: a retry of something that already went through.
	"finance_payment_idempotency_key_key":             "This payment was already recorded. Refresh to see it.",
	"finance_payment_psp_reference_key":               "This payment was already recorded. Refresh to see it.",
	"finance_payment_receipt_code_key":                "We couldn't issue a receipt number. Please try again.",
	"finance_ledgertransaction_reference_key":         "This payment step was already recorded. Refresh to see the latest state.",
	"finance_walletcheckout_reference_key":            "This payment link was already created. Refresh to use it.",
	"operations_cashdeposit_idempotency_key_key":      "This cash was already recorded. Refresh to see it.",
	"operations_cashdeposit_receipt_code_key":         "We couldn't issue a receipt number. Please try again.",
	"mobility_discountredemption_idempotency_key_key": "This code was already applied.",

	// People and setup.
	"accounts_user_email_key":             "Someone already uses this email address.",
	"accounts_user_phone_key":             "Someone already uses this phone number.",
	"accounts_driver_user_id_key":         "This person is already a driver.",
	"accounts_role_code_key":              "A role with this code already exists.",
	"mobility_hub_code_key":               "A hub with this code already exists.",
	"mobility_plan_code_key":              "A plan with this code already exists.",
	"mobility_discountcampaign_code_key":  "A discount with this code already exists.",
	"uniq_vehicle_model_make_model":       "This make and model is already in the catalogue.",
	"uniq_offer_assignment_account_offer": "This account already has this offer.",
	"credit_creditline_account_id_key":    "This account already has a credit line.",
	"risk_riskrule_code_key":              "A risk rule with this code already exists.",
}

// duplicateMessage is the plain-language message for a unique violation.
func duplicateMessage(err error) string {
	var pe *pgconn.PgError
	if errors.As(err, &pe) {
		if m, ok := duplicateMessages[pe.ConstraintName]; ok {
			return m
		}
	}
	return duplicateFallback
}
