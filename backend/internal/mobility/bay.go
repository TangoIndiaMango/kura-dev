package mobility

import (
	"context"
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/auth"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/media"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/operations"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/djsign"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/qr"
)

// staleOpenAfter is STALE_OPEN_AFTER: an open bay session older than this
// is abandoned.
const staleOpenAfter = 2 * time.Hour

// PinVerifier is AuthService.verify_pin for another user (bay PIN pad).
type PinVerifier func(ctx context.Context, user uuid.UUID, pin string) (string, time.Time, error)

// Bay holds the reservation + swap flows' collaborators.
type Bay struct {
	pool      *pgxpool.Pool
	q         *db.Queries
	signer    qr.Signer
	secret    string // SECRET_KEY (reservation QR ciphertext)
	ops       *operations.Service
	tokens    *auth.Tokens
	verifyPin PinVerifier
	cdn       media.Cloudinary
}

// BayDeps are what app wiring passes in.
type BayDeps struct {
	Secret    string
	Ops       *operations.Service
	VerifyPin PinVerifier
	CDN       media.Cloudinary
}

const identitySalt = "kura.identity.v1"

// issueQR is issue_reservation_qr: token + hash + sealed copy.
func (b *Bay) issueQR(r *db.MobilityReservation) error {
	tok := b.signer.ReservationToken(r.ID.String(), r.ExpiresAt.Unix(), r.ID.String())
	sealed, err := djsign.Dumps(tok, b.secret, identitySalt)
	if err != nil {
		return err
	}
	r.TokenHash, r.TokenCiphertext = qr.TokenHash(tok), sealed
	return nil
}

// revealQR is reveal_reservation_qr (nil when unsealable or tampered).
func (b *Bay) revealQR(r db.ReservationRowsRow) *string {
	sealed := strings.TrimSpace(r.TokenCiphertext)
	if sealed == "" {
		return nil
	}
	var plain string
	if err := djsign.Loads(sealed, []string{b.secret}, identitySalt, &plain); err != nil {
		return nil
	}
	if stored := strings.TrimSpace(r.TokenHash); stored != "" && stored != qr.TokenHash(plain) {
		return nil
	}
	return &plain
}

// effectiveStatus is reservation_effective_status.
func effectiveStatus(status string, expires time.Time) string {
	if (status == "PENDING" || status == "CONFIRMED") && !expires.After(time.Now()) {
		return "EXPIRED"
	}
	return status
}

// uiStatus is swap_ui_status.
func uiStatus(s db.SwapRowsRow) string {
	switch s.Status {
	case "COMPLETED", "FAILED", "REVERSED":
		return s.Status
	}
	hold := ""
	if s.ReservationRawStatus != nil && s.ReservationExpiresAt != nil {
		hold = effectiveStatus(*s.ReservationRawStatus, *s.ReservationExpiresAt)
	}
	gone := hold == "EXPIRED" || hold == "CANCELLED"
	started := s.CreatedAt
	if s.StartedAt != nil {
		started = *s.StartedAt
	}
	stale := !started.After(time.Now().Add(-staleOpenAfter))
	if gone || stale {
		return "INCOMPLETE"
	}
	if s.Status == "RETURN_RECORDED" || s.Status == "ISSUED" {
		return "AT_HUB"
	}
	return "IN_PROGRESS"
}

// ReservationDTO is ReservationSerializer.
type ReservationDTO struct {
	ID             string         `json:"id"`
	Account        string         `json:"account"`
	Vehicle        string         `json:"vehicle"`
	VehiclePlate   string         `json:"vehicle_plate"`
	Driver         string         `json:"driver"`
	DriverName     string         `json:"driver_name"`
	Hub            string         `json:"hub"`
	HubName        string         `json:"hub_name"`
	HubCode        string         `json:"hub_code"`
	Battery        *string        `json:"battery"`
	Code           string         `json:"code"`
	QR             *string        `json:"qr"`
	Status         string         `json:"status"`
	PaymentMode    string         `json:"payment_mode"`
	HoldAmountKobo int64          `json:"hold_amount_kobo"`
	ListPriceKobo  int64          `json:"list_price_kobo"`
	DiscountCode   string         `json:"discount_code"`
	DiscountKobo   int64          `json:"discount_kobo"`
	ExpiresAt      jsontime.Field `json:"expires_at"`
	CreatedAt      jsontime.Field `json:"created_at"`
}

func (b *Bay) reservationDTO(r db.ReservationRowsRow) ReservationDTO {
	return ReservationDTO{ID: r.ID.String(), Account: r.AccountID.String(), Vehicle: r.VehicleID.String(),
		VehiclePlate: r.VehiclePlate, Driver: r.DriverID.String(), DriverName: r.DriverFirst, Hub: r.HubID.String(),
		HubName: r.HubName, HubCode: r.HubCode, Battery: idPtr(r.BatteryID), Code: r.Code, QR: b.revealQR(r),
		Status: r.Status, PaymentMode: r.PaymentMode, HoldAmountKobo: r.HoldAmountKobo, ListPriceKobo: r.ListPriceKobo,
		DiscountCode: r.DiscountCode, DiscountKobo: r.DiscountKobo, ExpiresAt: jsontime.Field(r.ExpiresAt),
		CreatedAt: jsontime.Field(r.CreatedAt)}
}

// SwapDTO is SwapSerializer.
type SwapDTO struct {
	ID                   string          `json:"id"`
	Reservation          *string         `json:"reservation"`
	Account              string          `json:"account"`
	Vehicle              string          `json:"vehicle"`
	VehiclePlate         string          `json:"vehicle_plate"`
	Driver               string          `json:"driver"`
	DriverPhone          *string         `json:"driver_phone"`
	Hub                  string          `json:"hub"`
	HubName              string          `json:"hub_name"`
	HubCode              string          `json:"hub_code"`
	Agent                *string         `json:"agent"`
	ReturnedSerial       *string         `json:"returned_serial"`
	ReturnedChargePct    int32           `json:"returned_charge_pct"`
	IssuedSerial         *string         `json:"issued_serial"`
	IssuedChargePct      int32           `json:"issued_charge_pct"`
	PaymentMode          string          `json:"payment_mode"`
	AmountKobo           int64           `json:"amount_kobo"`
	DisplayAmountKobo    int64           `json:"display_amount_kobo"`
	VatKobo              int64           `json:"vat_kobo"`
	Payment              *string         `json:"payment"`
	PaymentID            *string         `json:"payment_id"`
	Subscription         *string         `json:"subscription"`
	OverrideID           *string         `json:"override_id"`
	MismatchFlag         bool            `json:"mismatch_flag"`
	MismatchReason       string          `json:"mismatch_reason"`
	Status               string          `json:"status"`
	UIStatus             string          `json:"ui_status"`
	ReservationStatus    string          `json:"reservation_status"`
	ReservationExpiresAt *string         `json:"reservation_expires_at"`
	ClientEventID        string          `json:"client_event_id"`
	StartedAt            *jsontime.Field `json:"started_at"`
	CompletedAt          *jsontime.Field `json:"completed_at"`
	CreatedAt            jsontime.Field  `json:"created_at"`
}

// displayAmount is swap_display_amount_kobo.
func (b *Bay) displayAmount(ctx context.Context, s db.SwapRowsRow, ui string) int64 {
	if ui == "INCOMPLETE" {
		return 0
	}
	if s.AmountKobo > 0 {
		return s.AmountKobo
	}
	if s.ReservationHold != nil && *s.ReservationHold > 0 {
		return *s.ReservationHold
	}
	if mode := strings.ToUpper(s.PaymentMode); (ui == "IN_PROGRESS" || ui == "AT_HUB") &&
		(mode == "WALLET" || mode == "CREDIT" || mode == "CASH") {
		fee, err := ppsKobo(ctx, b.q, s.VehicleType)
		if err == nil {
			return fee
		}
	}
	return 0
}

func (b *Bay) swapDTO(ctx context.Context, s db.SwapRowsRow) SwapDTO {
	ui := uiStatus(s)
	out := SwapDTO{ID: s.ID.String(), Reservation: idPtr(s.ReservationID), Account: s.AccountID.String(),
		Vehicle: s.VehicleID.String(), VehiclePlate: s.VehiclePlate, Driver: s.DriverID.String(), DriverPhone: s.DriverPhone,
		Hub: s.HubID.String(), HubName: s.HubName, HubCode: s.HubCode, Agent: idPtr(s.AgentID),
		ReturnedSerial: s.ReturnedSerial, ReturnedChargePct: s.ReturnedChargePct, IssuedSerial: s.IssuedSerial,
		IssuedChargePct: s.IssuedChargePct, PaymentMode: s.PaymentMode, AmountKobo: s.AmountKobo,
		DisplayAmountKobo: b.displayAmount(ctx, s, ui), VatKobo: s.VatKobo, Payment: idPtr(s.PaymentID),
		PaymentID: idPtr(s.PaymentID), Subscription: idPtr(s.SubscriptionID), OverrideID: idPtr(s.OverrideID),
		MismatchFlag: s.MismatchFlag, MismatchReason: s.MismatchReason, Status: s.Status, UIStatus: ui,
		ClientEventID: s.ClientEventID, StartedAt: jsontime.FieldPtr(s.StartedAt),
		CompletedAt: jsontime.FieldPtr(s.CompletedAt), CreatedAt: jsontime.Field(s.CreatedAt)}
	if s.ReservationRawStatus != nil && s.ReservationExpiresAt != nil {
		out.ReservationStatus = effectiveStatus(*s.ReservationRawStatus, *s.ReservationExpiresAt)
		iso := jsontime.FormatISO(*s.ReservationExpiresAt)
		iso = strings.TrimSuffix(iso, "+00:00") + "Z"
		out.ReservationExpiresAt = &iso
	}
	return out
}

func i32ptr(n int32) *int32 { return &n }

func itoa64(n int64) string { return strconv.FormatInt(n, 10) }

// ppsKobo is PricingService.resolve_pps_kobo (the active tariff's pay-per-swap).
func ppsKobo(ctx context.Context, q *db.Queries, vehicleType string) (int64, error) {
	m, err := activeMatrix(ctx, q, vehicleType)
	return m.PayPerSwapKobo, err
}

// structMap turns a DTO into a map so extra keys can be added.
func structMap(v any) map[string]any {
	raw, _ := json.Marshal(v)
	m := map[string]any{}
	_ = json.Unmarshal(raw, &m)
	return m
}
