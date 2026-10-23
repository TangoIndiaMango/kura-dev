// Package auth holds credentials: Django-compatible password/PIN hashing,
// simplejwt-compatible tokens, and the HTTP middleware that authenticates.
package auth

import (
	"crypto/rand"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"hash"
	"strconv"
	"strings"

	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/pbkdf2"
)

// Django's Argon2PasswordHasher defaults (argon2-cffi): t=2, m=100 MiB, p=8.
const (
	argonTime    = 2
	argonMemory  = 102400
	argonThreads = 8
	argonKeyLen  = 32
	argonSaltLen = 16
)

var b64 = base64.RawStdEncoding

// CheckPassword verifies raw against a Django-encoded hash (argon2,
// pbkdf2_sha256, pbkdf2_sha1). Unknown or unusable ("!") hashes fail.
func CheckPassword(raw, encoded string) bool {
	algo, rest, ok := strings.Cut(encoded, "$")
	if !ok {
		return false
	}
	switch algo {
	case "argon2":
		return checkArgon2(raw, rest)
	case "pbkdf2_sha256":
		return checkPBKDF2(raw, rest, sha256.New)
	case "pbkdf2_sha1":
		return checkPBKDF2(raw, rest, sha1.New)
	default:
		return false
	}
}

// MakePassword hashes raw in Django's argon2 format, so Django can verify it
// too while both backends share the database.
func MakePassword(raw string) (string, error) {
	salt := make([]byte, argonSaltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("auth: salt: %w", err)
	}
	key := argon2.IDKey([]byte(raw), salt, argonTime, argonMemory, argonThreads, argonKeyLen)
	return fmt.Sprintf("argon2$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, argonMemory, argonTime, argonThreads,
		b64.EncodeToString(salt), b64.EncodeToString(key)), nil
}

// checkArgon2 parses "argon2id$v=19$m=..,t=..,p=..$salt$hash".
func checkArgon2(raw, rest string) bool {
	parts := strings.Split(rest, "$")
	if len(parts) != 5 || parts[0] != "argon2id" {
		return false
	}
	var m, t uint32
	var p uint8
	if _, err := fmt.Sscanf(parts[2], "m=%d,t=%d,p=%d", &m, &t, &p); err != nil {
		return false
	}
	salt, err1 := b64.DecodeString(parts[3])
	want, err2 := b64.DecodeString(parts[4])
	if err1 != nil || err2 != nil || len(want) == 0 {
		return false
	}
	got := argon2.IDKey([]byte(raw), salt, t, m, p, uint32(len(want)))
	return subtle.ConstantTimeCompare(got, want) == 1
}

// checkPBKDF2 parses "iterations$salt$base64hash" (salt is used as text).
func checkPBKDF2(raw, rest string, h func() hash.Hash) bool {
	parts := strings.Split(rest, "$")
	if len(parts) != 3 {
		return false
	}
	iter, err := strconv.Atoi(parts[0])
	if err != nil || iter <= 0 {
		return false
	}
	want, err := base64.StdEncoding.DecodeString(parts[2])
	if err != nil {
		return false
	}
	got := pbkdf2.Key([]byte(raw), []byte(parts[1]), iter, len(want), h)
	return subtle.ConstantTimeCompare(got, want) == 1
}
