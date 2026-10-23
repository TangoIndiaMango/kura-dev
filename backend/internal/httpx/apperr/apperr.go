// Package apperr is the Go equivalent of Django's core.exceptions.DomainError.
//
// Services return *Error; the transport layer turns it into the uniform
// envelope in exactly one place (respond.Error). Unknown errors become 500s
// with the cause logged, never leaked.
package apperr

import (
	"errors"
	"fmt"
	"net/http"
)

// Details mirrors DRF field errors: {"field": ["message", ...]} or any map.
type Details map[string]any

// Error is a domain error with a stable machine code and an HTTP status.
type Error struct {
	Code    string
	Message string
	Details Details
	Status  int
	// RetryAfter (seconds) sets the Retry-After header for THROTTLED.
	RetryAfter int
	cause      error
}

func (e *Error) Error() string {
	if e.cause != nil {
		return fmt.Sprintf("%s: %s: %v", e.Code, e.Message, e.cause)
	}
	return e.Code + ": " + e.Message
}

func (e *Error) Unwrap() error { return e.cause }

// New builds a 400 domain error (Django DomainError default status).
func New(code, message string) *Error {
	return &Error{Code: code, Message: message, Status: http.StatusBadRequest}
}

// WithStatus sets the HTTP status.
func (e *Error) WithStatus(status int) *Error { e.Status = status; return e }

// WithDetails attaches field/extra details.
func (e *Error) WithDetails(d Details) *Error { e.Details = d; return e }

// Wrap keeps an underlying cause for logs (never shown to clients).
func (e *Error) Wrap(err error) *Error { e.cause = err; return e }

// As extracts an *Error from any wrapped error.
func As(err error) (*Error, bool) {
	var e *Error
	ok := errors.As(err, &e)
	return e, ok
}

// Common constructors — same codes and default messages as DRF/Django.

func Validation(details Details) *Error {
	return &Error{
		Code: "VALIDATION_ERROR", Message: "Please fix the highlighted fields.",
		Details: details, Status: http.StatusBadRequest,
	}
}

func Field(field, message string) *Error {
	return Validation(Details{field: []string{message}})
}

func NotFound(message string) *Error {
	if message == "" {
		message = "No matching record found."
	}
	return &Error{Code: "NOT_FOUND", Message: message, Status: http.StatusNotFound}
}

func Unauthorized(message string) *Error {
	if message == "" {
		message = "Authentication credentials were not provided."
	}
	return &Error{Code: "UNAUTHORIZED", Message: message, Status: http.StatusUnauthorized}
}

func Forbidden(message string) *Error {
	if message == "" {
		message = "You do not have permission to perform this action."
	}
	return &Error{Code: "FORBIDDEN", Message: message, Status: http.StatusForbidden}
}

func Conflict(code, message string) *Error {
	return &Error{Code: code, Message: message, Status: http.StatusConflict}
}

func Throttled(message string, retryAfter int) *Error {
	return &Error{
		Code: "THROTTLED", Message: message, Status: http.StatusTooManyRequests,
		Details: Details{"retry_after_seconds": retryAfter}, RetryAfter: retryAfter,
	}
}

// Duplicate is the 409 Django returns for a unique-constraint violation.
func Duplicate(field string) *Error {
	d := Details{"non_field_errors": []string{"duplicate"}}
	if field != "" {
		d = Details{field: []string{"already exists"}}
	}
	return &Error{
		Code: "VALIDATION_ERROR", Message: "A record with this value already exists.",
		Details: d, Status: http.StatusConflict,
	}
}
