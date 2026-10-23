package engines

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/listq"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/media"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/jsontime"
)

// checks is DEFAULT_SAFETY_CHECKLIST's key order.
var checks = []string{"hull", "mount", "throttle", "kill", "cable", "float"}

// RetrofitDTO is RetrofitListSerializer.
type RetrofitDTO struct {
	ID             string          `json:"id"`
	Status         string          `json:"status"`
	EboarderSerial string          `json:"eboarder_serial"`
	AccountID      string          `json:"account_id"`
	OwnerName      string          `json:"owner_name"`
	VehicleID      string          `json:"vehicle_id"`
	VehicleReg     string          `json:"vehicle_reg"`
	EngineID       *string         `json:"petrol_engine_id"`
	EngineTag      *string         `json:"petrol_engine_tag"`
	EngineStatus   *string         `json:"petrol_engine_status"`
	PetrolMake     *string         `json:"petrol_make"`
	PetrolModel    *string         `json:"petrol_model"`
	PetrolHp       *string         `json:"petrol_hp"`
	HubCode        *string         `json:"storage_hub_code"`
	HubName        *string         `json:"storage_hub_name"`
	ActivatedAt    *jsontime.Field `json:"activated_at"`
	CreatedAt      jsontime.Field  `json:"created_at"`
}

// RetrofitDetailDTO is RetrofitDetailSerializer.
type RetrofitDetailDTO struct {
	RetrofitDTO
	Checklist    json.RawMessage `json:"checklist"`
	Photos       json.RawMessage `json:"photos"`
	InstallMedia []media.Ref     `json:"install_media"`
	AgentID      *string         `json:"agent_id"`
	Raw          json.RawMessage `json:"raw"`
	UpdatedAt    jsontime.Field  `json:"updated_at"`
}

func retrofitDTO(r db.RetrofitRowsRow) RetrofitDTO {
	return RetrofitDTO{ID: r.ID.String(), Status: r.Status, EboarderSerial: r.EboarderSerial,
		AccountID: r.AccountID.String(), OwnerName: r.OwnerName, VehicleID: r.VehicleID.String(),
		VehicleReg: r.VehicleReg, EngineID: idStr(r.PetrolEngineID), EngineTag: r.EngineTag,
		EngineStatus: r.EngineStatus, PetrolMake: r.EngineMake, PetrolModel: r.EngineModel, PetrolHp: r.EngineHp,
		HubCode: r.HubCode, HubName: r.HubName, ActivatedAt: jsontime.FieldPtr(r.ActivatedAt),
		CreatedAt: jsontime.Field(r.CreatedAt)}
}

func (h *handler) retrofitRows(ctx context.Context, ids []uuid.UUID) ([]db.RetrofitRowsRow, error) {
	rows, err := h.q.RetrofitRows(ctx, ids)
	if err != nil {
		return nil, err
	}
	by := map[uuid.UUID]db.RetrofitRowsRow{}
	for _, r := range rows {
		by[r.ID] = r
	}
	out := make([]db.RetrofitRowsRow, 0, len(ids))
	for _, id := range ids {
		if r, ok := by[id]; ok {
			out = append(out, r)
		}
	}
	return out, nil
}

func (h *handler) listRetrofits(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	aw := strings.TrimSpace(r.URL.Query().Get("awaiting_intake"))
	p := db.RetrofitPageParams{Status: listq.Exact(r, "status"), Q: listq.Search(r),
		Awaiting: aw == "1" || aw == "true" || aw == "yes",
		Ord:      ordering(r.URL.Query().Get("ordering"), "created_at", "status")}
	total, err := h.q.RetrofitCount(ctx, db.RetrofitCountParams{Status: p.Status, Awaiting: p.Awaiting, Q: p.Q})
	page, size := paginate.Page(r), paginate.Size(r)
	p.Lim, p.Off = int32(size), int32(paginate.Offset(page, size))
	var ids []uuid.UUID
	if err == nil {
		ids, err = h.q.RetrofitPage(ctx, p)
	}
	var rows []db.RetrofitRowsRow
	if err == nil {
		rows, err = h.retrofitRows(ctx, ids)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]RetrofitDTO, len(rows))
	for i, x := range rows {
		out[i] = retrofitDTO(x)
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

// retrofit is get_object (HasCapability: no object check).
func (h *handler) retrofit(r *http.Request) (uuid.UUID, error) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return uuid.Nil, apperr.NotFound("Not found.")
	}
	rows, err := h.retrofitRows(r.Context(), []uuid.UUID{id})
	if err == nil && len(rows) == 0 {
		err = apperr.NotFound("No Retrofit matches the given query.")
	}
	return id, err
}

func (h *handler) respondRetrofit(w http.ResponseWriter, r *http.Request, status int, id uuid.UUID) {
	rows, err := h.retrofitRows(r.Context(), []uuid.UUID{id})
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	x := rows[0]
	d := RetrofitDetailDTO{RetrofitDTO: retrofitDTO(x), Checklist: x.Checklist, Photos: x.Photos,
		AgentID: idStr(x.AgentID), Raw: x.Raw, UpdatedAt: jsontime.Field(x.UpdatedAt)}
	if d.InstallMedia, err = h.refs(r.Context(), x.Photos); err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, status, d)
}

func (h *handler) getRetrofit(w http.ResponseWriter, r *http.Request) {
	id, err := h.retrofit(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	h.respondRetrofit(w, r, http.StatusOK, id)
}
