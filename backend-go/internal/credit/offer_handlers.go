package credit

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/events"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/decode"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/paginate"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/respond"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/ids"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platformcfg"
)

func offerList(o db.CreditProductoffer) map[string]any {
	return map[string]any{"id": o.ID.String(), "name": o.Name, "offer_type": o.OfferType, "summary": o.Summary,
		"status": o.Status, "created_at": jsontime.Field(o.CreatedAt)}
}

func offerDetail(o db.CreditProductoffer) map[string]any {
	m := offerList(o)
	m["terms"], m["segment_criteria"] = json.RawMessage(o.Terms), json.RawMessage(o.SegmentCriteria)
	m["updated_at"] = jsontime.Field(o.UpdatedAt)
	return m
}

func (h *Handler) offers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	total, err := h.q.CountOffers(ctx)
	page, size := paginate.Page(r), paginate.Size(r)
	var rows []db.CreditProductoffer
	if err == nil {
		rows, err = h.q.OffersPage(ctx, db.OffersPageParams{Lim: int32(size), Off: int32(paginate.Offset(page, size))})
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]map[string]any, len(rows))
	for i, o := range rows {
		out[i] = offerList(o)
	}
	body, err := paginate.BuildNumberPage(r, out, int(total), page, size)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, body)
}

func (h *Handler) offer(r *http.Request) (db.CreditProductoffer, error) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		return db.CreditProductoffer{}, apperr.NotFound("Not found.")
	}
	o, err := h.q.OfferByID(r.Context(), id)
	if database.IsNoRows(err) {
		return o, apperr.NotFound("No ProductOffer matches the given query.")
	}
	return o, err
}

func (h *Handler) getOffer(w http.ResponseWriter, r *http.Request) {
	o, err := h.offer(r)
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, offerDetail(o))
}

// dictField is DRF DictField: an object, else the type error.
func dictField(d map[string]any, name string, raw json.RawMessage, present, required bool) []byte {
	if !present {
		if required {
			d[name] = []string{"This field is required."}
		}
		return nil
	}
	var v any
	_ = json.Unmarshal(raw, &v)
	if v == nil {
		d[name] = []string{"This field may not be null."}
		return nil
	}
	if _, ok := v.(map[string]any); !ok {
		d[name] = []string{fmt.Sprintf("Expected a dictionary of items but got type \"%s\".", pyTypeName(v))}
		return nil
	}
	return raw
}

func pyTypeName(v any) string {
	switch v.(type) {
	case []any:
		return "list"
	case string:
		return "str"
	case float64:
		return "int"
	case bool:
		return "bool"
	}
	return "dict"
}

type offerReq struct {
	Name     *string         `json:"name" validate:"omitempty,notblank,max=120"`
	Type     *string         `json:"offer_type" validate:"omitempty,oneof=CREDIT INSURANCE FINANCING"`
	Summary  *string         `json:"summary"`
	Terms    json.RawMessage `json:"terms"`
	Criteria json.RawMessage `json:"segment_criteria"`
	Status   *string         `json:"status" validate:"omitempty,oneof=DRAFT ACTIVE PAUSED ENDED"`
}

func (b *offerReq) validate(r *http.Request, create bool) (terms, criteria []byte, err error) {
	keys := decode.Keys(r)
	err = decode.JSON(r, b)
	d := map[string]any{}
	if e, ok := apperr.As(err); ok && e.Code == "VALIDATION_ERROR" {
		for k, v := range e.Details {
			d[k] = v
		}
		err = nil
	}
	if err != nil {
		return nil, nil, err
	}
	for k, isNil := range map[string]bool{"name": b.Name == nil, "offer_type": b.Type == nil,
		"summary": b.Summary == nil, "status": b.Status == nil} {
		if keys[k] && isNil && d[k] == nil {
			d[k] = []string{"This field may not be null."}
		}
	}
	if !create { // OfferPatchSerializer has no offer_type: ignored
		delete(d, "offer_type")
		b.Type = nil
	}
	if create {
		for _, k := range []string{"name", "offer_type"} {
			if !keys[k] {
				d[k] = []string{"This field is required."}
			}
		}
	}
	terms = dictField(d, "terms", b.Terms, keys["terms"], false)
	criteria = dictField(d, "segment_criteria", b.Criteria, keys["segment_criteria"], false)
	if len(d) > 0 {
		return nil, nil, apperr.Validation(apperr.Details(d))
	}
	return terms, criteria, nil
}

func (h *Handler) createOffer(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var b offerReq
	terms, criteria, err := b.validate(r, true)
	if err == nil {
		err = platformcfg.RequireEnabled(ctx, h.q, "offers")
	}
	o := db.CreditProductoffer{ID: ids.New(), Status: "DRAFT", Terms: []byte("{}"), SegmentCriteria: []byte("{}")}
	if err == nil {
		o.Name, o.OfferType = strings.TrimSpace(*b.Name), *b.Type
		if b.Summary != nil {
			o.Summary = strings.TrimSpace(*b.Summary)
		}
		if len(terms) > 0 && string(terms) != "{}" {
			o.Terms = terms
		}
		if len(criteria) > 0 && string(criteria) != "{}" {
			o.SegmentCriteria = criteria
		}
		if b.Status != nil {
			o.Status = *b.Status
		}
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			if err := q.InsertOffer(ctx, db.InsertOfferParams{ID: o.ID, Name: o.Name, OfferType: o.OfferType,
				Summary: o.Summary, Terms: o.Terms, SegmentCriteria: o.SegmentCriteria, Status: o.Status}); err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "offer.created", SubjectType: "product_offer",
				SubjectID: o.ID.String(), Actor: who,
				After: events.Map{"name": o.Name, "offer_type": o.OfferType, "status": o.Status}})
		})
	}
	if err == nil {
		o, err = h.q.OfferByID(ctx, o.ID)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.JSON(w, http.StatusCreated, offerDetail(o))
}

// patchOffer: get_object, OfferPatchSerializer, then update_offer (which
// skips None values and needs offers on).
func (h *Handler) patchOffer(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	o, err := h.offer(r)
	var b offerReq
	var terms, criteria []byte
	if err == nil {
		terms, criteria, err = b.validate(r, false)
	}
	if err == nil {
		err = platformcfg.RequireEnabled(ctx, h.q, "offers")
	}
	if err == nil {
		before := events.Map{"status": o.Status, "name": o.Name}
		if b.Name != nil {
			o.Name = strings.TrimSpace(*b.Name)
		}
		if b.Summary != nil {
			o.Summary = strings.TrimSpace(*b.Summary)
		}
		if terms != nil {
			o.Terms = terms
		}
		if criteria != nil {
			o.SegmentCriteria = criteria
		}
		if b.Status != nil {
			o.Status = *b.Status
		}
		err = h.tx(ctx, func(q *db.Queries, who *events.Actor) error {
			if err := q.SaveOffer(ctx, db.SaveOfferParams{ID: o.ID, Name: o.Name, Summary: o.Summary, Terms: o.Terms,
				SegmentCriteria: o.SegmentCriteria, Status: o.Status}); err != nil {
				return err
			}
			return events.Emit(ctx, q, events.Event{Action: "offer.updated", SubjectType: "product_offer",
				SubjectID: o.ID.String(), Actor: who, Before: before,
				After: events.Map{"status": o.Status, "name": o.Name}})
		})
	}
	if err == nil {
		o, err = h.q.OfferByID(ctx, o.ID)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	respond.OK(w, offerDetail(o))
}

func (h *Handler) mine(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	acct, err := accountFor(ctx, h.q)
	var rows []db.AssignmentsForAccountRow
	if err == nil {
		rows, err = h.q.AssignmentsForAccount(ctx, acct.ID)
	}
	if err != nil {
		respond.Error(w, r, err)
		return
	}
	out := make([]map[string]any, len(rows))
	for i, a := range rows {
		out[i] = map[string]any{"id": a.ID.String(), "status": a.Status, "amount_kobo": a.AmountKobo,
			"channel": a.Channel, "offer_id": a.OfferID.String(), "offer_name": a.OfferName,
			"offer_type": a.OfferType, "summary": a.Summary}
	}
	respond.OK(w, out)
}
