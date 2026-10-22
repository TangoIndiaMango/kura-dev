package accounts

import (
	"context"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/media"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

// crmStaffRoles is CRM_STAFF_ROLES (accounts.helpers.staff).
var crmStaffRoles = map[string]bool{"SUPER_ADMIN": true, "OPS_MANAGER": true,
	"HUB_AGENT": true, "COMMERCIAL_ADMIN": true}

// isCRMStaff picks the CRM serializers over AccountSerializer.
func isCRMStaff(p *reqctx.Principal) bool { return p != nil && (p.IsStaff || crmStaffRoles[p.Role]) }

// CrmListDTO is AccountCrmListSerializer.
type CrmListDTO struct {
	ID                  string         `json:"id"`
	KuraID              string         `json:"kura_id"`
	Kind                string         `json:"kind"`
	DisplayName         string         `json:"display_name"`
	Status              string         `json:"status"`
	KycStatus           string         `json:"kyc_status"`
	Psp                 string         `json:"psp"`
	RegistrationChannel string         `json:"registration_channel"`
	Phone               *string        `json:"phone"`
	Email               *string        `json:"email"`
	PhotoURL            *string        `json:"photo_url"`
	IDType              *string        `json:"id_type"`
	IDLast4             *string        `json:"id_last4"`
	KycDocumentStatus   *string        `json:"kyc_document_status"`
	VerifiedVia         *string        `json:"verified_via"`
	CooperativeID       *string        `json:"cooperative_id"`
	CooperativeName     *string        `json:"cooperative_name"`
	PrimaryVehicleReg   *string        `json:"primary_vehicle_reg"`
	VehicleCount        int32          `json:"vehicle_count"`
	ActivePlanName      *string        `json:"active_plan_name"`
	WalletAvailableKobo *int64         `json:"wallet_available_kobo"`
	CreatedAt           jsontime.Field `json:"created_at"`
}

// CrmDetailDTO is AccountCrmDetailSerializer.
type CrmDetailDTO struct {
	CrmListDTO
	OwnerUserID string   `json:"owner_user_id"`
	DriverIDs   []string `json:"driver_ids"`
	WalletID    *string  `json:"wallet_id"`
	VehicleIDs  []string `json:"vehicle_ids"`
}

func crmListDTO(r db.CrmRowsRow, cdn media.Cloudinary) CrmListDTO {
	d := CrmListDTO{ID: r.ID.String(), KuraID: r.KuraID, Kind: r.Kind, DisplayName: r.DisplayName,
		Status: r.Status, KycStatus: r.KycStatus, Psp: r.Psp, RegistrationChannel: r.RegistrationChannel,
		Phone: r.Phone, Email: r.Email, CooperativeName: r.CooperativeName,
		PrimaryVehicleReg: nonEmpty(r.PrimaryVehicleReg), VehicleCount: r.VehicleCount,
		ActivePlanName: nonEmpty(r.ActivePlanName), CreatedAt: jsontime.Field(r.CreatedAt)}
	if r.CooperativeID != nil {
		d.CooperativeID = strPtr(r.CooperativeID.String())
	}
	if r.HasDoc {
		d.IDType, d.IDLast4, d.KycDocumentStatus = strPtr(r.DocType), strPtr(r.NumberLast4), strPtr(r.DocStatus)
		d.VerifiedVia = nonEmpty(r.VerifiedVia)
	}
	if r.PhotoKey != nil {
		d.PhotoURL = cdn.DeliveryURL(&media.Asset{Provider: str(r.PhotoProvider), StorageKey: *r.PhotoKey,
			ResourceType: str(r.PhotoResource), Visibility: str(r.PhotoVisibility)})
	}
	return d
}

// crmRows loads CRM rows for ids, preserving the order of ids.
func crmRows(ctx context.Context, q *db.Queries, ids []uuid.UUID) ([]db.CrmRowsRow, error) {
	rows, err := q.CrmRows(ctx, ids)
	if err != nil {
		return nil, err
	}
	byID := make(map[uuid.UUID]db.CrmRowsRow, len(rows))
	for _, r := range rows {
		byID[r.ID] = r
	}
	out := make([]db.CrmRowsRow, 0, len(ids))
	for _, id := range ids {
		if r, ok := byID[id]; ok {
			out = append(out, r)
		}
	}
	return out, nil
}

// crmDetail adds the detail-only columns.
func crmDetail(ctx context.Context, q *db.Queries, r db.CrmRowsRow, cdn media.Cloudinary) (CrmDetailDTO, error) {
	d := CrmDetailDTO{CrmListDTO: crmListDTO(r, cdn), OwnerUserID: r.OwnerUserID.String(),
		WalletID: nonEmpty(r.WalletID)}
	drivers, err := q.AccountDriverIDs(ctx, r.ID)
	if err != nil {
		return d, err
	}
	vehicles, err := q.AccountVehicleIDs(ctx, r.ID)
	if err != nil {
		return d, err
	}
	d.DriverIDs, d.VehicleIDs = uuidStrings(drivers), uuidStrings(vehicles)
	return d, nil
}

// plainAccount is AccountSerializer built from a CRM row.
func plainAccount(r db.CrmRowsRow) AccountDTO {
	return AccountDTO{ID: r.ID.String(), KuraID: r.KuraID, OwnerUser: r.OwnerUserID.String(), Kind: r.Kind,
		DisplayName: r.DisplayName, Status: r.Status, KycStatus: r.KycStatus,
		RegistrationChannel: r.RegistrationChannel, CreatedAt: jsontime.Field(r.CreatedAt)}
}

func uuidStrings(ids []uuid.UUID) []string {
	out := make([]string, len(ids))
	for i, id := range ids {
		out[i] = id.String()
	}
	return out
}
