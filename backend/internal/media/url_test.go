package media

import "testing"

// Expected values produced by cloudinary.utils.cloudinary_url (Python SDK).
func TestDeliveryURLMatchesSDK(t *testing.T) {
	c := Cloudinary{CloudName: "democloud", APIKey: "k", APISecret: "s"}
	cases := []struct {
		asset Asset
		want  string
	}{
		{Asset{"cloudinary", "uploads/kyc/abc123", "image", "authenticated"},
			"https://res.cloudinary.com/democloud/image/authenticated/f_auto,q_auto/v1/uploads/kyc/abc123"},
		{Asset{"cloudinary", "uploads/avatars/x", "image", "public"},
			"https://res.cloudinary.com/democloud/image/upload/f_auto,q_auto/v1/uploads/avatars/x"},
		{Asset{"cloudinary", "plain", "image", "public"},
			"https://res.cloudinary.com/democloud/image/upload/f_auto,q_auto/plain"},
		{Asset{"cloudinary", "uploads/doc.pdf", "raw", "public"},
			"https://res.cloudinary.com/democloud/raw/upload/f_auto,q_auto/v1/uploads/doc.pdf"},
		{Asset{"cloudinary", "v123/already", "image", "public"},
			"https://res.cloudinary.com/democloud/image/upload/f_auto,q_auto/v123/already"},
	}
	for _, tc := range cases {
		got := c.DeliveryURL(&tc.asset)
		if got == nil || *got != tc.want {
			t.Errorf("%s: got %v want %s", tc.asset.StorageKey, got, tc.want)
		}
	}
	if (Cloudinary{}).DeliveryURL(&Asset{Provider: "cloudinary", StorageKey: "x"}) != nil {
		t.Error("unconfigured Cloudinary must not build URLs")
	}
}
