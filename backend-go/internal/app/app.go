// Package app is the composition root: it builds every dependency once and
// hands modules exactly what they need. No business logic lives here.
package app

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/accounts"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/auth"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/credit"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/finance"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/health"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/integrations/psp"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/integrations/va"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/mail"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/media"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/mobility"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/operations"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/config"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platformcfg"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/qr"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/rbac"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/risk"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/server"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/spend"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/support"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/throttle"
)

// Build wires config, logger and pool into the HTTP handler.
func Build(cfg config.Config, log *slog.Logger, pool *pgxpool.Pool) http.Handler {
	queries := db.New(pool)
	tokens := auth.NewTokens(cfg.SigningKey(), cfg.AccessTTL, cfg.RefreshTTL)
	authn := auth.NewAuthenticator(tokens, accounts.NewPrincipalLoader(queries))
	limiter := throttle.New(throttle.NewMemory())

	authSvc := accounts.NewAuthService(pool, tokens, cfg)
	cdn := media.Cloudinary{CloudName: cfg.CloudinaryCloudName, APIKey: cfg.CloudinaryAPIKey,
		APISecret: cfg.CloudinaryAPISecret, UploadPreset: cfg.CloudinaryUploadPreset}
	meSvc := accounts.NewMeService(queries, cdn, cfg.ConsentPolicyVersion)
	mailer := mail.New(mail.Config{Enabled: cfg.EmailEnabled, Host: cfg.EmailHost, Port: cfg.EmailPort,
		User: cfg.EmailUser, Password: cfg.EmailPassword, UseSSL: cfg.MailSSL(), UseTLS: cfg.MailTLS(),
		From: cfg.DefaultFromEmail, ReplyTo: cfg.DefaultReplyTo, SupportEmail: cfg.SupportEmail}, log)
	staffSvc := accounts.NewStaffService(pool, cfg, mailer, authSvc)
	vaSvc := va.New(pool, psp.Settings{DefaultPSP: cfg.DefaultPSP, PaystackSecret: cfg.PaystackSecret,
		PaystackBank: cfg.PaystackBank, CustomerEmailDomain: cfg.PSPCustomerEmailDom, NombaSecret: cfg.NombaSecret,
		NombaAccountID: cfg.NombaAccountID}, cfg.AllowDevVA(), cfg.SecretKey, log)
	identity := accounts.NewIdentityService(pool, cdn, vaSvc, cfg.ConsentPolicyVersion, cfg.SecretKey)

	upstream, err := server.Upstream(cfg.DjangoUpstreamURL, log)
	if err != nil {
		panic(err) // invalid URL is a deploy config bug; fail at boot
	}

	receiptKey := firstNonEmpty(cfg.ReceiptSecret, cfg.OTPPepper, "kura-dev-receipt-secret")
	ops := operations.NewModule(pool, mailer, tokens, receiptKey, cfg.FrontendClientURL, cfg.CashFloatLimit, limiter)
	return server.New(
		server.Deps{Config: cfg, Log: log, Auth: authn, Upstream: upstream},
		health.New(pool),
		accounts.NewModule(accounts.NewAuthHandler(authSvc, meSvc), accounts.NewStaffHandler(staffSvc),
			accounts.NewCoopHandler(pool), accounts.NewDriverHandler(pool),
			accounts.NewAccountHandler(pool, cdn, spend.Petrol{LitresPerSwap: cfg.PetrolLitresPerSwap,
				KoboPerLitre: cfg.PetrolKoboPerLitre}, identity, staffSvc), limiter),
		rbac.NewModule(rbac.NewHandler(rbac.NewService(pool)), limiter),
		finance.NewModule(finance.NewHandler(pool, receiptKey, cfg.AllowDevVA()), limiter),
		mobility.NewModule(pool, qr.Signer{Pepper: firstNonEmpty(cfg.QRPepper, cfg.SecretKey)}, mailer, tokens,
			mobility.BayDeps{Secret: cfg.SecretKey, Ops: ops.Service(), CDN: cdn,
				VerifyPin: func(ctx context.Context, user uuid.UUID, pin string) (string, time.Time, error) {
					u, err := queries.GetUserRow(ctx, user)
					if err != nil {
						return "", time.Time{}, err
					}
					g, err := authSvc.VerifyPin(ctx, u, pin, "")
					return g.Token, g.ExpiresAt, err
				}}, limiter),
		risk.NewModule(pool, limiter),
		support.NewModule(pool, cdn, limiter),
		platformcfg.NewModule(pool, limiter),
		credit.NewModule(pool, tokens, limiter),
		ops,
	)
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}
