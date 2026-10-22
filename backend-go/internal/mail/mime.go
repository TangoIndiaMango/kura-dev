package mail

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"mime"
	"mime/multipart"
	"net/textproto"
	"strings"
	"time"
)

// Attachment is a file sent with the message (e.g. a receipt PDF).
type Attachment struct {
	Filename, ContentType string
	Data                  []byte
}

// build assembles multipart/mixed → related → alternative(text, html) + CIDs.
func build(from, replyTo string, to []string, subject, text, html string, atts []Attachment) ([]byte, error) {
	var out bytes.Buffer
	mixed := multipart.NewWriter(&out)
	hdr := []string{
		"From: " + from,
		"To: " + strings.Join(to, ", "),
		"Subject: " + mime.QEncoding.Encode("utf-8", subject),
		"Date: " + time.Now().Format(time.RFC1123Z),
		"MIME-Version: 1.0",
		`Content-Type: multipart/mixed; boundary="` + mixed.Boundary() + `"`,
	}
	if replyTo != "" {
		hdr = append(hdr, "Reply-To: "+replyTo)
	}
	head := strings.Join(hdr, "\r\n") + "\r\n\r\n"

	relBuf := &bytes.Buffer{}
	related := multipart.NewWriter(relBuf)
	altBuf := &bytes.Buffer{}
	alt := multipart.NewWriter(altBuf)
	if err := part(alt, "text/plain; charset=utf-8", []byte(text), nil); err != nil {
		return nil, err
	}
	if err := part(alt, "text/html; charset=utf-8", []byte(html), nil); err != nil {
		return nil, err
	}
	alt.Close()
	if err := raw(related, `multipart/alternative; boundary="`+alt.Boundary()+`"`, altBuf.Bytes()); err != nil {
		return nil, err
	}
	for _, b := range brandCIDs {
		data, err := assets.ReadFile(b.File)
		if err != nil {
			continue
		}
		name := b.File[strings.LastIndex(b.File, "/")+1:]
		if err := part(related, "image/png", data, map[string]string{
			"Content-ID":          "<" + b.CID + ">",
			"Content-Disposition": `inline; filename="` + name + `"`,
		}); err != nil {
			return nil, err
		}
	}
	related.Close()
	if err := raw(mixed, `multipart/related; boundary="`+related.Boundary()+`"`, relBuf.Bytes()); err != nil {
		return nil, err
	}
	for _, a := range atts {
		if err := part(mixed, a.ContentType, a.Data, map[string]string{
			"Content-Disposition": fmt.Sprintf(`attachment; filename="%s"`, a.Filename),
		}); err != nil {
			return nil, err
		}
	}
	mixed.Close()
	return append([]byte(head), out.Bytes()...), nil
}

// part writes a base64 body part.
func part(w *multipart.Writer, contentType string, body []byte, extra map[string]string) error {
	h := textproto.MIMEHeader{"Content-Type": {contentType}, "Content-Transfer-Encoding": {"base64"}}
	for k, v := range extra {
		h.Set(k, v)
	}
	pw, err := w.CreatePart(h)
	if err != nil {
		return err
	}
	enc := base64.StdEncoding.EncodeToString(body)
	for len(enc) > 76 {
		if _, err := pw.Write([]byte(enc[:76] + "\r\n")); err != nil {
			return err
		}
		enc = enc[76:]
	}
	_, err = pw.Write([]byte(enc + "\r\n"))
	return err
}

// raw writes an already-encoded nested multipart.
func raw(w *multipart.Writer, contentType string, body []byte) error {
	pw, err := w.CreatePart(textproto.MIMEHeader{"Content-Type": {contentType}})
	if err != nil {
		return err
	}
	_, err = pw.Write(body)
	return err
}
