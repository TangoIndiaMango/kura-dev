-- Account CRM (AccountViewSet). Scope: all / ids / owner (accounts_for).

-- name: ListAccountIDs :many
SELECT a.id FROM accounts_account a JOIN accounts_user o ON o.id = a.owner_user_id
WHERE (sqlc.arg(all_rows)::bool OR a.id = ANY(sqlc.arg(scope_ids)::uuid[]) OR a.owner_user_id = sqlc.narg(owner))
  AND (sqlc.narg(status)::text IS NULL OR a.status = sqlc.narg(status))
  AND (sqlc.narg(kyc_status)::text IS NULL OR a.kyc_status = sqlc.narg(kyc_status))
  AND (sqlc.narg(kind)::text IS NULL OR a.kind = sqlc.narg(kind))
  AND (sqlc.narg(created_from)::timestamptz IS NULL OR a.created_at >= sqlc.narg(created_from))
  AND (sqlc.narg(created_to)::timestamptz IS NULL OR a.created_at <= sqlc.narg(created_to))
  AND (sqlc.narg(after)::timestamptz IS NULL OR a.created_at >= sqlc.narg(after))
  AND (sqlc.narg(before)::timestamptz IS NULL OR a.created_at <= sqlc.narg(before))
  AND (sqlc.narg(q)::text IS NULL OR a.kura_id ILIKE '%' || sqlc.narg(q) || '%'
       OR a.display_name ILIKE '%' || sqlc.narg(q) || '%' OR o.phone ILIKE '%' || sqlc.narg(q) || '%'
       OR o.email ILIKE '%' || sqlc.narg(q) || '%'
       OR EXISTS (SELECT 1 FROM mobility_vehicle v WHERE v.account_id = a.id
                  AND (v.registration_plate ILIKE '%' || sqlc.narg(q) || '%' OR v.hardware_id ILIKE '%' || sqlc.narg(q) || '%')))
-- ?ordering= (OrderingFilter over created_at / display_name); default newest first.
ORDER BY CASE WHEN sqlc.arg(ord)::text = 'display_name' THEN a.display_name END,
  CASE WHEN sqlc.arg(ord)::text = '-display_name' THEN a.display_name END DESC,
  CASE WHEN sqlc.arg(ord)::text = 'created_at' THEN a.created_at END,
  a.created_at DESC, a.id
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: CountAccounts :one
SELECT count(*) FROM accounts_account a JOIN accounts_user o ON o.id = a.owner_user_id
WHERE (sqlc.arg(all_rows)::bool OR a.id = ANY(sqlc.arg(scope_ids)::uuid[]) OR a.owner_user_id = sqlc.narg(owner))
  AND (sqlc.narg(status)::text IS NULL OR a.status = sqlc.narg(status))
  AND (sqlc.narg(kyc_status)::text IS NULL OR a.kyc_status = sqlc.narg(kyc_status))
  AND (sqlc.narg(kind)::text IS NULL OR a.kind = sqlc.narg(kind))
  AND (sqlc.narg(created_from)::timestamptz IS NULL OR a.created_at >= sqlc.narg(created_from))
  AND (sqlc.narg(created_to)::timestamptz IS NULL OR a.created_at <= sqlc.narg(created_to))
  AND (sqlc.narg(after)::timestamptz IS NULL OR a.created_at >= sqlc.narg(after))
  AND (sqlc.narg(before)::timestamptz IS NULL OR a.created_at <= sqlc.narg(before))
  AND (sqlc.narg(q)::text IS NULL OR a.kura_id ILIKE '%' || sqlc.narg(q) || '%'
       OR a.display_name ILIKE '%' || sqlc.narg(q) || '%' OR o.phone ILIKE '%' || sqlc.narg(q) || '%'
       OR o.email ILIKE '%' || sqlc.narg(q) || '%'
       OR EXISTS (SELECT 1 FROM mobility_vehicle v WHERE v.account_id = a.id
                  AND (v.registration_plate ILIKE '%' || sqlc.narg(q) || '%' OR v.hardware_id ILIKE '%' || sqlc.narg(q) || '%')));

-- name: CrmRows :many
-- Every CRM column for a set of accounts in one round trip.
SELECT a.id, a.kura_id, a.kind, a.display_name, a.status, a.kyc_status, a.psp,
  a.registration_channel, a.created_at, a.owner_user_id, a.cooperative_id,
  o.phone, o.email, c.name AS cooperative_name,
  (doc.doc_type IS NOT NULL)::bool AS has_doc,
  COALESCE(doc.doc_type, '')::text AS doc_type, COALESCE(doc.number_last4, '')::text AS number_last4,
  COALESCE(doc.status, '')::text AS doc_status, COALESCE(doc.verified_via, '')::text AS verified_via,
  ph.provider AS photo_provider, ph.storage_key AS photo_key, ph.resource_type AS photo_resource,
  ph.visibility AS photo_visibility,
  COALESCE((SELECT v.registration_plate FROM mobility_vehicle v WHERE v.account_id = a.id
     ORDER BY v.created_at, v.id LIMIT 1), '')::text AS primary_vehicle_reg,
  (SELECT count(*) FROM mobility_vehicle v WHERE v.account_id = a.id)::int AS vehicle_count,
  -- Django reads the newest subscription of any status here (kept for parity).
  COALESCE((SELECT p.name FROM mobility_subscription s JOIN mobility_plan p ON p.id = s.plan_id
     WHERE s.account_id = a.id ORDER BY s.created_at DESC, s.id DESC LIMIT 1), '')::text AS active_plan_name,
  COALESCE((SELECT w.id::text FROM finance_wallet w WHERE w.account_id = a.id), '')::text AS wallet_id
FROM accounts_account a
JOIN accounts_user o ON o.id = a.owner_user_id
LEFT JOIN accounts_cooperative c ON c.id = a.cooperative_id
LEFT JOIN LATERAL (SELECT d.doc_type, d.number_last4, d.status, d.verified_via
  FROM accounts_identitydocument d WHERE d.account_id = a.id ORDER BY d.created_at DESC, d.id DESC LIMIT 1) doc ON true
LEFT JOIN LATERAL (SELECT dr.photo_id FROM accounts_driver dr
  WHERE dr.account_id = a.id ORDER BY dr.created_at, dr.id LIMIT 1) fd ON true
LEFT JOIN core_mediaasset ph ON ph.id = fd.photo_id
WHERE a.id = ANY(sqlc.arg(ids)::uuid[]);

-- name: AccountDriverIDs :many
SELECT id FROM accounts_driver WHERE account_id = $1 ORDER BY created_at, id;

-- name: AccountVehicleIDs :many
SELECT id FROM mobility_vehicle WHERE account_id = $1 ORDER BY created_at, id;

-- name: AccountStatusCounts :many
-- account_stats totals: one row per (status, kyc_status) in the created range.
SELECT status, kyc_status, count(*)::int AS n FROM accounts_account
WHERE (sqlc.narg(created_from)::timestamptz IS NULL OR created_at >= sqlc.narg(created_from))
  AND (sqlc.narg(created_to)::timestamptz IS NULL OR created_at <= sqlc.narg(created_to))
GROUP BY status, kyc_status;

-- name: AccountWeeklyRegistrations :many
-- TruncWeek in Africa/Lagos (Django TIME_ZONE), Monday-start weeks.
SELECT date_trunc('week', created_at AT TIME ZONE 'Africa/Lagos')::date AS week, count(*)::int AS n
FROM accounts_account
WHERE (sqlc.narg(created_from)::timestamptz IS NULL OR created_at >= sqlc.narg(created_from))
  AND (sqlc.narg(created_to)::timestamptz IS NULL OR created_at <= sqlc.narg(created_to))
GROUP BY 1 ORDER BY 1;
