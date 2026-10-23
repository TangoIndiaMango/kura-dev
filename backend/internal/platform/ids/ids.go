// Package ids generates identifiers with the same shapes as Django's core.ids.
package ids

import "github.com/google/uuid"

// New returns a time-ordered UUIDv7 (index-friendly primary keys).
func New() uuid.UUID {
	return uuid.Must(uuid.NewV7())
}

// NewString is New as a canonical string.
func NewString() string { return New().String() }
