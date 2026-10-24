package finance

import (
	"net/http"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/router"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/throttle"
)

// Module mounts /api/v1/finance/*.
type Module struct {
	h       *Handler
	limiter *throttle.Limiter
}

func NewModule(h *Handler, limiter *throttle.Limiter) *Module { return &Module{h: h, limiter: limiter} }

// Register: payments and wallets are HasCapabilityOrReadOwn (GETs need
// sign-in, scoped to own accounts); the ledger needs finance:read.
func (m *Module) Register(mux *http.ServeMux) {
	p := router.New(mux, "/api/v1/finance/payments", m.limiter)
	p.User("GET", "/", m.h.payments)
	p.User("GET", "/export/", m.h.export)
	p.User("GET", "/stats/", m.h.paymentStats)
	p.User("GET", "/{id}/", m.h.paymentDetail)
	p.User("GET", "/{id}/receipt/", m.h.receipt)

	w := router.New(mux, "/api/v1/finance/wallets", m.limiter)
	w.User("GET", "/", m.h.wallets)
	w.Cap("POST", "/fund/", "finance:read", m.h.fund)
	w.User("POST", "/checkout/", m.h.checkoutStart)
	w.User("POST", "/checkout/verify/", m.h.checkoutVerify)
	w.User("GET", "/mine/", m.h.mine)
	w.User("GET", "/{id}/", m.h.wallet)

	l := router.New(mux, "/api/v1/finance/ledger", m.limiter)
	l.Cap("GET", "/", "finance:read", m.h.ledger)
	l.Cap("GET", "/{id}/", "finance:read", m.h.ledgerTx)
}
