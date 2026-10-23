-- name: UserNotificationPrefs :one
SELECT notification_prefs FROM accounts_user WHERE id = $1;

-- name: NotificationByDedupe :one
SELECT id FROM notifications_notification
WHERE user_id = $1 AND dedupe_key = $2
FOR UPDATE;

-- name: InsertNotification :one
-- ON CONFLICT absorbs concurrent dedupe races (unique user + dedupe_key).
INSERT INTO notifications_notification (
    id, created_at, updated_at, user_id, channel, template_code, title, body,
    severity, source, status, params, link_path, dedupe_key, provider_ref
) VALUES (
    $1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, ''
)
ON CONFLICT DO NOTHING
RETURNING id;

-- name: InboxPage :many
-- notifications_for: the user's IN_APP rows, newest first (keyset).
SELECT * FROM notifications_notification n
WHERE n.user_id = sqlc.arg(user_id) AND n.channel = 'IN_APP'
  AND (sqlc.narg(q)::text IS NULL OR n.title ILIKE '%' || sqlc.narg(q) || '%' OR n.body ILIKE '%' || sqlc.narg(q) || '%')
  AND (sqlc.narg(search)::text IS NULL OR n.title ILIKE '%' || sqlc.narg(search) || '%' OR n.body ILIKE '%' || sqlc.narg(search) || '%')
  AND (sqlc.narg(source)::text IS NULL OR n.source = sqlc.narg(source))
  AND (sqlc.narg(severity)::text IS NULL OR n.severity = sqlc.narg(severity))
  AND (sqlc.narg(channel)::text IS NULL OR n.channel = sqlc.narg(channel))
  AND (sqlc.narg(unread)::bool IS NULL OR (n.read_at IS NULL) = sqlc.narg(unread))
  AND (sqlc.narg(from_at)::timestamptz IS NULL OR n.created_at >= sqlc.narg(from_at))
  AND (sqlc.narg(to_at)::timestamptz IS NULL OR n.created_at <= sqlc.narg(to_at))
  AND (sqlc.narg(after_at)::timestamptz IS NULL
       OR (sqlc.arg(back)::bool AND (n.created_at, n.id) > (sqlc.narg(after_at), sqlc.arg(after_id)::uuid))
       OR (NOT sqlc.arg(back)::bool AND (n.created_at, n.id) < (sqlc.narg(after_at), sqlc.arg(after_id)::uuid)))
ORDER BY CASE WHEN sqlc.arg(back)::bool THEN n.created_at END, CASE WHEN sqlc.arg(back)::bool THEN n.id END,
  n.created_at DESC, n.id DESC
LIMIT sqlc.arg(lim);

-- name: InboxStats :one
SELECT count(*)::int AS all_rows, count(*) FILTER (WHERE read_at IS NULL)::int AS unread,
  count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS last_7d
FROM notifications_notification WHERE user_id = $1 AND channel = 'IN_APP';

-- name: InboxItem :one
SELECT * FROM notifications_notification WHERE id = $1 AND user_id = $2 AND channel = 'IN_APP';

-- name: MarkNotificationRead :exec
UPDATE notifications_notification SET read_at = now(), updated_at = now() WHERE id = $1 AND read_at IS NULL;

-- name: MarkAllRead :execrows
UPDATE notifications_notification SET read_at = now() WHERE user_id = $1 AND read_at IS NULL;
