package auth

// Permission is one capability code with its catalogue metadata.
type Permission struct {
	Code        string `json:"code"`
	Name        string `json:"name"`
	Module      string `json:"module"`
	Description string `json:"description"`
}

// RoleInfo is a role's display metadata.
type RoleInfo struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

const SuperAdmin = "SUPER_ADMIN"

// AllPermissionCodes lists every catalogue code (all_permission_codes).
func AllPermissionCodes() []string {
	codes := make([]string, len(PermissionCatalog))
	for i, p := range PermissionCatalog {
		codes[i] = p.Code
	}
	return codes
}

// CapabilitiesForRole is the static grant for a role code
// (capabilities_for_role_code).
func CapabilitiesForRole(role string) map[string]bool {
	grant := roleGrants[role]
	set := make(map[string]bool, len(grant))
	if len(grant) == 1 && grant[0] == "*" {
		for _, c := range AllPermissionCodes() {
			set[c] = true
		}
		return set
	}
	for _, c := range grant {
		set[c] = true
	}
	return set
}

// AssignedRole is the user's DB role row, if any (accounts_role).
type AssignedRole struct {
	Code     string
	IsActive bool
	DBCodes  []string // codes granted on the role row (custom roles)
}

// ResolveCapabilities mirrors accounts.permissions.user_capability_set:
// superuser/SUPER_ADMIN → everything; an assigned role → its DB grants (or its
// static grant when it has none; nothing when inactive); else the user's role.
func ResolveCapabilities(role string, isSuperuser bool, assigned *AssignedRole) map[string]bool {
	if isSuperuser || role == SuperAdmin {
		return CapabilitiesForRole(SuperAdmin)
	}
	if assigned != nil {
		if !assigned.IsActive {
			return map[string]bool{}
		}
		if len(assigned.DBCodes) > 0 {
			set := make(map[string]bool, len(assigned.DBCodes))
			for _, c := range assigned.DBCodes {
				set[c] = true
			}
			return set
		}
		return CapabilitiesForRole(assigned.Code)
	}
	return CapabilitiesForRole(role)
}
