// Package dbfs embeds the database migrations and the demo seed so the
// migrate binary is self-contained.
package dbfs

import "embed"

// Migrations are goose SQL migrations (db/migrations/NNNNN_name.sql).
//
//go:embed migrations/*.sql
var Migrations embed.FS

// Seed is the demo dataset (hubs, batteries, vehicles, plans, roles, test
// users) for an empty database.
//
//go:embed seed.sql
var Seed string

// Reference is the data every database needs (permissions, roles, grants),
// without demo users or money — what production loads (`migrate bootstrap`).
//
//go:embed reference.sql
var Reference string
