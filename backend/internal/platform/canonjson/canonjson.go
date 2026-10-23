// Package canonjson encodes values exactly like Python's
// json.dumps(obj, sort_keys=True, separators=(",", ":")) with the default
// ensure_ascii=True, so hashes computed in Go match those computed in Django.
package canonjson

import (
	"bytes"
	"encoding/json"
	"fmt"
	"unicode/utf8"
)

// Marshal returns the canonical encoding. Maps are key-sorted by encoding/json;
// HTML characters stay literal and non-ASCII runes become \uXXXX escapes.
func Marshal(v any) ([]byte, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return nil, fmt.Errorf("canonjson: %w", err)
	}
	out := bytes.TrimRight(buf.Bytes(), "\n")
	return asciiEscape(out), nil
}

// asciiEscape rewrites non-ASCII runes as \uXXXX (UTF-16 surrogate pairs for
// runes above the BMP), matching Python's ensure_ascii. Non-ASCII bytes only
// occur inside JSON strings, so a byte scan is safe.
func asciiEscape(b []byte) []byte {
	if isASCII(b) {
		return b
	}
	var out bytes.Buffer
	out.Grow(len(b) + 16)
	for len(b) > 0 {
		r, size := utf8.DecodeRune(b)
		switch {
		case r < utf8.RuneSelf:
			out.WriteByte(b[0])
		case r > 0xFFFF:
			r -= 0x10000
			fmt.Fprintf(&out, `\u%04x\u%04x`, 0xD800+(r>>10), 0xDC00+(r&0x3FF))
		default:
			fmt.Fprintf(&out, `\u%04x`, r)
		}
		b = b[size:]
	}
	return out.Bytes()
}

func isASCII(b []byte) bool {
	for _, c := range b {
		if c >= utf8.RuneSelf {
			return false
		}
	}
	return true
}
