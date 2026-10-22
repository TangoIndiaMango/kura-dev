package accounts

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
)

// OperatorRegisterSerializer.
type registerReq struct {
	FullName      string     `json:"full_name" validate:"required,max=200"`
	Phone         string     `json:"phone" validate:"required,max=30"`
	Email         string     `json:"email" validate:"required,max=254,email"`
	IDType        string     `json:"id_type" validate:"max=40"`
	IDNumber      string     `json:"id_number" validate:"max=80"`
	CooperativeID *uuid.UUID `json:"cooperative_id"`
}

// registered is the CRM detail plus the invite outcome.
type registered struct {
	CrmDetailDTO
	InviteEmailSent    bool `json:"invite_email_sent"`
	InviteExpiresHours int  `json:"invite_expires_hours"`
}

// register is POST /accounts/register/ (register_operator): staff create a
// rider with a password-setup invite, a wallet and a NUBAN request.
func (h *AccountHandler) register(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b registerReq
	if err := decode.JSON(r, &b); err != nil {
		respond.Error(w, r, err)
		return
	}
	staff, err := h.caller(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	name := strings.TrimSpace(b.FullName)
	email := strings.ToLower(strings.TrimSpace(b.Email))
	var acctID, userID uuid.UUID
	var raw string
	var jobs []vaJob
	err = database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		if taken, err := q.EmailTaken(ctx, email); err != nil {
			return err
		} else if taken {
			return apperr.New("VALIDATION_ERROR", "A user with this email already exists — open their operator page instead.").
				WithDetails(apperr.Details{"email": []string{"unique"}}).WithStatus(http.StatusConflict)
		}
		phone, err := NormalizeNGPhone(b.Phone)
		if err != nil {
			return err
		}
		if taken, err := q.PhoneTaken(ctx, &phone); err != nil {
			return err
		} else if taken {
			return apperr.New("VALIDATION_ERROR", "This phone already belongs to a registered user — open their operator page instead.").
				WithDetails(apperr.Details{"phone": []string{"unique"}}).WithStatus(http.StatusConflict)
		}
		if b.CooperativeID != nil {
			if ok, err := q.CooperativeExists(ctx, *b.CooperativeID); err != nil {
				return err
			} else if !ok {
				return apperr.New("VALIDATION_ERROR", "Unknown cooperative.").
					WithDetails(apperr.Details{"cooperative_id": []string{"invalid"}})
			}
		}
		first, last := splitOnce(name)
		publicID, err := uniquePublicID(ctx, q, "OP")
		if err != nil {
			return err
		}
		userID = ids.New()
		if err := q.InsertRegisteredOperator(ctx, db.InsertRegisteredOperatorParams{ID: userID,
			Password: "!" + randomSuffix(), Email: &email, Phone: &phone, FirstName: first, LastName: last,
			PublicID: &publicID}); err != nil {
			return err
		}
		acct, err := q.InsertAccount(ctx, db.InsertAccountParams{ID: ids.New(), KuraID: kuraID("KR", 6),
			Kind: "INDIVIDUAL", DisplayName: name, Status: "ACTIVE", KycStatus: "PENDING_PSP",
			RegistrationChannel: "WEB", CooperativeID: b.CooperativeID, OwnerUserID: userID})
		if err != nil {
			return err
		}
		acctID = acct.ID
		if _, err := getOrCreateDriver(ctx, q, userID, acct.ID); err != nil {
			return err
		}
		if err := q.EnsureWallet(ctx, db.EnsureWalletParams{ID: ids.New(), AccountID: acct.ID}); err != nil {
			return err
		}
		if err := q.EnsurePendingVA(ctx, db.EnsurePendingVAParams{ID: ids.New(), AccountID: acct.ID}); err != nil {
			return err
		}
		jobs = append(jobs, vaJob{Account: acct.ID, BVNOrNIN: alnum(b.IDNumber)})
		if raw, err = h.staff.issueSetupToken(ctx, q, userID); err != nil {
			return err
		}
		hours := int(inviteTTL.Hours())
		var coop any
		if b.CooperativeID != nil {
			coop = b.CooperativeID.String()
		}
		return events.Emit(ctx, q, events.Event{Action: "account.registered", SubjectType: "account",
			SubjectID: acct.ID.String(), SubjectLabel: firstNonEmpty(acct.KuraID, name), Actor: actorOf(staff),
			After: events.Map{"kura_id": acct.KuraID, "display_name": name, "email": email, "phone": phone,
				"id_type": strings.ToUpper(strings.TrimSpace(b.IDType)), "invite_email_sent": true,
				"cooperative_id": coop},
			Notify: []events.NotifySpec{{UserID: staff.ID, Title: "Operator registered",
				Body: fmt.Sprintf("%s (%s) registered. Password-setup invite emailed — expires in %dh.",
					name, acct.KuraID, hours),
				Source: "Operators", LinkPath: "/operators/" + acct.ID.String(), TemplateCode: "account.registered",
				DedupeKey: "account.registered:" + acct.ID.String()}}})
	})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.ids.scheduleVA(jobs)
	h.staff.sendInvite(ctx, userID, raw, "")
	rows, err := h.q.CrmRows(ctx, []uuid.UUID{acctID})
	if err != nil || len(rows) == 0 {
		respond.Error(w, r, err)
		return
	}
	d, err := crmDetail(ctx, h.q, rows[0], h.cdn)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.Created(w, registered{CrmDetailDTO: d, InviteEmailSent: true, InviteExpiresHours: int(inviteTTL.Hours())})
}
