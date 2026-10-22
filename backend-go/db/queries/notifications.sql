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
