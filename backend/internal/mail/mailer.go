package mail

import (
	"context"
	"crypto/tls"
	"fmt"
	"log/slog"
	"net"
	"net/smtp"
	"strconv"
	"strings"
	"time"
)

// Config mirrors the Django EMAIL_* settings.
type Config struct {
	Enabled      bool
	Host         string
	Port         int
	User         string
	Password     string
	UseSSL       bool // implicit TLS (port 465)
	UseTLS       bool // STARTTLS
	From         string
	ReplyTo      string
	SupportEmail string
}

// Message is one templated email.
type Message struct {
	To          []string
	Subject     string
	Template    string // e.g. "staff_invite" → templates/staff_invite.{html,txt}
	Context     map[string]any
	Attachments []Attachment
}

// Mailer renders and delivers. Delivery failures are logged and reported as
// false, never raised to the caller (EMAIL_FAIL_SILENTLY).
type Mailer struct {
	cfg Config
	log *slog.Logger
	// Sent records deliveries in tests when non-nil.
	Sent *[]Message
}

func New(cfg Config, log *slog.Logger) *Mailer { return &Mailer{cfg: cfg, log: log} }

// Send delivers via SMTP when configured; otherwise logs it like Django's
// console backend. Returns whether the message was handed to SMTP.
func (m *Mailer) Send(ctx context.Context, msg Message) bool {
	to := make([]string, 0, len(msg.To))
	for _, r := range msg.To {
		if r = strings.TrimSpace(r); r != "" {
			to = append(to, r)
		}
	}
	if len(to) == 0 {
		m.log.Warn("email_skipped_no_recipient", "template", msg.Template)
		return false
	}
	ctxData := map[string]any{"support_email": m.cfg.SupportEmail, "product_name": "Kura",
		"logo_mark_cid": "cid:kura_mark", "logo_circle_cid": "cid:kura_mark_circle"}
	for k, v := range msg.Context {
		ctxData[k] = v
	}
	html, text, err := render(msg.Template, msg.Subject, ctxData)
	if err != nil {
		m.log.Error("email_render_failed", "template", msg.Template, "err", err)
		return false
	}
	if m.Sent != nil {
		*m.Sent = append(*m.Sent, Message{To: to, Subject: msg.Subject, Template: msg.Template,
			Context: map[string]any{"html": html, "text": text}})
	}
	if !m.cfg.Enabled || m.cfg.Host == "" {
		m.log.Info("email_console", "template", msg.Template, "to", to, "subject", msg.Subject, "body", text)
		return true
	}
	body, err := build(m.cfg.From, m.cfg.ReplyTo, to, msg.Subject, text, html, msg.Attachments)
	if err == nil {
		err = m.deliver(to, body)
	}
	if err != nil {
		m.log.Error("email_failed", "template", msg.Template, "to", to, "err", err)
		return false
	}
	m.log.Info("email_sent", "template", msg.Template, "to", to, "attachments", len(msg.Attachments))
	return true
}

func (m *Mailer) deliver(to []string, body []byte) error {
	addr := net.JoinHostPort(m.cfg.Host, strconv.Itoa(m.cfg.Port))
	var conn net.Conn
	var err error
	dialer := &net.Dialer{Timeout: 15 * time.Second}
	if m.cfg.UseSSL {
		conn, err = tls.DialWithDialer(dialer, "tcp", addr, &tls.Config{ServerName: m.cfg.Host})
	} else {
		conn, err = dialer.Dial("tcp", addr)
	}
	if err != nil {
		return fmt.Errorf("smtp dial: %w", err)
	}
	c, err := smtp.NewClient(conn, m.cfg.Host)
	if err != nil {
		return err
	}
	defer c.Close()
	if !m.cfg.UseSSL && m.cfg.UseTLS {
		if err := c.StartTLS(&tls.Config{ServerName: m.cfg.Host}); err != nil {
			return fmt.Errorf("smtp starttls: %w", err)
		}
	}
	if m.cfg.User != "" {
		if err := c.Auth(smtp.PlainAuth("", m.cfg.User, m.cfg.Password, m.cfg.Host)); err != nil {
			return fmt.Errorf("smtp auth: %w", err)
		}
	}
	if err := c.Mail(envelope(m.cfg.From)); err != nil {
		return err
	}
	for _, r := range to {
		if err := c.Rcpt(r); err != nil {
			return err
		}
	}
	w, err := c.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write(body); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return err
	}
	return c.Quit()
}

// envelope extracts the bare address from "Name <addr>".
func envelope(from string) string {
	if i, j := strings.LastIndex(from, "<"), strings.LastIndex(from, ">"); i >= 0 && j > i {
		return from[i+1 : j]
	}
	return from
}
