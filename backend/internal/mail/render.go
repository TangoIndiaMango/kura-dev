// Package mail ports core.helpers.mail: templated transactional email with the
// Kura brand marks embedded as inline (CID) images, sent over SMTP or logged.
package mail

import (
	"bytes"
	"embed"
	htmltpl "html/template"
	"io/fs"
	texttpl "text/template"
)

//go:embed templates/*.html templates/*.txt brand/*.png
var assets embed.FS

// brandCIDs are the inline images every email can reference.
var brandCIDs = []struct{ CID, File string }{
	{"kura_mark", "brand/kura-mark-email.png"},
	{"kura_mark_circle", "brand/kura-mark-circle-email.png"},
}

// render builds the HTML (base + template) and text bodies. A missing .txt
// falls back to the same note Django sends.
func render(template, subject string, ctx map[string]any) (string, string, error) {
	// html/template rejects the cid: scheme; our own brand CIDs are safe.
	htmlCtx := make(map[string]any, len(ctx))
	for k, v := range ctx {
		htmlCtx[k] = v
		if s, ok := v.(string); ok && (k == "logo_mark_cid" || k == "logo_circle_cid") {
			htmlCtx[k] = htmltpl.URL(s)
		}
	}
	h, err := htmltpl.ParseFS(assets, "templates/base.html", "templates/"+template+".html")
	if err != nil {
		return "", "", err
	}
	var html bytes.Buffer
	if err := h.ExecuteTemplate(&html, "base.html", htmlCtx); err != nil {
		return "", "", err
	}
	text := subject + "\n\nOpen this message in an HTML mail app to see the full note."
	if _, err := fs.Stat(assets, "templates/"+template+".txt"); err == nil {
		t, err := texttpl.ParseFS(assets, "templates/"+template+".txt")
		if err != nil {
			return "", "", err
		}
		var buf bytes.Buffer
		if err := t.Execute(&buf, ctx); err != nil {
			return "", "", err
		}
		text = buf.String()
	}
	return html.String(), text, nil
}
