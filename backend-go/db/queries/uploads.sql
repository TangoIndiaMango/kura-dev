-- MediaService.upload_files: one MediaAsset row per uploaded file.

-- name: InsertMediaAsset :one
INSERT INTO core_mediaasset (id, created_at, updated_at, provider, storage_key, kind, content_type, resource_type,
  byte_size, width, height, original_filename, visibility, uploaded_by_id)
VALUES ($1, clock_timestamp(), clock_timestamp(), $2, $3, $4, $5, $6, $7, $8, $9, $10, 'public', $11)
RETURNING *;
