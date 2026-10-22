// Package config loads typed settings from the environment (12-factor).
//
// Names match the Django settings so one .env drives both backends during the
// migration. Missing production values warn at boot instead of stopping it,
// mirroring config/settings/prod.py.
package config

import (
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/caarlos0/env/v11"
)

// Config is every setting the API and worker read. Keep it flat and typed.
type Config struct {
	Env      string `env:"KURA_ENV" envDefault:"local"` // local | staging | production
	Port     string `env:"PORT" envDefault:"8001"`
	Debug    bool   `env:"DJANGO_DEBUG" envDefault:"false"`
	TimeZone string `env:"DISPLAY_TIME_ZONE" envDefault:"Africa/Lagos"`

	DatabaseURL string `env:"DATABASE_URL,required"`
	RedisURL    string `env:"REDIS_URL"`

	SecretKey     string        `env:"DJANGO_SECRET_KEY"`
	JWTSigningKey string        `env:"JWT_SIGNING_KEY"`
	AccessTTL     time.Duration `env:"JWT_ACCESS_TTL" envDefault:"15m"`
	RefreshTTL    time.Duration `env:"JWT_REFRESH_TTL" envDefault:"720h"`

	AllowedHosts []string `env:"DJANGO_ALLOWED_HOSTS" envSeparator:","`
	CORSOrigins  []string `env:"CORS_ORIGINS" envSeparator:","`

	OTPDevCode     string `env:"OTP_DEV_CODE" envDefault:"123456"`
	OTPPepper      string `env:"OTP_PEPPER"`
	CronSecret     string `env:"CRON_SECRET"`
	DefaultPSP     string `env:"DEFAULT_PSP" envDefault:"PAYSTACK"`
	PaystackSecret string `env:"PAYSTACK_SECRET_KEY"`
	MockIoT        bool   `env:"MOCK_IOT_ENABLED" envDefault:"false"`

	CloudinaryCloudName    string `env:"CLOUDINARY_CLOUD_NAME"`
	CloudinaryAPIKey       string `env:"CLOUDINARY_API_KEY"`
	CloudinaryAPISecret    string `env:"CLOUDINARY_API_SECRET"`
	CloudinaryUploadPreset string `env:"CLOUDINARY_UPLOAD_PRESET"`
	CloudinaryFolder       string `env:"CLOUDINARY_FOLDER" envDefault:"uploads"`
	ConsentPolicyVersion   string `env:"CONSENT_POLICY_VERSION" envDefault:"2026-10"`

	ShutdownTimeout time.Duration `env:"SHUTDOWN_TIMEOUT" envDefault:"20s"`
}

// IsProduction is true for production and staging (both run with DEBUG off).
func (c Config) IsProduction() bool {
	return c.Env == "production" || c.Env == "staging"
}

// SigningKey is the HS256 key: JWT_SIGNING_KEY, else the Django secret key —
// the same rule simplejwt uses, so tokens are interchangeable.
func (c Config) SigningKey() []byte {
	if c.JWTSigningKey != "" {
		return []byte(c.JWTSigningKey)
	}
	return []byte(c.SecretKey)
}

// Pepper keys the OTP HMAC: OTP_PEPPER, else the Django secret key.
func (c Config) Pepper() []byte {
	if c.OTPPepper != "" {
		return []byte(c.OTPPepper)
	}
	return []byte(c.SecretKey)
}

// Load parses the environment and validates what must never be missing.
func Load() (Config, error) {
	var cfg Config
	if err := env.Parse(&cfg); err != nil {
		return cfg, fmt.Errorf("config: %w", err)
	}
	if len(cfg.SigningKey()) == 0 {
		return cfg, fmt.Errorf("config: JWT_SIGNING_KEY or DJANGO_SECRET_KEY is required")
	}
	if cfg.IsProduction() {
		if cfg.Debug {
			return cfg, fmt.Errorf("config: DJANGO_DEBUG must be off in %s", cfg.Env)
		}
		if strings.HasPrefix(cfg.SecretKey, "django-insecure") {
			return cfg, fmt.Errorf("config: DJANGO_SECRET_KEY is the insecure dev default")
		}
		cfg.MockIoT = false
	}
	return cfg, nil
}

// Warnings lists production gaps; logged once at boot (never fatal).
func (c Config) Warnings() []string {
	if !c.IsProduction() {
		return nil
	}
	var w []string
	if len(c.AllowedHosts) == 0 || contains(c.AllowedHosts, "*") {
		w = append(w, "DJANGO_ALLOWED_HOSTS allows any host; list the API hostnames instead of '*'")
	}
	if len(c.CORSOrigins) == 0 {
		w = append(w, "CORS_ORIGINS not set; any website can call the API")
	}
	if c.RedisURL == "" {
		w = append(w, "REDIS_URL not set; throttles are per-process")
	}
	if c.DefaultPSP == "PAYSTACK" && c.PaystackSecret == "" {
		w = append(w, "PAYSTACK_SECRET_KEY not set; riders cannot get transfer accounts")
	}
	return w
}

// LogWarnings writes each production gap at WARN level.
func (c Config) LogWarnings(log *slog.Logger) {
	for _, msg := range c.Warnings() {
		log.Warn("kura config", "warning", msg)
	}
}

func contains(list []string, v string) bool {
	for _, s := range list {
		if strings.TrimSpace(s) == v {
			return true
		}
	}
	return false
}
