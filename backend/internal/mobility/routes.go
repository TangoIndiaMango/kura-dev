package mobility

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/auth"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/httpx/router"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/mail"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/qr"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/throttle"
)

// Module mounts /api/v1/mobility/*.
type Module struct {
	hubs    *HubHandler
	btypes  *BatteryTypeHandler
	bats    *BatteryHandler
	vehs    *VehicleHandler
	vmodels *VehicleModelHandler
	pricing *PricingHandler
	plans   *PlanHandler
	subs    *SubscriptionHandler
	discs   *DiscountHandler
	bay     *Bay
	limiter *throttle.Limiter
}

func NewModule(pool *pgxpool.Pool, signer qr.Signer, mailer *mail.Mailer, tokens *auth.Tokens, deps BayDeps,
	limiter *throttle.Limiter) *Module {
	bay := &Bay{pool: pool, q: db.New(pool), signer: signer, secret: deps.Secret, ops: deps.Ops, tokens: tokens,
		verifyPin: deps.VerifyPin, cdn: deps.CDN, checkout: deps.Checkout, mailer: mailer}
	return &Module{bay: bay, hubs: NewHubHandler(pool), btypes: NewBatteryTypeHandler(pool),
		bats: NewBatteryHandler(pool, signer), vehs: NewVehicleHandler(pool, signer),
		vmodels: NewVehicleModelHandler(pool), pricing: NewPricingHandler(pool, mailer), plans: NewPlanHandler(pool),
		subs: NewSubscriptionHandler(pool, tokens), discs: NewDiscountHandler(pool), limiter: limiter}
}

// Register mounts the mobility routes.
func (m *Module) Register(mux *http.ServeMux) {
	// The landing page's live network: hubs, plans, swap prices (no sign-in).
	pub := router.New(mux, "/api/v1/public", m.limiter)
	pub.Throttle(throttle.AnonBurst).Public("GET", "/network/", m.hubs.publicNetwork)

	h := router.New(mux, "/api/v1/mobility/hubs", m.limiter) // HubViewSet capability_map
	h.Cap("GET", "/", "hubs:read", m.hubs.list)
	h.Cap("POST", "/", "hubs:manage", m.hubs.create)
	h.User("GET", "/discover/", m.hubs.discover)
	h.Cap("GET", "/export/", "hubs:read", m.hubs.export)
	h.Cap("GET", "/stats/", "hubs:read", m.hubs.stats)
	h.Cap("GET", "/{id}/", "hubs:read", m.hubs.get)
	h.Cap("PATCH", "/{id}/", "hubs:manage", m.hubs.patch)
	h.Cap("GET", "/{id}/slots/", "hubs:read", m.hubs.slots)
	h.Cap("GET", "/{id}/stats/", "hubs:read", m.hubs.detailStats)
	h.Cap("POST", "/{id}/status/", "hubs:manage", m.hubs.hubStatus(m.bay))

	bt := router.New(mux, "/api/v1/mobility/battery-types", m.limiter)
	bt.Cap("GET", "/", "batteries:read", m.btypes.list)
	bt.Cap("POST", "/", "batteries:manage", m.btypes.create)
	bt.Cap("GET", "/{id}/", "batteries:read", m.btypes.get)
	bt.Cap("POST", "/{id}/activate/", "battery-types:approve", m.btypes.activate)

	b, bh := router.New(mux, "/api/v1/mobility/batteries", m.limiter), m.bats // BatteryViewSet
	b.Cap("GET", "/", "batteries:read", bh.list)
	b.Cap("POST", "/", "batteries:manage", bh.create)
	b.Cap("GET", "/export/", "batteries:read", bh.export)
	b.Cap("POST", "/resolve/", "batteries:read", bh.resolve)
	b.Cap("GET", "/stats/", "batteries:read", bh.stats)
	b.Cap("GET", "/types/", "batteries:read", bh.types)
	b.Cap("GET", "/{id}/", "batteries:read", bh.get)
	b.Cap("PATCH", "/{id}/", "batteries:manage", bh.patch)
	b.Cap("GET", "/{id}/events/", "batteries:read", bh.events)
	b.Cap("POST", "/{id}/fault/", "batteries:manage", bh.noteAction((*BatteryHandler).faultTx))
	b.Cap("POST", "/{id}/found/", "batteries:manage", bh.noteAction((*BatteryHandler).foundTx))
	b.Cap("GET", "/{id}/label/", "batteries:manage", bh.label)
	b.Cap("POST", "/{id}/retire/", "batteries:manage", bh.noteAction((*BatteryHandler).retireTx))
	b.Cap("POST", "/{id}/rotate-qr/", "batteries:manage", bh.rotateQR)
	b.Cap("POST", "/{id}/status/", "batteries:manage", bh.status())
	b.Cap("POST", "/{id}/transfer/", "batteries:manage", bh.transfer())

	// VehicleViewSet: HasCapabilityOrReadOwn — GETs need sign-in only (scoped;
	// stats / export / models check capabilities in the view).
	v, vh := router.New(mux, "/api/v1/mobility/vehicles", m.limiter), m.vehs
	v.User("GET", "/", vh.list)
	v.Cap("POST", "/", "vehicles:manage", vh.create)
	v.User("GET", "/export/", vh.export)
	v.User("GET", "/models/", vh.models)
	v.Cap("POST", "/resolve/", "swaps:complete", vh.resolve)
	v.User("GET", "/stats/", vh.stats)
	v.User("GET", "/{id}/", vh.get)
	v.Cap("PATCH", "/{id}/", "vehicles:manage", vh.patch())
	v.Cap("POST", "/{id}/assign-driver/", "vehicles:manage", vh.assignDriver())
	v.User("GET", "/{id}/assignments/", vh.assignments)
	v.Cap("POST", "/{id}/command/", "vehicles:manage", vh.command)
	v.User("GET", "/{id}/commands/", vh.commands)
	v.User("GET", "/{id}/qr/", vh.qrCode)
	v.Cap("POST", "/{id}/rotate-iot-key/", "telemetry:ingest", vh.rotateIoTKey)
	v.Cap("POST", "/{id}/retire/", "vehicles:manage", vh.retire())
	v.Cap("POST", "/{id}/rotate-qr/", "swaps:override", vh.rotateQR)
	v.Cap("POST", "/{id}/status/", "vehicles:manage", vh.status())

	vm := router.New(mux, "/api/v1/mobility/vehicle-models", m.limiter)
	vm.Cap("GET", "/", "vehicles:read", m.vmodels.list)
	vm.Cap("POST", "/", "vehicles:manage", m.vmodels.create)
	vm.Cap("GET", "/stats/", "vehicles:read", m.vmodels.stats)
	vm.Cap("GET", "/{id}/", "vehicles:read", m.vmodels.get)
	vm.Cap("PATCH", "/{id}/", "vehicles:manage", m.vmodels.patch)

	pr := router.New(mux, "/api/v1/mobility/pricing", m.limiter)
	pr.User("GET", "/hold-policy/", m.pricing.getHold)
	pr.Cap("PUT", "/hold-policy/", "tariffs:manage", m.pricing.putHold)
	pr.Cap("GET", "/matrices/", "tariffs:manage", m.pricing.list)
	pr.Cap("POST", "/matrices/", "tariffs:manage", m.pricing.create)
	pr.Cap("GET", "/matrices/{id}/", "tariffs:manage", m.pricing.get)
	pr.Cap("POST", "/matrices/{id}/activate/", "price:approve", m.pricing.activate)
	pr.Cap("POST", "/matrices/{id}/reject/", "price:approve", m.pricing.reject)
	pr.Cap("POST", "/matrices/{id}/schedule/", "price:approve", m.pricing.schedule)

	pl := router.New(mux, "/api/v1/mobility/plans", m.limiter) // reads: sign-in only
	pl.User("GET", "/", m.plans.list)
	pl.Cap("POST", "/", "tariffs:manage", m.plans.create)
	pl.User("GET", "/{id}/", m.plans.get)
	pl.Cap("PATCH", "/{id}/", "tariffs:manage", m.plans.patch)
	pl.Cap("POST", "/{id}/activate/", "price:approve", m.plans.setActive(true))
	pl.Cap("POST", "/{id}/deactivate/", "tariffs:manage", m.plans.setActive(false))

	// SubscriptionViewSet: HasCapabilityOrReadOwn (GETs sign-in only, scoped).
	s, sh := router.New(mux, "/api/v1/mobility/subscriptions", m.limiter), m.subs
	s.User("GET", "/", sh.list)
	s.Cap("POST", "/", "swaps:read", sh.create)
	s.User("GET", "/{id}/", sh.get)
	s.Cap("PATCH", "/{id}/auto-renew/", "swaps:read", sh.autoRenew)
	s.Cap("POST", "/{id}/auto-renew/", "swaps:read", sh.autoRenew)
	s.Cap("POST", "/{id}/cancel/", "swaps:read", sh.cancel)
	s.Cap("POST", "/{id}/renew/", "swaps:read", sh.renew)
	s.Cap("POST", "/{id}/switch/", "swaps:read", sh.doSwitch)
	s.Cap("POST", "/{id}/switch-preview/", "swaps:read", sh.switchPreview)

	d, dh := router.New(mux, "/api/v1/mobility/discounts", m.limiter), m.discs
	d.Cap("GET", "/", "tariffs:manage", dh.list)
	d.Cap("POST", "/", "tariffs:manage", dh.create)
	d.User("POST", "/redeem/", dh.redeem)
	d.Cap("GET", "/{id}/", "tariffs:manage", dh.get)
	d.Cap("PATCH", "/{id}/", "tariffs:manage", dh.patch)
	d.Cap("POST", "/{id}/activate/", "price:approve", dh.activate)
	d.Cap("GET", "/{id}/redemptions/", "tariffs:manage", dh.redemptions)

	// ReservationViewSet (HasCapabilityOrReadOwn; no PUT/PATCH/DELETE).
	bay := m.bay
	rv := router.New(mux, "/api/v1/mobility/reservations", m.limiter)
	rv.User("GET", "/", bay.reservations)
	rv.User("GET", "/precheck/", bay.precheck)
	rv.Cap("POST", "/", "swaps:read", bay.createReservationHandler)
	rv.Cap("POST", "/lookup/", "swaps:read", bay.lookup)
	rv.User("GET", "/{id}/", bay.getReservation)
	rv.User("POST", "/{id}/checkout/", bay.reservationCheckoutStart)
	rv.User("GET", "/{id}/checkout/", bay.reservationCheckoutStatus)
	rv.Cap("POST", "/{id}/cancel/", "swaps:read", bay.cancelReservationHandler)
	rv.Cap("POST", "/{id}/extend/", "swaps:override", bay.extendHandler)

	// SwapViewSet (read-only base + bay actions).
	sw := router.New(mux, "/api/v1/mobility/swaps", m.limiter)
	sw.User("GET", "/", bay.swaps)
	sw.Cap("POST", "/start/", "swaps:complete", bay.start)
	sw.Cap("POST", "/complete/", "swaps:complete", bay.completeLegacyHandler)
	sw.Cap("POST", "/identity-mismatch/", "swaps:complete", bay.identityMismatch)
	sw.Cap("GET", "/velocity-status/", "swaps:complete", bay.velocityStatus)
	sw.Cap("POST", "/request-velocity-exception/", "swaps:complete", bay.requestException)
	sw.Cap("POST", "/verify-rider-pin/", "swaps:complete", bay.verifyRiderPin)
	sw.User("GET", "/{id}/", bay.getSwap)
	sw.User("POST", "/{id}/checkout/", bay.swapCheckoutStart)
	sw.User("GET", "/{id}/checkout/", bay.swapCheckoutStatus)
	sw.Cap("POST", "/{id}/return/", "swaps:complete", bay.recordReturnHandler)
	sw.Cap("POST", "/{id}/issue/", "swaps:complete", bay.issue)
	sw.Cap("POST", "/{id}/complete/", "swaps:complete", bay.completeSessionHandler)
	sw.Cap("POST", "/{id}/abort/", "swaps:complete", bay.abort)
	sw.Cap("POST", "/{id}/reverse/", "swaps:reverse", bay.reverse)
}
