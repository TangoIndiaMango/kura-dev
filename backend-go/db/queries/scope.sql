-- name: MembershipHubIDs :many
SELECT hub_id FROM accounts_staffmembership WHERE user_id = $1;

-- name: OpenShiftHubIDs :many
SELECT hub_id FROM operations_shift WHERE agent_id = $1 AND status = 'OPEN';

-- name: AccountIDsTouchingHubs :many
-- account_ids_touching_hubs: swapped, reserved, or holding a pack at these hubs.
SELECT DISTINCT account_id FROM (
  SELECT account_id FROM mobility_swap WHERE hub_id = ANY(sqlc.arg(hubs)::uuid[]) AND account_id IS NOT NULL
  UNION SELECT account_id FROM mobility_reservation WHERE hub_id = ANY(sqlc.arg(hubs)::uuid[]) AND account_id IS NOT NULL
  UNION SELECT v.account_id FROM mobility_vehicle v JOIN mobility_battery b ON b.id = v.current_battery_id
        WHERE b.current_hub_id = ANY(sqlc.arg(hubs)::uuid[]) AND v.account_id IS NOT NULL
) t;

-- name: OwnedAccountIDs :many
-- user.accounts: Account inherits BaseModel ordering (-created_at).
SELECT id FROM accounts_account WHERE owner_user_id = $1 ORDER BY created_at DESC;
