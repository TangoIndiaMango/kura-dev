package auth

import "testing"

func TestResolveCapabilities(t *testing.T) {
	all := len(AllPermissionCodes())
	if got := len(ResolveCapabilities("DRIVER", true, nil)); got != all {
		t.Fatalf("superuser: got %d caps, want %d", got, all)
	}
	if got := len(ResolveCapabilities(SuperAdmin, false, nil)); got != all {
		t.Fatalf("SUPER_ADMIN: got %d caps, want %d", got, all)
	}
	ops := ResolveCapabilities("OPS_MANAGER", false, nil)
	if !ops["hubs:manage"] || !ops["finance:read"] {
		t.Fatalf("OPS_MANAGER missing expected caps: %v", ops)
	}
	if ResolveCapabilities("DRIVER", false, nil)["hubs:manage"] {
		t.Fatal("DRIVER must not manage hubs")
	}
	inactive := &AssignedRole{Code: "OPS_MANAGER", IsActive: false}
	if len(ResolveCapabilities("OPS_MANAGER", false, inactive)) != 0 {
		t.Fatal("inactive assigned role must grant nothing")
	}
	custom := &AssignedRole{Code: "CUSTOM", IsActive: true, DBCodes: []string{"hubs:read"}}
	if got := ResolveCapabilities("OPS_MANAGER", false, custom); len(got) != 1 || !got["hubs:read"] {
		t.Fatalf("custom role DB grants not used: %v", got)
	}
	empty := &AssignedRole{Code: "OPS_MANAGER", IsActive: true}
	if !ResolveCapabilities("DRIVER", false, empty)["hubs:manage"] {
		t.Fatal("assigned role without DB grants must fall back to its static grant")
	}
}
