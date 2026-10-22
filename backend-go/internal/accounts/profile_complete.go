package accounts

import (
	"context"
	"strings"
	"unicode"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
)

// User.OnboardingStep values (DONE is stored as "home").
const (
	stepPIN     = "pin"
	stepProfile = "profile"
	stepDone    = "home"
)

// vaJob is a NUBAN request to run after the transaction commits
// (schedule_va_provision's on_commit).
type vaJob struct {
	Account  uuid.UUID
	BVNOrNIN string
}

// profileResult is what complete_profile changed.
type profileResult struct {
	Account db.AccountsAccount
	Created bool
	VA      []vaJob
}

// completeProfile is AccountService.complete_profile inside the caller's
// transaction: names the user, creates (or renames) their first account
// with a driver profile, wallet and pending NUBAN.
func completeProfile(ctx context.Context, q *db.Queries, user db.AccountsUser, displayName, first, last,
	idNumber string) (profileResult, error) {
	displayName = strings.TrimSpace(displayName)
	if displayName == "" {
		return profileResult{}, apperr.New("VALIDATION_ERROR", "Display name is required.").
			WithDetails(apperr.Details{"display_name": []string{"required"}})
	}
	head, rest := splitOnce(displayName)
	if first == "" {
		first = head
	}
	if last == "" {
		last = rest
	}
	step := user.OnboardingStep
	if step == stepPIN || step == stepProfile {
		step = stepDone
	}
	if err := q.SetUserNamesStep(ctx, db.SetUserNamesStepParams{ID: user.ID, FirstName: strings.TrimSpace(first),
		LastName: strings.TrimSpace(last), OnboardingStep: step}); err != nil {
		return profileResult{}, err
	}
	out := profileResult{}
	acct, err := q.FirstOwnedAccountForUpdate(ctx, user.ID)
	previous := acct.DisplayName
	switch {
	case database.IsNoRows(err):
		out.Created = true
		acct, err = q.InsertAccount(ctx, db.InsertAccountParams{ID: ids.New(), KuraID: kuraID("KR", 6),
			Kind: "INDIVIDUAL", DisplayName: displayName, Status: "ACTIVE", KycStatus: "PENDING_PSP",
			RegistrationChannel: "WEB", OwnerUserID: user.ID})
		if err != nil {
			return out, err
		}
		if _, err := q.DriverRowByUser(ctx, user.ID); database.IsNoRows(err) {
			if _, err := q.InsertDriverRow(ctx, db.InsertDriverRowParams{ID: ids.New(), AccountID: acct.ID,
				UserID: user.ID}); err != nil {
				return out, err
			}
		} else if err != nil {
			return out, err
		}
	case err != nil:
		return out, err
	default:
		if err := q.SetAccountDisplayName(ctx, db.SetAccountDisplayNameParams{ID: acct.ID,
			DisplayName: displayName}); err != nil {
			return out, err
		}
		acct.DisplayName = displayName
	}
	if err := q.EnsureWallet(ctx, db.EnsureWalletParams{ID: ids.New(), AccountID: acct.ID}); err != nil {
		return out, err
	}
	if err := q.EnsurePendingVA(ctx, db.EnsurePendingVAParams{ID: ids.New(), AccountID: acct.ID}); err != nil {
		return out, err
	}
	if out.Created {
		out.VA = append(out.VA, vaJob{Account: acct.ID, BVNOrNIN: alnum(idNumber)})
	}
	ev := events.Event{Action: "account.profile_updated", SubjectType: "account", SubjectID: acct.ID.String(),
		SubjectLabel: firstNonEmpty(acct.KuraID, acct.DisplayName), Actor: actorOf(user),
		Before: events.Map{"display_name": previous},
		After:  events.Map{"display_name": acct.DisplayName, "onboarding_step": step}}
	if out.Created {
		ev.Action, ev.Before = "account.profile_completed", nil
	}
	out.Account = acct
	return out, events.Emit(ctx, q, ev)
}

// splitOnce is str.split(None, 1): first word and the rest.
func splitOnce(s string) (string, string) {
	f := strings.Fields(s)
	if len(f) == 0 {
		return "", ""
	}
	rest := strings.TrimLeftFunc(strings.TrimPrefix(strings.TrimLeftFunc(s, unicode.IsSpace), f[0]), unicode.IsSpace)
	return f[0], rest
}

// alnum keeps letters and digits (str.isalnum), like ID-number cleaning.
func alnum(s string) string {
	return strings.Map(func(r rune) rune {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			return r
		}
		return -1
	}, s)
}
