# Endpoint parity checklist

Generated from the Django OpenAPI schema (317 operations).
Tick an item only when the Go handler exists **and** a contract test compares it with Django.

## mobility (125)

- [x] `GET    /api/v1/mobility/batteries/`
- [x] `POST   /api/v1/mobility/batteries/`
- [x] `GET    /api/v1/mobility/batteries/export/`
- [x] `POST   /api/v1/mobility/batteries/resolve/`
- [x] `GET    /api/v1/mobility/batteries/stats/`
- [x] `GET    /api/v1/mobility/batteries/types/`
- [x] `GET    /api/v1/mobility/batteries/{id}/`
- [x] `PATCH  /api/v1/mobility/batteries/{id}/`
- [x] `GET    /api/v1/mobility/batteries/{id}/events/`
- [x] `POST   /api/v1/mobility/batteries/{id}/fault/`
- [x] `POST   /api/v1/mobility/batteries/{id}/found/`
- [x] `GET    /api/v1/mobility/batteries/{id}/label/`
- [x] `POST   /api/v1/mobility/batteries/{id}/retire/`
- [x] `POST   /api/v1/mobility/batteries/{id}/rotate-qr/`
- [x] `POST   /api/v1/mobility/batteries/{id}/status/`
- [x] `POST   /api/v1/mobility/batteries/{id}/transfer/`
- [x] `GET    /api/v1/mobility/battery-types/`
- [x] `POST   /api/v1/mobility/battery-types/`
- [x] `GET    /api/v1/mobility/battery-types/{id}/`
- [x] `POST   /api/v1/mobility/battery-types/{id}/activate/`
- [x] `GET    /api/v1/mobility/discounts/`
- [x] `POST   /api/v1/mobility/discounts/`
- [x] `POST   /api/v1/mobility/discounts/redeem/`
- [x] `GET    /api/v1/mobility/discounts/{id}/`
- [x] `PATCH  /api/v1/mobility/discounts/{id}/`
- [x] `POST   /api/v1/mobility/discounts/{id}/activate/`
- [x] `GET    /api/v1/mobility/discounts/{id}/redemptions/`
- [x] `GET    /api/v1/mobility/eboarders/`
- [x] `POST   /api/v1/mobility/eboarders/`
- [x] `GET    /api/v1/mobility/eboarders/stats/`
- [x] `GET    /api/v1/mobility/eboarders/{id}/`
- [x] `PATCH  /api/v1/mobility/eboarders/{id}/`
- [x] `GET    /api/v1/mobility/engines/`
- [x] `GET    /api/v1/mobility/engines/{id}/`
- [x] `POST   /api/v1/mobility/engines/{id}/release-request/`
- [x] `POST   /api/v1/mobility/engines/{id}/release/`
- [x] `GET    /api/v1/mobility/hubs/`
- [x] `POST   /api/v1/mobility/hubs/`
- [x] `GET    /api/v1/mobility/hubs/discover/`
- [x] `GET    /api/v1/mobility/hubs/export/`
- [x] `GET    /api/v1/mobility/hubs/stats/`
- [x] `GET    /api/v1/mobility/hubs/{id}/`
- [x] `PATCH  /api/v1/mobility/hubs/{id}/`
- [x] `GET    /api/v1/mobility/hubs/{id}/slots/`
- [x] `GET    /api/v1/mobility/hubs/{id}/stats/`
- [x] `POST   /api/v1/mobility/hubs/{id}/status/`
- [x] `GET    /api/v1/mobility/plans/`
- [x] `POST   /api/v1/mobility/plans/`
- [x] `GET    /api/v1/mobility/plans/{id}/`
- [x] `PATCH  /api/v1/mobility/plans/{id}/`
- [x] `POST   /api/v1/mobility/plans/{id}/activate/`
- [x] `POST   /api/v1/mobility/plans/{id}/deactivate/`
- [x] `GET    /api/v1/mobility/pricing/hold-policy/`
- [x] `PUT    /api/v1/mobility/pricing/hold-policy/`
- [x] `GET    /api/v1/mobility/pricing/matrices/`
- [x] `POST   /api/v1/mobility/pricing/matrices/`
- [x] `GET    /api/v1/mobility/pricing/matrices/{id}/`
- [x] `POST   /api/v1/mobility/pricing/matrices/{id}/activate/`
- [x] `POST   /api/v1/mobility/pricing/matrices/{id}/reject/`
- [x] `POST   /api/v1/mobility/pricing/matrices/{id}/schedule/`
- [x] `GET    /api/v1/mobility/reservations/`
- [x] `POST   /api/v1/mobility/reservations/`
- [x] `POST   /api/v1/mobility/reservations/lookup/`
- [x] `GET    /api/v1/mobility/reservations/{id}/`
- [x] `PUT    /api/v1/mobility/reservations/{id}/` — closed (405 in both; was an unauthenticated-write hole)
- [x] `PATCH  /api/v1/mobility/reservations/{id}/` — closed (405 in both; was an unauthenticated-write hole)
- [x] `DELETE /api/v1/mobility/reservations/{id}/` — closed (405 in both; was an unauthenticated-write hole)
- [x] `POST   /api/v1/mobility/reservations/{id}/cancel/`
- [x] `POST   /api/v1/mobility/reservations/{id}/extend/`
- [x] `GET    /api/v1/mobility/retrofits/`
- [x] `POST   /api/v1/mobility/retrofits/`
- [x] `GET    /api/v1/mobility/retrofits/{id}/`
- [x] `POST   /api/v1/mobility/retrofits/{id}/activate/`
- [x] `POST   /api/v1/mobility/retrofits/{id}/checklist/`
- [x] `POST   /api/v1/mobility/retrofits/{id}/engine-intake/`
- [x] `POST   /api/v1/mobility/retrofits/{id}/install/`
- [x] `GET    /api/v1/mobility/subscriptions/`
- [x] `POST   /api/v1/mobility/subscriptions/`
- [x] `GET    /api/v1/mobility/subscriptions/{id}/`
- [x] `POST   /api/v1/mobility/subscriptions/{id}/auto-renew/`
- [x] `PATCH  /api/v1/mobility/subscriptions/{id}/auto-renew/`
- [x] `POST   /api/v1/mobility/subscriptions/{id}/cancel/`
- [x] `POST   /api/v1/mobility/subscriptions/{id}/renew/`
- [x] `POST   /api/v1/mobility/subscriptions/{id}/switch-preview/`
- [x] `POST   /api/v1/mobility/subscriptions/{id}/switch/`
- [x] `GET    /api/v1/mobility/swaps/`
- [x] `POST   /api/v1/mobility/swaps/` — closed (405 in both; was an unauthenticated-write hole)
- [x] `POST   /api/v1/mobility/swaps/complete/`
- [x] `POST   /api/v1/mobility/swaps/identity-mismatch/`
- [x] `POST   /api/v1/mobility/swaps/request-velocity-exception/`
- [x] `POST   /api/v1/mobility/swaps/start/`
- [x] `GET    /api/v1/mobility/swaps/velocity-status/`
- [x] `POST   /api/v1/mobility/swaps/verify-rider-pin/`
- [x] `GET    /api/v1/mobility/swaps/{id}/`
- [x] `POST   /api/v1/mobility/swaps/{id}/abort/`
- [x] `POST   /api/v1/mobility/swaps/{id}/complete/`
- [x] `POST   /api/v1/mobility/swaps/{id}/issue/`
- [x] `POST   /api/v1/mobility/swaps/{id}/return/`
- [x] `POST   /api/v1/mobility/swaps/{id}/reverse/`
- [x] `GET    /api/v1/mobility/telemetry/events/`
- [x] `POST   /api/v1/mobility/telemetry/events/ingest/`
- [x] `GET    /api/v1/mobility/telemetry/events/{id}/`
- [x] `GET    /api/v1/mobility/telemetry/fleet/`
- [x] `GET    /api/v1/mobility/vehicle-models/`
- [x] `POST   /api/v1/mobility/vehicle-models/`
- [x] `GET    /api/v1/mobility/vehicle-models/stats/`
- [x] `GET    /api/v1/mobility/vehicle-models/{id}/`
- [x] `PATCH  /api/v1/mobility/vehicle-models/{id}/`
- [x] `GET    /api/v1/mobility/vehicles/`
- [x] `POST   /api/v1/mobility/vehicles/`
- [x] `GET    /api/v1/mobility/vehicles/export/`
- [x] `GET    /api/v1/mobility/vehicles/models/`
- [x] `POST   /api/v1/mobility/vehicles/resolve/`
- [x] `GET    /api/v1/mobility/vehicles/stats/`
- [x] `GET    /api/v1/mobility/vehicles/{id}/`
- [x] `PATCH  /api/v1/mobility/vehicles/{id}/`
- [x] `POST   /api/v1/mobility/vehicles/{id}/assign-driver/`
- [x] `GET    /api/v1/mobility/vehicles/{id}/assignments/`
- [x] `POST   /api/v1/mobility/vehicles/{id}/command/`
- [x] `GET    /api/v1/mobility/vehicles/{id}/commands/`
- [x] `GET    /api/v1/mobility/vehicles/{id}/qr/`
- [x] `POST   /api/v1/mobility/vehicles/{id}/retire/`
- [x] `POST   /api/v1/mobility/vehicles/{id}/rotate-iot-key/`
- [x] `POST   /api/v1/mobility/vehicles/{id}/rotate-qr/`
- [x] `POST   /api/v1/mobility/vehicles/{id}/status/`

## operations (30)

- [x] `GET    /api/v1/operations/activity/`
- [x] `GET    /api/v1/operations/alert-rules/`
- [x] `POST   /api/v1/operations/alert-rules/`
- [x] `GET    /api/v1/operations/alert-rules/{id}/`
- [x] `PATCH  /api/v1/operations/alert-rules/{id}/`
- [x] `GET    /api/v1/operations/alerts/`
- [x] `GET    /api/v1/operations/alerts/export/`
- [x] `GET    /api/v1/operations/alerts/stats/`
- [x] `GET    /api/v1/operations/alerts/{id}/`
- [x] `POST   /api/v1/operations/alerts/{id}/ack/`
- [x] `POST   /api/v1/operations/alerts/{id}/escalate/`
- [x] `POST   /api/v1/operations/alerts/{id}/resolve/`
- [x] `GET    /api/v1/operations/cash-deposits/`
- [x] `POST   /api/v1/operations/cash-deposits/`
- [x] `GET    /api/v1/operations/cash-deposits/{id}/`
- [x] `POST   /api/v1/operations/cash-deposits/{id}/flag/`
- [x] `GET    /api/v1/operations/cash-deposits/{id}/receipt/`
- [x] `GET    /api/v1/operations/command-centre/`
- [x] `GET    /api/v1/operations/inventory-counts/`
- [x] `POST   /api/v1/operations/inventory-counts/`
- [x] `GET    /api/v1/operations/overrides/`
- [x] `POST   /api/v1/operations/overrides/`
- [x] `GET    /api/v1/operations/overrides/{id}/`
- [x] `PATCH  /api/v1/operations/overrides/{id}/`
- [x] `GET    /api/v1/operations/shifts/`
- [x] `POST   /api/v1/operations/shifts/`
- [x] `POST   /api/v1/operations/shifts/open/`
- [x] `GET    /api/v1/operations/shifts/{id}/`
- [x] `POST   /api/v1/operations/shifts/{id}/close/`
- [x] `POST   /api/v1/operations/shifts/{id}/lodge/`

## accounts (22)

- [x] `GET    /api/v1/accounts/`
- [x] `POST   /api/v1/accounts/`
- [x] `GET    /api/v1/accounts/export/`
- [x] `POST   /api/v1/accounts/identity/`
- [x] `POST   /api/v1/accounts/identity/photos/`
- [x] `POST   /api/v1/accounts/identity/withdraw/`
- [x] `GET    /api/v1/accounts/me/fleet-spend/`
- [x] `GET    /api/v1/accounts/me/impact/`
- [x] `POST   /api/v1/accounts/register/`
- [x] `GET    /api/v1/accounts/stats/`
- [x] `GET    /api/v1/accounts/{id}/`
- [x] `PATCH  /api/v1/accounts/{id}/`
- [x] `GET    /api/v1/accounts/{id}/kyc/`
- [x] `POST   /api/v1/accounts/{id}/kyc/reject/`
- [x] `POST   /api/v1/accounts/{id}/kyc/request-photos/`
- [x] `POST   /api/v1/accounts/{id}/kyc/submit/`
- [x] `POST   /api/v1/accounts/{id}/kyc/verify/`
- [x] `POST   /api/v1/accounts/{id}/notify/`
- [x] `POST   /api/v1/accounts/{id}/reinstate/`
- [x] `POST   /api/v1/accounts/{id}/set-cooperative/`
- [x] `GET    /api/v1/accounts/{id}/stats/`
- [x] `POST   /api/v1/accounts/{id}/suspend/`

## credit (18)

- [x] `GET    /api/v1/credit/applications/`
- [x] `POST   /api/v1/credit/applications/`
- [x] `GET    /api/v1/credit/applications/{id}/`
- [x] `POST   /api/v1/credit/applications/{id}/approve/`
- [x] `POST   /api/v1/credit/applications/{id}/decline/`
- [x] `GET    /api/v1/credit/eligibility/`
- [x] `GET    /api/v1/credit/loans/`
- [x] `GET    /api/v1/credit/loans/{id}/`
- [x] `POST   /api/v1/credit/loans/{id}/repay/`
- [x] `POST   /api/v1/credit/offer-assignments/{id}/accept/`
- [x] `GET    /api/v1/credit/offers/`
- [x] `POST   /api/v1/credit/offers/`
- [x] `GET    /api/v1/credit/offers/mine/`
- [x] `GET    /api/v1/credit/offers/{id}/`
- [x] `PATCH  /api/v1/credit/offers/{id}/`
- [x] `POST   /api/v1/credit/offers/{id}/assign/`
- [x] `GET    /api/v1/credit/scores/`
- [x] `POST   /api/v1/credit/scores/{account_id}/override/`

## auth (17)

- [x] `POST   /api/v1/auth/devices/heartbeat/`
- [x] `POST   /api/v1/auth/login/`
- [x] `POST   /api/v1/auth/login/begin/`
- [x] `POST   /api/v1/auth/logout/`
- [x] `GET    /api/v1/auth/me/`
- [x] `POST   /api/v1/auth/me/consent/`
- [x] `PATCH  /api/v1/auth/me/profile/`
- [x] `POST   /api/v1/auth/onboarding/complete/`
- [x] `POST   /api/v1/auth/otp/request/`
- [x] `POST   /api/v1/auth/otp/verify/`
- [x] `POST   /api/v1/auth/password-setup/`
- [x] `POST   /api/v1/auth/password-setup/context/`
- [x] `POST   /api/v1/auth/password/change/`
- [x] `POST   /api/v1/auth/pin/login/`
- [x] `POST   /api/v1/auth/pin/set/`
- [x] `POST   /api/v1/auth/pin/verify/`
- [x] `POST   /api/v1/auth/token/refresh/`

## analytics (12)

- [x] `GET    /api/v1/analytics/cooperative/me/`
- [x] `GET    /api/v1/analytics/cooperative/{cooperative_id}/`
- [x] `GET    /api/v1/analytics/dashboard/`
- [x] `GET    /api/v1/analytics/demand/hubs/`
- [x] `GET    /api/v1/analytics/impact/`
- [x] `GET    /api/v1/analytics/revenue/overview/`
- [x] `GET    /api/v1/analytics/revenue/streams/`
- [x] `GET    /api/v1/analytics/stories/`
- [x] `POST   /api/v1/analytics/stories/`
- [x] `GET    /api/v1/analytics/stories/{id}/`
- [x] `PATCH  /api/v1/analytics/stories/{id}/`
- [x] `POST   /api/v1/analytics/stories/{id}/publish/`

## finance (11)

- [x] `GET    /api/v1/finance/ledger/`
- [x] `GET    /api/v1/finance/ledger/{id}/`
- [x] `GET    /api/v1/finance/payments/`
- [x] `GET    /api/v1/finance/payments/export/`
- [x] `GET    /api/v1/finance/payments/stats/`
- [x] `GET    /api/v1/finance/payments/{id}/`
- [x] `GET    /api/v1/finance/payments/{id}/receipt/`
- [x] `GET    /api/v1/finance/wallets/`
- [x] `POST   /api/v1/finance/wallets/fund/`
- [x] `GET    /api/v1/finance/wallets/mine/`
- [x] `GET    /api/v1/finance/wallets/{id}/`

## risk (10)

- [x] `GET    /api/v1/risk/events/`
- [x] `POST   /api/v1/risk/events/`
- [x] `GET    /api/v1/risk/events/export/`
- [x] `GET    /api/v1/risk/events/stats/`
- [x] `GET    /api/v1/risk/events/{id}/`
- [x] `POST   /api/v1/risk/events/{id}/review/`
- [x] `GET    /api/v1/risk/rules/`
- [x] `GET    /api/v1/risk/rules/{id}/`
- [x] `PUT    /api/v1/risk/rules/{id}/`
- [x] `PATCH  /api/v1/risk/rules/{id}/`

## users (9)

- [x] `GET    /api/v1/users/`
- [x] `POST   /api/v1/users/`
- [x] `GET    /api/v1/users/export/`
- [x] `GET    /api/v1/users/stats/`
- [x] `GET    /api/v1/users/{id}/`
- [x] `PATCH  /api/v1/users/{id}/`
- [x] `POST   /api/v1/users/{id}/activate/`
- [x] `POST   /api/v1/users/{id}/deactivate/`
- [x] `POST   /api/v1/users/{id}/resend-invite/`

## roles (8)

- [x] `GET    /api/v1/roles/`
- [x] `POST   /api/v1/roles/`
- [x] `GET    /api/v1/roles/export/`
- [x] `GET    /api/v1/roles/stats/`
- [x] `GET    /api/v1/roles/{id}/`
- [x] `PATCH  /api/v1/roles/{id}/`
- [x] `POST   /api/v1/roles/{id}/activate/`
- [x] `POST   /api/v1/roles/{id}/deactivate/`

## support (8)

- [x] `GET    /api/v1/support/cases/`
- [x] `POST   /api/v1/support/cases/`
- [x] `GET    /api/v1/support/cases/export/`
- [x] `GET    /api/v1/support/cases/stats/`
- [x] `GET    /api/v1/support/cases/{id}/`
- [x] `POST   /api/v1/support/cases/{id}/assign/`
- [x] `POST   /api/v1/support/cases/{id}/notes/`
- [x] `POST   /api/v1/support/cases/{id}/status/`

## offers (7)

- [x] `GET    /api/v1/offers/`
- [x] `POST   /api/v1/offers/`
- [x] `POST   /api/v1/offers/assignments/{id}/accept/`
- [x] `GET    /api/v1/offers/mine/`
- [x] `GET    /api/v1/offers/{id}/`
- [x] `PATCH  /api/v1/offers/{id}/`
- [x] `POST   /api/v1/offers/{id}/assign/`

## segments (7)

- [x] `GET    /api/v1/segments/`
- [x] `POST   /api/v1/segments/`
- [x] `POST   /api/v1/segments/preview/`
- [x] `GET    /api/v1/segments/{id}/`
- [x] `PATCH  /api/v1/segments/{id}/`
- [x] `GET    /api/v1/segments/{id}/members/`
- [x] `POST   /api/v1/segments/{id}/refresh/`

## config (5)

- [x] `GET    /api/v1/config/versions/`
- [x] `GET    /api/v1/config/versions/{id}/`
- [x] `POST   /api/v1/config/versions/{id}/approve/`
- [x] `GET    /api/v1/config/{namespace}/`
- [x] `POST   /api/v1/config/{namespace}/`

## notifications (5)

- [x] `GET    /api/v1/notifications/`
- [x] `POST   /api/v1/notifications/read-all/`
- [x] `GET    /api/v1/notifications/stats/`
- [x] `GET    /api/v1/notifications/{id}/`
- [x] `POST   /api/v1/notifications/{id}/read/`

## cooperatives (4)

- [x] `GET    /api/v1/cooperatives/`
- [x] `POST   /api/v1/cooperatives/`
- [x] `GET    /api/v1/cooperatives/{id}/`
- [x] `PATCH  /api/v1/cooperatives/{id}/`

## drivers (4)

- [x] `GET    /api/v1/drivers/`
- [x] `POST   /api/v1/drivers/attach/`
- [x] `GET    /api/v1/drivers/{id}/`
- [x] `PATCH  /api/v1/drivers/{id}/`

## webhooks (4)

- [x] `GET    /api/v1/webhooks/events/`
- [x] `GET    /api/v1/webhooks/events/{id}/`
- [x] `POST   /api/v1/webhooks/nomba`
- [x] `POST   /api/v1/webhooks/paystack`

## audit (3)

- [x] `GET    /api/v1/audit/`
- [x] `GET    /api/v1/audit/stats/`
- [x] `GET    /api/v1/audit/{id}/`

## reports (3)

- [x] `POST   /api/v1/reports/`
- [x] `GET    /api/v1/reports/{report_id}/`
- [x] `GET    /api/v1/reports/{report_id}/download/`

## permissions (2)

- [x] `GET    /api/v1/permissions/`
- [x] `GET    /api/v1/permissions/{id}/`

## telemetry (2)

- [x] `POST   /api/v1/telemetry/ingest`
- [x] `POST   /api/v1/telemetry/ingest/`

## media (1)

- [ ] `POST   /api/v1/media/upload/`
