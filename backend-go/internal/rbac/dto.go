// Package rbac ports the roles and permissions admin API
// (accounts/views/roles.py, RoleService).
package rbac

import (
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/db"
	"github.com/TangoIndiaMango/kura-dev/backend-go/internal/platform/jsontime"
)

// PermissionDTO is PermissionSerializer.
type PermissionDTO struct {
	ID          string `json:"id"`
	Code        string `json:"code"`
	Name        string `json:"name"`
	Module      string `json:"module"`
	Description string `json:"description"`
}

func toPermission(id, code, name, module, desc string) PermissionDTO {
	return PermissionDTO{ID: id, Code: code, Name: name, Module: module, Description: desc}
}

// RoleListDTO is RoleListSerializer (tables and pickers).
type RoleListDTO struct {
	ID              string         `json:"id"`
	Code            string         `json:"code"`
	Name            string         `json:"name"`
	Description     string         `json:"description"`
	IsSystem        bool           `json:"is_system"`
	IsActive        bool           `json:"is_active"`
	UserCount       int32          `json:"user_count"`
	PermissionCount int32          `json:"permission_count"`
	CreatedAt       jsontime.Field `json:"created_at"`
	UpdatedAt       jsontime.Field `json:"updated_at"`
}

// RoleDetailDTO is RoleDetailSerializer (detail, edit, mutations).
type RoleDetailDTO struct {
	ID              string          `json:"id"`
	Code            string          `json:"code"`
	Name            string          `json:"name"`
	Description     string          `json:"description"`
	IsSystem        bool            `json:"is_system"`
	IsActive        bool            `json:"is_active"`
	Permissions     []PermissionDTO `json:"permissions"`
	UserCount       int32           `json:"user_count"`
	PermissionCount int32           `json:"permission_count"`
	CreatedAt       jsontime.Field  `json:"created_at"`
	UpdatedAt       jsontime.Field  `json:"updated_at"`
}

func toRoleList(r db.ListRolesRow) RoleListDTO {
	return RoleListDTO{ID: r.ID.String(), Code: r.Code, Name: r.Name, Description: r.Description,
		IsSystem: r.IsSystem, IsActive: r.IsActive, UserCount: r.UserCount,
		PermissionCount: r.PermissionCount, CreatedAt: jsontime.Field(r.CreatedAt),
		UpdatedAt: jsontime.Field(r.UpdatedAt)}
}

func toRoleDetail(r db.GetRoleRow, perms []db.RolePermissionsRow) RoleDetailDTO {
	out := RoleDetailDTO{ID: r.ID.String(), Code: r.Code, Name: r.Name, Description: r.Description,
		IsSystem: r.IsSystem, IsActive: r.IsActive, UserCount: r.UserCount,
		PermissionCount: r.PermissionCount, CreatedAt: jsontime.Field(r.CreatedAt),
		UpdatedAt: jsontime.Field(r.UpdatedAt), Permissions: make([]PermissionDTO, 0, len(perms))}
	for _, p := range perms {
		out.Permissions = append(out.Permissions, toPermission(p.ID.String(), p.Code, p.Name, p.Module, p.Description))
	}
	return out
}
