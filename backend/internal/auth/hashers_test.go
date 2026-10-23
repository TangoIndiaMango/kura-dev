package auth

import "testing"

// Fixtures made by Django's make_password("s3cret-test", hasher=...).
var djangoHashes = map[string]string{
	"argon2":        "argon2$argon2id$v=19$m=102400,t=2,p=8$UGJjN1UwdzZKbjNmaWdwZ0hWSGgwbQ$zUC+AuOVyOYwvFEmlW2FsWD2mlhprANkobo0G2El0us",
	"pbkdf2_sha256": "pbkdf2_sha256$1500000$4q38AoqKoIQyDj4vGQPVm3$KCTnP5lrJ5R4Yf1/K1ymOnO8S2MbRRqolA8dXFQlHVc=",
	"pbkdf2_sha1":   "pbkdf2_sha1$1500000$kEqZK5IychosEgrhkRcXS5$kQhogqs9sPGrzkc5Ol6RTN52480=",
}

func TestCheckPasswordAcceptsDjangoHashes(t *testing.T) {
	for name, encoded := range djangoHashes {
		if !CheckPassword("s3cret-test", encoded) {
			t.Errorf("%s: correct password rejected", name)
		}
		if CheckPassword("wrong", encoded) {
			t.Errorf("%s: wrong password accepted", name)
		}
	}
}

func TestCheckPasswordRejectsUnusable(t *testing.T) {
	for _, encoded := range []string{"", "!", "!abc", "md5$x$y", "argon2$garbage"} {
		if CheckPassword("anything", encoded) {
			t.Errorf("unusable hash %q accepted", encoded)
		}
	}
}

func TestMakePasswordRoundTrips(t *testing.T) {
	encoded, err := MakePassword("1234")
	if err != nil {
		t.Fatal(err)
	}
	if !CheckPassword("1234", encoded) || CheckPassword("4321", encoded) {
		t.Fatalf("round trip failed for %s", encoded)
	}
}
