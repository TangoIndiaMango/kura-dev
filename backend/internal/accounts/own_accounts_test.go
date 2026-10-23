package accounts

import (
	"testing"

	"github.com/google/uuid"
)

// Expected orders come from CPython: list({i for i in ids}).
func TestPySetOrder(t *testing.T) {
	a := uuid.MustParse("01a15519-4e78-7e98-bc87-2f4a1601f23b")
	b := uuid.MustParse("01a15519-511d-7a45-94ea-8e1e846964b1")
	c := uuid.MustParse("01a15519-54fe-75ac-ae36-bab4de45da83")
	d := uuid.MustParse("01a15519-528a-7608-b612-ece50d05059d")
	cases := []struct{ in, want []uuid.UUID }{
		{[]uuid.UUID{a, b}, []uuid.UUID{a, b}},
		{[]uuid.UUID{a, b, c}, []uuid.UUID{c, a, b}},
		{[]uuid.UUID{a, b, c, d}, []uuid.UUID{c, a, d, b}},
		{[]uuid.UUID{d, c, b, a}, []uuid.UUID{c, a, d, b}},
		{[]uuid.UUID{a, a}, []uuid.UUID{a}},
	}
	for _, tc := range cases {
		got := pySetOrder(tc.in)
		for i := range tc.want {
			if i >= len(got) || got[i] != tc.want[i] {
				t.Fatalf("pySetOrder(%v) = %v, want %v", tc.in, got, tc.want)
			}
		}
	}
}
