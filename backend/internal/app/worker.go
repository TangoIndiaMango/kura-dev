package app

import (
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend/internal/auth"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/integrations/psp"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/integrations/va"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/jobs"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/mail"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/mobility"
	"github.com/TangoIndiaMango/kura-dev/backend/internal/platform/config"
)

// Worker wires the background job runner (cmd/worker).
func Worker(cfg config.Config, log *slog.Logger, pool *pgxpool.Pool) *jobs.Runner {
	tokens := auth.NewTokens(cfg.SigningKey(), cfg.AccessTTL, cfg.RefreshTTL)
	mailer := mail.New(mail.Config{Enabled: cfg.EmailEnabled, Host: cfg.EmailHost, Port: cfg.EmailPort,
		User: cfg.EmailUser, Password: cfg.EmailPassword, UseSSL: cfg.MailSSL(), UseTLS: cfg.MailTLS(),
		From: cfg.DefaultFromEmail, ReplyTo: cfg.DefaultReplyTo, SupportEmail: cfg.SupportEmail}, log)
	pspSettings := psp.Settings{DefaultPSP: cfg.DefaultPSP, PaystackSecret: cfg.PaystackSecret,
		PaystackBank: cfg.PaystackBank, CustomerEmailDomain: cfg.PSPCustomerEmailDom, NombaSecret: cfg.NombaSecret,
		NombaAccountID: cfg.NombaAccountID}
	return &jobs.Runner{Pool: pool, Log: log, Mailer: mailer,
		VA:      va.New(pool, pspSettings, cfg.AllowDevVA(), cfg.SecretKey, log),
		Billing: mobility.NewBilling(pool, tokens), MockIoT: cfg.MockIoT}
}
