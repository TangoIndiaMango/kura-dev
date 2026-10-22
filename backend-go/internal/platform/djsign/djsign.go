// Package djsign implements django.core.signing.dumps/loads (JSON payload,
// optional zlib compression, TimestampSigner, HMAC-SHA256) so Go reads and
// writes the same tokens Django stores — e.g. identity numbers.
//
// NOTE: this is signing, not encryption. Values are tamper-proof but
// readable by anyone with database access (see docs/MIGRATION.md).
package djsign

import (
	"bytes"
	"compress/zlib"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"strings"
	"time"
)

const b62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

var b64 = base64.RawURLEncoding

// ErrBadSignature is returned for tampered or foreign tokens.
var ErrBadSignature = errors.New("djsign: bad signature")

// Dumps is signing.dumps(value, salt=salt, compress=True).
func Dumps(value any, secret, salt string) (string, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return "", err
	}
	encoded := ""
	var zbuf bytes.Buffer
	zw := zlib.NewWriter(&zbuf)
	_, _ = zw.Write(data)
	_ = zw.Close()
	if zbuf.Len() < len(data)-1 {
		encoded = "." + b64.EncodeToString(zbuf.Bytes())
	} else {
		encoded = b64.EncodeToString(data)
	}
	signed := encoded + ":" + base62(time.Now().Unix())
	return signed + ":" + signature(signed, secret, salt), nil
}

// Loads is signing.loads(token, salt=salt) without max_age; tries each
// secret (SECRET_KEY then fallbacks) and decodes the JSON into out.
func Loads(token string, secrets []string, salt string, out any) error {
	i := strings.LastIndex(token, ":")
	if i < 0 {
		return ErrBadSignature
	}
	value, sig := token[:i], token[i+1:]
	ok := false
	for _, s := range secrets {
		if hmac.Equal([]byte(sig), []byte(signature(value, s, salt))) {
			ok = true
			break
		}
	}
	if !ok {
		return ErrBadSignature
	}
	j := strings.LastIndex(value, ":") // drop the timestamp
	if j < 0 {
		return ErrBadSignature
	}
	payload := value[:j]
	compressed := strings.HasPrefix(payload, ".")
	raw, err := b64.DecodeString(strings.TrimPrefix(payload, "."))
	if err != nil {
		return err
	}
	if compressed {
		zr, err := zlib.NewReader(bytes.NewReader(raw))
		if err != nil {
			return err
		}
		if raw, err = io.ReadAll(zr); err != nil {
			return err
		}
	}
	return json.Unmarshal(raw, out)
}

// signature is Signer.signature: b64(HMAC-SHA256(sha256(salt+"signer"+secret), value)).
func signature(value, secret, salt string) string {
	k := sha256.Sum256([]byte(salt + "signer" + secret))
	m := hmac.New(sha256.New, k[:])
	m.Write([]byte(value))
	return b64.EncodeToString(m.Sum(nil))
}

func base62(n int64) string {
	if n == 0 {
		return "0"
	}
	// Django's alphabet is digits, UPPER, lower (Go's big.Int uses lower first).
	var out []byte
	for n > 0 {
		out = append([]byte{b62[n%62]}, out...)
		n /= 62
	}
	return string(out)
}
