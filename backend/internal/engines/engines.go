// Package engines ports mobility Path B: petrol engine custody (intake,
// release request, release), the retrofit wizard (intake → install →
// checklist → activate) and the e-boarder fleet.
package engines

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/actor"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/media"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
)

type handler struct {
	pool *pgxpool.Pool
	q    *db.Queries
	cdn  media.Cloudinary
}

func (h *handler) tx(ctx context.Context, fn func(q *db.Queries, who *events.Actor) error) error {
	return database.InTx(ctx, h.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		who, err := actor.FromRequest(ctx, q)
		if err != nil {
			return err
		}
		return fn(q, who)
	})
}

func (h *handler) lookup(ctx context.Context, id uuid.UUID) (media.RefAsset, bool, error) {
	a, err := h.q.MediaAssetFull(ctx, id)
	if database.IsNoRows(err) {
		return media.RefAsset{}, false, nil
	}
	if err != nil {
		return media.RefAsset{}, false, err
	}
	return media.RefAsset{Asset: media.Asset{Provider: a.Provider, StorageKey: a.StorageKey,
		ResourceType: a.ResourceType, Visibility: a.Visibility}, ID: a.ID,
		OriginalFilename: a.OriginalFilename, ContentType: a.ContentType}, true, nil
}

// refs is resolve_media_refs over a stored JSON list (items str()'d).
func (h *handler) refs(ctx context.Context, raw []byte) ([]media.Ref, error) {
	var items []any
	_ = json.Unmarshal(raw, &items)
	strs := make([]string, 0, len(items))
	for _, it := range items {
		if it == nil {
			continue
		}
		if s, ok := it.(string); ok {
			strs = append(strs, s)
		} else {
			strs = append(strs, fmt.Sprint(it))
		}
	}
	return h.cdn.ResolveRefs(ctx, h.lookup, strs)
}

func idStr(id *uuid.UUID) *string {
	if id == nil {
		return nil
	}
	s := id.String()
	return &s
}

func orEmpty(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// EngineDTO is PetrolEngineListSerializer.
type EngineDTO struct {
	ID             string          `json:"id"`
	Tag            string          `json:"tag"`
	Make           string          `json:"make"`
	Model          string          `json:"model"`
	Hp             string          `json:"hp"`
	ConditionGrade string          `json:"condition_grade"`
	Status         string          `json:"status"`
	AccountID      string          `json:"account_id"`
	OwnerName      string          `json:"owner_name"`
	OwnerKuraID    string          `json:"owner_kura_id"`
	HubCode        *string         `json:"storage_hub_code"`
	HubName        *string         `json:"storage_hub_name"`
	VehicleID      *string         `json:"vehicle_id"`
	VehicleReg     string          `json:"vehicle_reg"`
	RetrofitID     *string         `json:"retrofit_id"`
	RetrofitStatus *string         `json:"retrofit_status"`
	EboarderSerial string          `json:"eboarder_serial"`
	ReleasedAt     *jsontime.Field `json:"released_at"`
	CreatedAt      jsontime.Field  `json:"created_at"`
}

// EngineDetailDTO is PetrolEngineDetailSerializer.
type EngineDetailDTO struct {
	EngineDTO
	StorageHubID          *string         `json:"storage_hub_id"`
	IntakePhotos          json.RawMessage `json:"intake_photos"`
	IntakeMedia           []media.Ref     `json:"intake_media"`
	IntakeSignature       string          `json:"intake_signature"`
	IntakeSignatureMedia  *media.Ref      `json:"intake_signature_media"`
	IntakeAgentID         *string         `json:"intake_agent_id"`
	IntakeWitnessID       *string         `json:"intake_witness_id"`
	ReleasePhotos         json.RawMessage `json:"release_photos"`
	ReleaseMedia          []media.Ref     `json:"release_media"`
	ReleaseSignature      string          `json:"release_signature"`
	ReleaseSignatureMedia *media.Ref      `json:"release_signature_media"`
	ReleaseByID           *string         `json:"release_by_id"`
	Raw                   json.RawMessage `json:"raw"`
	UpdatedAt             jsontime.Field  `json:"updated_at"`
}

func engineDTO(e db.EngineRowsRow) EngineDTO {
	return EngineDTO{ID: e.ID.String(), Tag: e.Tag, Make: e.Make, Model: e.Model, Hp: e.Hp,
		ConditionGrade: e.ConditionGrade, Status: e.Status, AccountID: e.AccountID.String(), OwnerName: e.OwnerName,
		OwnerKuraID: e.OwnerKuraID, HubCode: e.HubCode, HubName: e.HubName, VehicleID: idStr(e.VehicleID),
		VehicleReg: orEmpty(e.VehicleReg), RetrofitID: idStr(e.RetrofitID), RetrofitStatus: e.RetrofitStatus,
		EboarderSerial: orEmpty(e.RetrofitSerial), ReleasedAt: jsontime.FieldPtr(e.ReleasedAt),
		CreatedAt: jsontime.Field(e.CreatedAt)}
}

func (h *handler) engineDetail(ctx context.Context, e db.EngineRowsRow) (EngineDetailDTO, error) {
	d := EngineDetailDTO{EngineDTO: engineDTO(e), StorageHubID: idStr(e.StorageHubID), IntakePhotos: e.IntakePhotos,
		IntakeSignature: e.IntakeSignature, IntakeAgentID: idStr(e.IntakeAgentID),
		IntakeWitnessID: idStr(e.IntakeWitnessID), ReleasePhotos: e.ReleasePhotos,
		ReleaseSignature: e.ReleaseSignature, ReleaseByID: idStr(e.ReleaseByID), Raw: e.Raw,
		UpdatedAt: jsontime.Field(e.UpdatedAt)}
	var err error
	if d.IntakeMedia, err = h.refs(ctx, e.IntakePhotos); err != nil {
		return d, err
	}
	if d.ReleaseMedia, err = h.refs(ctx, e.ReleasePhotos); err != nil {
		return d, err
	}
	if d.IntakeSignatureMedia, err = h.cdn.ResolveRef(ctx, h.lookup, e.IntakeSignature); err != nil {
		return d, err
	}
	d.ReleaseSignatureMedia, err = h.cdn.ResolveRef(ctx, h.lookup, e.ReleaseSignature)
	return d, err
}

// engineRows loads engines in id order.
func (h *handler) engineRows(ctx context.Context, ids []uuid.UUID) ([]db.EngineRowsRow, error) {
	rows, err := h.q.EngineRows(ctx, ids)
	if err != nil {
		return nil, err
	}
	by := map[uuid.UUID]db.EngineRowsRow{}
	for _, r := range rows {
		by[r.ID] = r
	}
	out := make([]db.EngineRowsRow, 0, len(ids))
	for _, id := range ids {
		if r, ok := by[id]; ok {
			out = append(out, r)
		}
	}
	return out, nil
}
