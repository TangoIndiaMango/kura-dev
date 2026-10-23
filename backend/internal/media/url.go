// Package media ports core.services.media: provider-neutral assets and their
// delivery URLs (Cloudinary today).
package media

import (
	"regexp"
	"strings"
)

// Cloudinary holds what's needed to build delivery URLs.
type Cloudinary struct {
	CloudName    string
	APIKey       string
	APISecret    string
	UploadPreset string
}

// Configured mirrors cloudinary_configured(): a cloud name plus either an
// upload preset or an API key/secret pair.
func (c Cloudinary) Configured() bool {
	if strings.TrimSpace(c.CloudName) == "" {
		return false
	}
	if strings.TrimSpace(c.UploadPreset) != "" {
		return true
	}
	return strings.TrimSpace(c.APIKey) != "" && strings.TrimSpace(c.APISecret) != ""
}

// Asset is the subset of core_mediaasset needed for URLs.
type Asset struct {
	Provider     string
	StorageKey   string
	ResourceType string
	Visibility   string
}

var versioned = regexp.MustCompile(`^v\d+/`)

// DeliveryURL builds the same URL as cloudinary.utils.cloudinary_url with
// secure=True, fetch_format=auto, quality=auto (and type=authenticated for
// private assets). Returns nil when there's nothing to deliver.
func (c Cloudinary) DeliveryURL(a *Asset) *string {
	if a == nil || a.Provider != "cloudinary" {
		return nil
	}
	key := strings.TrimSpace(a.StorageKey)
	if key == "" {
		return nil
	}
	if strings.HasPrefix(key, "http://") || strings.HasPrefix(key, "https://") {
		return &key
	}
	if !c.Configured() {
		return nil
	}
	resource := a.ResourceType
	if resource == "" {
		resource = "image"
	}
	kind := "upload"
	if a.Visibility == "authenticated" {
		kind = "authenticated"
	}
	// The SDK adds "v1/" when the public id sits in a folder and has no version.
	if strings.Contains(key, "/") && !versioned.MatchString(key) {
		key = "v1/" + key
	}
	url := "https://res.cloudinary.com/" + c.CloudName + "/" + resource + "/" + kind +
		"/f_auto,q_auto/" + key
	return &url
}
