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
- [ ] `GET    /api/v1/mobility/eboarders/`
- [ ] `POST   /api/v1/mobility/eboarders/`
- [ ] `GET    /api/v1/mobility/eboarders/stats/`
- [ ] `GET    /api/v1/mobility/eboarders/{id}/`
- [ ] `PATCH  /api/v1/mobility/eboarders/{id}/`
- [ ] `GET    /api/v1/mobility/engines/`
- [ ] `GET    /api/v1/mobility/engines/{id}/`
- [ ] `POST   /api/v1/mobility/engines/{id}/release-request/`
- [ ] `POST   /api/v1/mobility/engines/{id}/release/`
- [x] `GET    /api/v1/mobility/hubs/`
- [x] `POST   /api/v1/mobility/hubs/`
- [x] `GET    /api/v1/mobility/hubs/discover/`
- [x] `GET    /api/v1/mobility/hubs/export/`
- [x] `GET    /api/v1/mobility/hubs/stats/`
- [x] `GET    /api/v1/mobility/hubs/{id}/`
- [x] `PATCH  /api/v1/mobility/hubs/{id}/`
- [x] `GET    /api/v1/mobility/hubs/{id}/slots/`
- [x] `GET    /api/v1/mobility/hubs/{id}/stats/`
- [ ] `POST   /api/v1/mobility/hubs/{id}/status/`
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
- [ ] `GET    /api/v1/mobility/reservations/`
- [ ] `POST   /api/v1/mobility/reservations/`
- [ ] `POST   /api/v1/mobility/reservations/lookup/`
- [ ] `GET    /api/v1/mobility/reservations/{id}/`
- [ ] `PUT    /api/v1/mobility/reservations/{id}/`
- [ ] `PATCH  /api/v1/mobility/reservations/{id}/`
- [ ] `DELETE /api/v1/mobility/reservations/{id}/`
- [ ] `POST   /api/v1/mobility/reservations/{id}/cancel/`
- [ ] `POST   /api/v1/mobility/reservations/{id}/extend/`
- [ ] `GET    /api/v1/mobility/retrofits/`
- [ ] `POST   /api/v1/mobility/retrofits/`
- [ ] `GET    /api/v1/mobility/retrofits/{id}/`
- [ ] `POST   /api/v1/mobility/retrofits/{id}/activate/`
- [ ] `POST   /api/v1/mobility/retrofits/{id}/checklist/`
- [ ] `POST   /api/v1/mobility/retrofits/{id}/engine-intake/`
- [ ] `POST   /api/v1/mobility/retrofits/{id}/install/`
- [x] `GET    /api/v1/mobility/subscriptions/`
- [x] `POST   /api/v1/mobility/subscriptions/`
- [x] `GET    /api/v1/mobility/subscriptions/{id}/`
- [x] `POST   /api/v1/mobility/subscriptions/{id}/auto-renew/`
- [x] `PATCH  /api/v1/mobility/subscriptions/{id}/auto-renew/`
- [x] `POST   /api/v1/mobility/subscriptions/{id}/cancel/`
- [x] `POST   /api/v1/mobility/subscriptions/{id}/renew/`
- [x] `POST   /api/v1/mobility/subscriptions/{id}/switch-preview/`
- [x] `POST   /api/v1/mobility/subscriptions/{id}/switch/`
- [ ] `GET    /api/v1/mobility/swaps/`
- [ ] `POST   /api/v1/mobility/swaps/`
- [ ] `POST   /api/v1/mobility/swaps/complete/`
- [ ] `POST   /api/v1/mobility/swaps/identity-mismatch/`
- [ ] `POST   /api/v1/mobility/swaps/request-velocity-exception/`
- [ ] `POST   /api/v1/mobility/swaps/start/`
- [ ] `GET    /api/v1/mobility/swaps/velocity-status/`
- [ ] `POST   /api/v1/mobility/swaps/verify-rider-pin/`
- [ ] `GET    /api/v1/mobility/swaps/{id}/`
- [ ] `POST   /api/v1/mobility/swaps/{id}/abort/`
- [ ] `POST   /api/v1/mobility/swaps/{id}/complete/`
- [ ] `POST   /api/v1/mobility/swaps/{id}/issue/`
- [ ] `POST   /api/v1/mobility/swaps/{id}/return/`
- [ ] `POST   /api/v1/mobility/swaps/{id}/reverse/`
- [ ] `GET    /api/v1/mobility/telemetry/events/`
- [ ] `POST   /api/v1/mobility/telemetry/events/ingest/`
- [ ] `GET    /api/v1/mobility/telemetry/events/{id}/`
- [ ] `GET    /api/v1/mobility/telemetry/fleet/`
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

- [ ] `GET    /api/v1/operations/activity/`
- [ ] `GET    /api/v1/operations/alert-rules/`
- [ ] `POST   /api/v1/operations/alert-rules/`
- [ ] `GET    /api/v1/operations/alert-rules/{id}/`
- [ ] `PATCH  /api/v1/operations/alert-rules/{id}/`
- [ ] `GET    /api/v1/operations/alerts/`
- [ ] `GET    /api/v1/operations/alerts/export/`
- [ ] `GET    /api/v1/operations/alerts/stats/`
- [ ] `GET    /api/v1/operations/alerts/{id}/`
- [ ] `POST   /api/v1/operations/alerts/{id}/ack/`
- [ ] `POST   /api/v1/operations/alerts/{id}/escalate/`
- [ ] `POST   /api/v1/operations/alerts/{id}/resolve/`
- [ ] `GET    /api/v1/operations/cash-deposits/`
- [ ] `POST   /api/v1/operations/cash-deposits/`
- [ ] `GET    /api/v1/operations/cash-deposits/{id}/`
- [ ] `POST   /api/v1/operations/cash-deposits/{id}/flag/`
- [ ] `GET    /api/v1/operations/cash-deposits/{id}/receipt/`
- [ ] `GET    /api/v1/operations/command-centre/`
- [ ] `GET    /api/v1/operations/inventory-counts/`
- [ ] `POST   /api/v1/operations/inventory-counts/`
- [ ] `GET    /api/v1/operations/overrides/`
- [ ] `POST   /api/v1/operations/overrides/`
- [ ] `GET    /api/v1/operations/overrides/{id}/`
- [ ] `PATCH  /api/v1/operations/overrides/{id}/`
- [ ] `GET    /api/v1/operations/shifts/`
- [ ] `POST   /api/v1/operations/shifts/`
- [ ] `POST   /api/v1/operations/shifts/open/`
- [ ] `GET    /api/v1/operations/shifts/{id}/`
- [ ] `POST   /api/v1/operations/shifts/{id}/close/`
- [ ] `POST   /api/v1/operations/shifts/{id}/lodge/`

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

- [ ] `GET    /api/v1/credit/applications/`
- [ ] `POST   /api/v1/credit/applications/`
- [ ] `GET    /api/v1/credit/applications/{id}/`
- [ ] `POST   /api/v1/credit/applications/{id}/approve/`
- [ ] `POST   /api/v1/credit/applications/{id}/decline/`
- [ ] `GET    /api/v1/credit/eligibility/`
- [ ] `GET    /api/v1/credit/loans/`
- [ ] `GET    /api/v1/credit/loans/{id}/`
- [ ] `POST   /api/v1/credit/loans/{id}/repay/`
- [ ] `POST   /api/v1/credit/offer-assignments/{id}/accept/`
- [ ] `GET    /api/v1/credit/offers/`
- [ ] `POST   /api/v1/credit/offers/`
- [ ] `GET    /api/v1/credit/offers/mine/`
- [ ] `GET    /api/v1/credit/offers/{id}/`
- [ ] `PATCH  /api/v1/credit/offers/{id}/`
- [ ] `POST   /api/v1/credit/offers/{id}/assign/`
- [ ] `GET    /api/v1/credit/scores/`
- [ ] `POST   /api/v1/credit/scores/{account_id}/override/`

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

- [ ] `GET    /api/v1/analytics/cooperative/me/`
- [ ] `GET    /api/v1/analytics/cooperative/{cooperative_id}/`
- [ ] `GET    /api/v1/analytics/dashboard/`
- [ ] `GET    /api/v1/analytics/demand/hubs/`
- [ ] `GET    /api/v1/analytics/impact/`
- [ ] `GET    /api/v1/analytics/revenue/overview/`
- [ ] `GET    /api/v1/analytics/revenue/streams/`
- [ ] `GET    /api/v1/analytics/stories/`
- [ ] `POST   /api/v1/analytics/stories/`
- [ ] `GET    /api/v1/analytics/stories/{id}/`
- [ ] `PATCH  /api/v1/analytics/stories/{id}/`
- [ ] `POST   /api/v1/analytics/stories/{id}/publish/`

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

- [ ] `GET    /api/v1/risk/events/`
- [ ] `POST   /api/v1/risk/events/`
- [ ] `GET    /api/v1/risk/events/export/`
- [ ] `GET    /api/v1/risk/events/stats/`
- [ ] `GET    /api/v1/risk/events/{id}/`
- [ ] `POST   /api/v1/risk/events/{id}/review/`
- [ ] `GET    /api/v1/risk/rules/`
- [ ] `GET    /api/v1/risk/rules/{id}/`
- [ ] `PUT    /api/v1/risk/rules/{id}/`
- [ ] `PATCH  /api/v1/risk/rules/{id}/`

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

- [ ] `GET    /api/v1/support/cases/`
- [ ] `POST   /api/v1/support/cases/`
- [ ] `GET    /api/v1/support/cases/export/`
- [ ] `GET    /api/v1/support/cases/stats/`
- [ ] `GET    /api/v1/support/cases/{id}/`
- [ ] `POST   /api/v1/support/cases/{id}/assign/`
- [ ] `POST   /api/v1/support/cases/{id}/notes/`
- [ ] `POST   /api/v1/support/cases/{id}/status/`

## offers (7)

- [ ] `GET    /api/v1/offers/`
- [ ] `POST   /api/v1/offers/`
- [ ] `POST   /api/v1/offers/assignments/{id}/accept/`
- [ ] `GET    /api/v1/offers/mine/`
- [ ] `GET    /api/v1/offers/{id}/`
- [ ] `PATCH  /api/v1/offers/{id}/`
- [ ] `POST   /api/v1/offers/{id}/assign/`

## segments (7)

- [ ] `GET    /api/v1/segments/`
- [ ] `POST   /api/v1/segments/`
- [ ] `POST   /api/v1/segments/preview/`
- [ ] `GET    /api/v1/segments/{id}/`
- [ ] `PATCH  /api/v1/segments/{id}/`
- [ ] `GET    /api/v1/segments/{id}/members/`
- [ ] `POST   /api/v1/segments/{id}/refresh/`

## config (5)

- [ ] `GET    /api/v1/config/versions/`
- [ ] `GET    /api/v1/config/versions/{id}/`
- [ ] `POST   /api/v1/config/versions/{id}/approve/`
- [ ] `GET    /api/v1/config/{namespace}/`
- [ ] `POST   /api/v1/config/{namespace}/`

## notifications (5)

- [ ] `GET    /api/v1/notifications/`
- [ ] `POST   /api/v1/notifications/read-all/`
- [ ] `GET    /api/v1/notifications/stats/`
- [ ] `GET    /api/v1/notifications/{id}/`
- [ ] `POST   /api/v1/notifications/{id}/read/`

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

- [ ] `GET    /api/v1/webhooks/events/`
- [ ] `GET    /api/v1/webhooks/events/{id}/`
- [ ] `POST   /api/v1/webhooks/nomba`
- [ ] `POST   /api/v1/webhooks/paystack`

## audit (3)

- [ ] `GET    /api/v1/audit/`
- [ ] `GET    /api/v1/audit/stats/`
- [ ] `GET    /api/v1/audit/{id}/`

## reports (3)

- [ ] `POST   /api/v1/reports/`
- [ ] `GET    /api/v1/reports/{report_id}/`
- [ ] `GET    /api/v1/reports/{report_id}/download/`

## permissions (2)

- [x] `GET    /api/v1/permissions/`
- [x] `GET    /api/v1/permissions/{id}/`

## telemetry (2)

- [ ] `POST   /api/v1/telemetry/ingest`
- [ ] `POST   /api/v1/telemetry/ingest/`

## media (1)

- [ ] `POST   /api/v1/media/upload/`
