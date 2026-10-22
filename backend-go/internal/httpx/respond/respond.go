// Package respond writes every HTTP response body: bare JSON on success, the
// uniform {"error": {...}} envelope on failure (same as Django core.responses
// and core.exceptions).
package respond

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/apperr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/httpx/reqctx"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/database"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/logging"
)

// JSON writes v with the given status. nil becomes {} like Django's ok().
func JSON(w http.ResponseWriter, status int, v any) {
	if v == nil {
		v = map[string]any{}
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// OK is 200 with a bare payload.
func OK(w http.ResponseWriter, v any) { JSON(w, http.StatusOK, v) }

// Created is 201 with a bare payload.
func Created(w http.ResponseWriter, v any) { JSON(w, http.StatusCreated, v) }

// Accepted is 202; defaults to {"status": "accepted"}.
func Accepted(w http.ResponseWriter, v any) {
	if v == nil {
		v = map[string]string{"status": "accepted"}
	}
	JSON(w, http.StatusAccepted, v)
}

// NoContent is 204 with no body.
func NoContent(w http.ResponseWriter) { w.WriteHeader(http.StatusNoContent) }

type envelope struct {
	Error envelopeBody `json:"error"`
}

type envelopeBody struct {
	Code      string         `json:"code"`
	Message   string         `json:"message"`
	Details   apperr.Details `json:"details"`
	RequestID string         `json:"request_id"`
}

// Error converts any error into the envelope. Domain errors keep their code
// and status; unique violations become 409; everything else is a logged 500.
func Error(w http.ResponseWriter, r *http.Request, err error) {
	e, ok := apperr.As(err)
	if !ok {
		if field, dup := database.IsUniqueViolation(err); dup {
			e = apperr.Duplicate(field)
		} else {
			logging.From(r.Context()).Error("unhandled error", "err", err,
				"method", r.Method, "path", r.URL.Path)
			e = &apperr.Error{
				Code: "SERVER_ERROR", Message: "Something went wrong. Try again.",
				Status: http.StatusInternalServerError,
			}
		}
	} else if e.Status >= 500 {
		logging.From(r.Context()).Error("server error", "err", err, "path", r.URL.Path)
	}
	if e.RetryAfter > 0 {
		w.Header().Set("Retry-After", strconv.Itoa(e.RetryAfter))
	}
	details := e.Details
	if details == nil {
		details = apperr.Details{}
	}
	JSON(w, e.Status, envelope{Error: envelopeBody{
		Code: e.Code, Message: e.Message, Details: details,
		RequestID: reqctx.RequestID(r.Context()),
	}})
}
