-- Credit: scores, lines, applications, loans, repayments, swap-credit draws.

-- name: LatestCreditScore :one
SELECT * FROM credit_creditscore WHERE account_id = $1 ORDER BY computed_at DESC LIMIT 1;

-- name: InsertCreditScore :exec
INSERT INTO credit_creditscore (id, created_at, updated_at, score, factors, recommended_limit_kobo, version, computed_by,
  override_reason, computed_at, account_id, override_by_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, $6, $7, clock_timestamp(), $8, $9);

-- name: CreditLineByAccount :one
SELECT * FROM credit_creditline WHERE account_id = $1;

-- name: CreditLineForUpdate :one
SELECT * FROM credit_creditline WHERE account_id = $1 FOR UPDATE;

-- name: EnsureCreditLine :exec
INSERT INTO credit_creditline (id, created_at, updated_at, limit_kobo, status, account_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, 'ELIGIBLE', $3)
ON CONFLICT (account_id) DO NOTHING;

-- name: SaveCreditLineScore :exec
UPDATE credit_creditline SET score_id = $2, limit_kobo = $3, updated_at = now() WHERE account_id = $1;

-- name: ActivateCreditLine :exec
UPDATE credit_creditline SET status = 'ACTIVE', limit_kobo = $2, updated_at = now() WHERE id = $1;

-- name: SetCreditLineStatus :exec
UPDATE credit_creditline SET status = $2, updated_at = now() WHERE id = $1;

-- name: LoanBlocksCredit :one
SELECT EXISTS (SELECT 1 FROM credit_loan WHERE account_id = $1 AND status IN ('ACTIVE', 'GRACE', 'RESTRICTED'));

-- name: SwapOutcomes :one
-- _swap_stats: completed / failed swaps in the last 60 days.
SELECT count(*) FILTER (WHERE status = 'COMPLETED')::int AS completed,
  count(*) FILTER (WHERE status = 'FAILED')::int AS failed
FROM mobility_swap WHERE account_id = $1 AND created_at >= $2;

-- name: TrustedDeviceSeen :many
SELECT device_key, first_seen_at FROM accounts_trusteddevice WHERE account_id = $1 AND status = 'ACTIVE';

-- name: ApplicationByKey :one
SELECT * FROM credit_creditapplication WHERE idempotency_key = $1;

-- name: ApplicationsToday :one
SELECT count(*)::int FROM credit_creditapplication
WHERE account_id = $1 AND (created_at AT TIME ZONE 'Africa/Lagos')::date = sqlc.arg(day)::date;

-- name: InsertApplication :exec
INSERT INTO credit_creditapplication (id, created_at, updated_at, amount_kobo, tenor_days, interest_rate_bps,
  disbursement, status, decision_reason, idempotency_key, account_id, credit_line_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, 'SWAP_CREDIT', 'SUBMITTED', '', $5, $6, $7);

-- name: ApplicationByID :one
SELECT * FROM credit_creditapplication WHERE id = $1;

-- name: ApplicationForUpdate :one
SELECT * FROM credit_creditapplication WHERE id = $1 FOR UPDATE;

-- name: SaveApplicationDecision :exec
UPDATE credit_creditapplication SET status = $2, decided_by_id = $3, decision_reason = $4, updated_at = now() WHERE id = $1;

-- name: ApplicationsPage :many
SELECT a.id, a.created_at FROM credit_creditapplication a
WHERE (sqlc.arg(all_rows)::bool OR a.account_id = sqlc.arg(account)::uuid)
  AND (sqlc.narg(after_at)::timestamptz IS NULL
       OR (sqlc.arg(back)::bool AND (a.created_at, a.id) > (sqlc.narg(after_at), sqlc.arg(after_id)::uuid))
       OR (NOT sqlc.arg(back)::bool AND (a.created_at, a.id) < (sqlc.narg(after_at), sqlc.arg(after_id)::uuid)))
ORDER BY CASE WHEN sqlc.arg(back)::bool THEN a.created_at END, CASE WHEN sqlc.arg(back)::bool THEN a.id END,
  a.created_at DESC, a.id DESC
LIMIT sqlc.arg(lim);

-- name: LoanByApplication :one
SELECT * FROM credit_loan WHERE application_id = $1;

-- name: InsertLoan :exec
INSERT INTO credit_loan (id, created_at, updated_at, principal_kobo, interest_kobo, total_due_kobo, repaid_kobo,
  daily_installment_kobo, swap_credit_remaining_kobo, starts_at, due_at, status, account_id, application_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, 0, $5, $2, $6, $7, 'ACTIVE', $8, $9);

-- name: LoansPage :many
SELECT l.id, l.created_at FROM credit_loan l
WHERE (sqlc.arg(all_rows)::bool OR l.account_id = sqlc.arg(account)::uuid)
  AND (sqlc.narg(after_at)::timestamptz IS NULL
       OR (sqlc.arg(back)::bool AND (l.created_at, l.id) > (sqlc.narg(after_at), sqlc.arg(after_id)::uuid))
       OR (NOT sqlc.arg(back)::bool AND (l.created_at, l.id) < (sqlc.narg(after_at), sqlc.arg(after_id)::uuid)))
ORDER BY CASE WHEN sqlc.arg(back)::bool THEN l.created_at END, CASE WHEN sqlc.arg(back)::bool THEN l.id END,
  l.created_at DESC, l.id DESC
LIMIT sqlc.arg(lim);

-- name: LoanRows :many
SELECT l.*, a.tenor_days, acc.owner_user_id FROM credit_loan l
JOIN credit_creditapplication a ON a.id = l.application_id
JOIN accounts_account acc ON acc.id = l.account_id
WHERE l.id = ANY(sqlc.arg(ids)::uuid[]);

-- name: LoanForUpdate :one
SELECT * FROM credit_loan WHERE id = $1 FOR UPDATE;

-- name: SaveLoanRepaid :exec
UPDATE credit_loan SET repaid_kobo = $2, status = $3, swap_credit_remaining_kobo = $4, updated_at = now() WHERE id = $1;

-- name: SaveLoanCredit :exec
UPDATE credit_loan SET swap_credit_remaining_kobo = $2, updated_at = now() WHERE id = $1;

-- name: RestrictLoan :exec
UPDATE credit_loan SET status = 'RESTRICTED', swap_credit_remaining_kobo = 0, updated_at = now() WHERE id = $1;

-- name: ActiveCreditLoan :one
SELECT * FROM credit_loan WHERE account_id = $1 AND status IN ('ACTIVE', 'GRACE') ORDER BY created_at DESC LIMIT 1;

-- name: ActiveCreditLoanForUpdate :one
SELECT * FROM credit_loan WHERE account_id = $1 AND status IN ('ACTIVE', 'GRACE') ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

-- name: RepaymentByKey :one
SELECT * FROM credit_loanrepayment WHERE idempotency_key = $1;

-- name: InsertRepayment :exec
INSERT INTO credit_loanrepayment (id, created_at, updated_at, amount_kobo, kind, status, idempotency_key, loan_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, 'MANUAL', 'PENDING', $3, $4);

-- name: SaveRepayment :exec
UPDATE credit_loanrepayment SET payment_id = $2, status = 'SUCCESS', updated_at = now() WHERE id = $1;

-- name: ScoresPage :many
SELECT s.id, s.created_at, s.account_id, s.score, s.recommended_limit_kobo, s.computed_by, s.computed_at, s.override_reason
FROM credit_creditscore s
WHERE (sqlc.narg(account)::uuid IS NULL OR s.account_id = sqlc.narg(account))
  AND (sqlc.narg(after_at)::timestamptz IS NULL
       OR (sqlc.arg(back)::bool AND (s.created_at, s.id) > (sqlc.narg(after_at), sqlc.arg(after_id)::uuid))
       OR (NOT sqlc.arg(back)::bool AND (s.created_at, s.id) < (sqlc.narg(after_at), sqlc.arg(after_id)::uuid)))
ORDER BY CASE WHEN sqlc.arg(back)::bool THEN s.created_at END, CASE WHEN sqlc.arg(back)::bool THEN s.id END,
  s.created_at DESC, s.id DESC
LIMIT sqlc.arg(lim);

-- name: RecentLoanForBustout :one
SELECT * FROM credit_loan WHERE account_id = $1 AND status IN ('ACTIVE', 'GRACE') AND starts_at >= $2
ORDER BY starts_at DESC LIMIT 1;

-- name: CompletedSwapsOnDay :one
SELECT count(*)::int FROM mobility_swap WHERE account_id = $1 AND status = 'COMPLETED'
  AND (completed_at AT TIME ZONE 'Africa/Lagos')::date = sqlc.arg(day)::date;

-- name: SwapDayCounts :many
SELECT (completed_at AT TIME ZONE 'Africa/Lagos')::date AS day, count(*)::int AS n FROM mobility_swap
WHERE account_id = $1 AND status = 'COMPLETED' AND completed_at >= $2 AND completed_at < $3
GROUP BY day;

-- name: SegmentByID :one
SELECT * FROM credit_segment WHERE id = $1;

-- name: SegmentAccounts :many
-- accounts_queryset: criteria filters, ordered by created_at.
SELECT a.id, a.kura_id, a.display_name, a.status, a.kyc_status, u.phone AS owner_phone
FROM accounts_account a LEFT JOIN accounts_user u ON u.id = a.owner_user_id
WHERE (sqlc.narg(status)::text IS NULL OR a.status = sqlc.narg(status))
  AND (sqlc.narg(kyc_status)::text IS NULL OR a.kyc_status = sqlc.narg(kyc_status))
  AND (sqlc.narg(kind)::text IS NULL OR a.kind = sqlc.narg(kind))
  AND (sqlc.narg(cooperative)::uuid IS NULL OR a.cooperative_id = sqlc.narg(cooperative))
  AND (sqlc.narg(created_on_or_before)::date IS NULL
       OR (a.created_at AT TIME ZONE 'Africa/Lagos')::date <= sqlc.narg(created_on_or_before))
  AND (sqlc.narg(created_on_or_after)::date IS NULL
       OR (a.created_at AT TIME ZONE 'Africa/Lagos')::date >= sqlc.narg(created_on_or_after))
  AND (sqlc.narg(min_score)::int IS NULL OR (SELECT s.score FROM credit_creditscore s WHERE s.account_id = a.id
       ORDER BY s.computed_at DESC LIMIT 1) >= sqlc.narg(min_score))
ORDER BY a.created_at
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountSegmentAccounts :one
SELECT count(*) FROM accounts_account a
WHERE (sqlc.narg(status)::text IS NULL OR a.status = sqlc.narg(status))
  AND (sqlc.narg(kyc_status)::text IS NULL OR a.kyc_status = sqlc.narg(kyc_status))
  AND (sqlc.narg(kind)::text IS NULL OR a.kind = sqlc.narg(kind))
  AND (sqlc.narg(cooperative)::uuid IS NULL OR a.cooperative_id = sqlc.narg(cooperative))
  AND (sqlc.narg(created_on_or_before)::date IS NULL
       OR (a.created_at AT TIME ZONE 'Africa/Lagos')::date <= sqlc.narg(created_on_or_before))
  AND (sqlc.narg(created_on_or_after)::date IS NULL
       OR (a.created_at AT TIME ZONE 'Africa/Lagos')::date >= sqlc.narg(created_on_or_after))
  AND (sqlc.narg(min_score)::int IS NULL OR (SELECT s.score FROM credit_creditscore s WHERE s.account_id = a.id
       ORDER BY s.computed_at DESC LIMIT 1) >= sqlc.narg(min_score));

-- name: SegmentsPage :many
SELECT * FROM credit_segment
WHERE (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status))
  AND (sqlc.narg(search)::text IS NULL OR name ILIKE '%' || sqlc.narg(search) || '%')
  AND (sqlc.narg(q)::text IS NULL OR name ILIKE '%' || sqlc.narg(q) || '%')
ORDER BY updated_at DESC LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountSegments :one
SELECT count(*) FROM credit_segment
WHERE (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status))
  AND (sqlc.narg(search)::text IS NULL OR name ILIKE '%' || sqlc.narg(search) || '%')
  AND (sqlc.narg(q)::text IS NULL OR name ILIKE '%' || sqlc.narg(q) || '%');

-- name: InsertSegment :exec
INSERT INTO credit_segment (id, created_at, updated_at, name, criteria, status, last_count, last_evaluated_at)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, clock_timestamp());

-- name: SaveSegment :exec
UPDATE credit_segment SET name = $2, criteria = $3, status = $4, last_count = $5, last_evaluated_at = $6,
  updated_at = now() WHERE id = $1;

-- name: OffersPage :many
SELECT * FROM credit_productoffer ORDER BY created_at DESC LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountOffers :one
SELECT count(*) FROM credit_productoffer;

-- name: OfferByID :one
SELECT * FROM credit_productoffer WHERE id = $1;

-- name: InsertOffer :exec
INSERT INTO credit_productoffer (id, created_at, updated_at, name, offer_type, summary, terms, segment_criteria, status)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, $6, $7);

-- name: SaveOffer :exec
UPDATE credit_productoffer SET name = $2, summary = $3, terms = $4, segment_criteria = $5, status = $6,
  updated_at = now() WHERE id = $1;

-- name: AssignmentByAccountOffer :one
SELECT * FROM credit_offerassignment WHERE account_id = $1 AND offer_id = $2;

-- name: InsertOfferAssignment :exec
INSERT INTO credit_offerassignment (id, created_at, updated_at, status, channel, account_id, offer_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), 'OFFERED', $2, $3, $4);

-- name: AssignmentsForAccount :many
SELECT a.*, o.name AS offer_name, o.offer_type, o.summary FROM credit_offerassignment a
JOIN credit_productoffer o ON o.id = a.offer_id WHERE a.account_id = $1 ORDER BY a.updated_at DESC;

-- name: AssignmentByID :one
SELECT * FROM credit_offerassignment WHERE id = $1;

-- name: SaveAssignmentAccepted :exec
UPDATE credit_offerassignment SET status = 'ACCEPTED', amount_kobo = $2, updated_at = now() WHERE id = $1;
