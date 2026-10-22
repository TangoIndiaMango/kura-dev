// Package app is the composition root: it builds every dependency once and
// hands modules exactly what they need. No business logic lives here.
package app

import (
	"log/slog"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/accounts"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/auth"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/health"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/config"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/server"
)

// Build wires config, logger and pool into the HTTP handler.
func Build(cfg config.Config, log *slog.Logger, pool *pgxpool.Pool) http.Handler {
	queries := db.New(pool)
	tokens := auth.NewTokens(cfg.SigningKey(), cfg.AccessTTL, cfg.RefreshTTL)
	authn := auth.NewAuthenticator(tokens, accounts.NewPrincipalLoader(queries))

	return server.New(
		server.Deps{Config: cfg, Log: log, Auth: authn},
		health.New(pool),
	)
}
