"""Per-job Django entry point + the rows to compare afterwards."""

RECENT = "created_at > now() - interval '10 minutes'"
AUDIT = (f"SELECT action, subject_type, subject_label, before - 'ends_at', after - 'released_at' - 'ends_at' - 'nuban', "
         f"metadata - 'ends_at', actor_email "
         f"FROM audit_auditevent WHERE {RECENT} ORDER BY action, subject_label, subject_id")
NOTES = (f"SELECT n.template_code, n.title, n.body, n.channel, n.severity, n.source, n.link_path, u.email, u.phone "
         f"FROM notifications_notification n JOIN accounts_user u ON u.id = n.user_id WHERE n.{RECENT} "
         "ORDER BY n.template_code, n.title, n.body, n.channel, u.phone")


def swaps(compare):
    compare("swaps", "from mobility.services.swap.lifecycle import sweep_swap_lifecycle\n"
            "print(json.dumps(sweep_swap_lifecycle(reservation_limit=200, swap_limit=100)))", {
                "reservations": "SELECT code, status, hold_amount_kobo FROM mobility_reservation ORDER BY code",
                "swaps": "SELECT id, status, mismatch_reason, issued_battery_id, returned_battery_id FROM mobility_swap WHERE status <> 'COMPLETED' ORDER BY id",
                "batteries": "SELECT serial, status, custodian_type FROM mobility_battery ORDER BY serial",
                "wallets": "SELECT account_id, balance_kobo, hold_kobo FROM finance_wallet ORDER BY account_id",
                "audit": AUDIT, "notifications": NOTES}, fixture_name="swaps")


def unreturned(compare):
    compare("unreturned", "from mobility.services.batteries.unreturned import process_unreturned_batteries\n"
            "print(json.dumps(process_unreturned_batteries(limit=200)))", {
                "batteries": "SELECT serial, status, custodian_type, custodian_id, current_hub_id FROM mobility_battery "
                             "ORDER BY serial",
                "accounts": "SELECT kura_id, status, risk_status FROM accounts_account ORDER BY kura_id",
                "battery events": f"SELECT b.serial, e.event, e.from_custodian_type, e.to_custodian_type, e.meta, e.source FROM "
                                  f"mobility_batteryevent e JOIN mobility_battery b ON b.id = e.battery_id WHERE e.{RECENT} "
                                  "ORDER BY b.serial",
                "risk": f"SELECT r.code, e.subject_type, e.subject_id, e.action_taken, e.context, e.status, e.severity FROM risk_riskevent e JOIN risk_riskrule r ON r.id = e.rule_id "
                        f"WHERE e.{RECENT} ORDER BY e.subject_id",
                "audit": AUDIT, "notifications": NOTES}, fixture_name="unreturned")


def shifts(compare):
    snaps = {"shifts": "SELECT id, status, expected_cash_kobo, auto_closed, closed_at IS NOT NULL FROM operations_shift "
                       "ORDER BY id",
             "alerts": "SELECT kind, severity, status, message FROM operations_alert ORDER BY kind, message",
             "audit": AUDIT, "notifications": NOTES}
    compare("shifts", "from operations.services.shifts import ShiftService\n"
            "print(json.dumps(ShiftService.auto_close_stale_shifts()))", snaps, fixture_name="shifts")
    compare("settlement", "from operations.services.cash.settlement import CashSettlementService\n"
            "print(json.dumps(CashSettlementService.run_settlement_sweep(stale_hours=12)))", snaps,
            fixture_name="shifts")


def subscriptions(compare):
    compare("subscriptions", "from mobility.services.plans.jobs import expire_due_subscriptions, "
            "renew_due_subscriptions, notify_price_change_before_renew\n"
            "r = {**expire_due_subscriptions(limit=100), **renew_due_subscriptions(limit=100), "
            "**notify_price_change_before_renew(within_hours=24, limit=100)}\nprint(json.dumps(r))", {
                "subscriptions": "SELECT id, status, auto_renew, plan_id, queued_plan_id, ends_at > now() + interval '20 hours', "
                                 "amount_kobo, list_price_kobo, regexp_replace(idempotency_key, '[0-9]+$', 'T') "
                                 "FROM mobility_subscription ORDER BY id",
                "wallets": "SELECT account_id, balance_kobo, hold_kobo FROM finance_wallet ORDER BY account_id",
                "payments": f"SELECT purpose, channel, status, amount_kobo, regexp_replace(idempotency_key, '[0-9]+$', 'T') FROM finance_payment "
                            f"WHERE {RECENT} ORDER BY idempotency_key",
                "audit": AUDIT, "notifications": NOTES}, fixture_name="subscriptions")


def pricing(compare):
    compare("pricing", "from mobility.services.plans.jobs import activate_due_price_matrices\n"
            "print(json.dumps(activate_due_price_matrices(limit=100)))", {
                "matrices": "SELECT id, status, approved_by_id, pay_per_swap_kobo FROM mobility_pricematrix ORDER BY id",
                "plans": "SELECT code, price_kobo FROM mobility_plan ORDER BY code",
                "audit": AUDIT}, fixture_name="pricing")


def credit(compare):
    snaps = {"loans": "SELECT id, status, repaid_kobo, swap_credit_remaining_kobo, grace_until IS NULL, "
                      "grace_until > now() + interval '2 days' FROM credit_loan ORDER BY id",
             "lines": "SELECT account_id, status, limit_kobo, score_id IS NOT NULL FROM credit_creditline ORDER BY account_id",
             "accounts": "SELECT kura_id, risk_status FROM accounts_account ORDER BY kura_id",
             "wallets": "SELECT account_id, balance_kobo FROM finance_wallet ORDER BY account_id",
             "repayments": f"SELECT loan_id, amount_kobo, kind, status, regexp_replace(idempotency_key, '[0-9-]+$', 'D') "
                           f"FROM credit_loanrepayment WHERE {RECENT} ORDER BY loan_id",
             "scores": f"SELECT account_id, score, factors, recommended_limit_kobo, version, computed_by FROM "
                       f"credit_creditscore WHERE {RECENT} ORDER BY account_id",
             "audit": AUDIT, "notifications": NOTES}
    compare("credit_debit", "from credit.services.jobs import auto_debit_loans\n"
            "print(json.dumps(auto_debit_loans(limit=200)))", snaps, fixture_name="credit")
    compare("credit_scores", "from credit.services.jobs import recompute_scores\n"
            "print(json.dumps(recompute_scores(limit=200)))", snaps, fixture_name="credit")
    compare("credit_debit", "from credit.services.jobs import auto_debit_loans\n"
            "print(json.dumps(auto_debit_loans(limit=200)))", {})  # credit off: skipped


def virtual_accounts(compare):
    compare("virtual_accounts", "from integrations.services.va import retry_pending_virtual_accounts\n"
            "print(json.dumps(retry_pending_virtual_accounts(limit=50)))", {
                "virtual accounts": "SELECT account_id, status, provision_attempts, next_attempt_at IS NULL, "
                                    "last_error, nuban IS NULL FROM finance_virtualaccount ORDER BY account_id",
                "audit": AUDIT, "notifications": NOTES}, fixture_name="va")


def mock_iot(compare):
    compare("mock_iot", "from integrations.services.mock_iot_tick import tick_mock_iot\n"
            "print(json.dumps(tick_mock_iot(limit=200)))", {
                "batteries": "SELECT serial, charge_pct, charge_source FROM mobility_battery ORDER BY serial",
                "events": f"SELECT vehicle_id, battery_pct, source, speed_kmh, raw - 'vendor', raw->'vendor'->>'soc' "
                          f"FROM mobility_telemetryevent WHERE {RECENT} ORDER BY vehicle_id",
                "audit": AUDIT}, fixture_name="mock_iot", scrub=("batch",))


JOBS = {"virtual_accounts": virtual_accounts, "mock_iot": mock_iot, "credit": credit, "swaps": swaps, "unreturned": unreturned, "shifts": shifts, "subscriptions": subscriptions,
        "pricing": pricing}
