// Package reqctx holds per-request values (request id, client IP, user)
// in context with typed accessors, so no package uses raw context keys.
package reqctx

import "context"

type key int

const (
	requestIDKey key = iota
	clientIPKey
	principalKey
)

// Principal is the authenticated caller, attached by the auth middleware.
type Principal struct {
	UserID         string
	Role           string
	IsStaff        bool
	SessionVersion int
	AccessJTI      string
	Capabilities   map[string]bool
}

// Can reports whether the caller holds a capability code (e.g. "hubs:read").
func (p *Principal) Can(code string) bool {
	return p != nil && p.Capabilities[code]
}

func WithRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, requestIDKey, id)
}

func RequestID(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey).(string)
	return id
}

func WithClientIP(ctx context.Context, ip string) context.Context {
	return context.WithValue(ctx, clientIPKey, ip)
}

func ClientIP(ctx context.Context) string {
	ip, _ := ctx.Value(clientIPKey).(string)
	return ip
}

func WithPrincipal(ctx context.Context, p *Principal) context.Context {
	return context.WithValue(ctx, principalKey, p)
}

// User returns the authenticated principal or nil.
func User(ctx context.Context) *Principal {
	p, _ := ctx.Value(principalKey).(*Principal)
	return p
}
