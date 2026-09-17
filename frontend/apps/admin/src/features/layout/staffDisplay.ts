const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  OPS_MANAGER: 'Ops Manager',
  HUB_AGENT: 'Hub Agent',
  COMMERCIAL_ADMIN: 'Commercial Admin',
  GOVERNMENT_VIEWER: 'Government Viewer',
  PARTNER_VIEWER: 'Partner Viewer',
}

type StaffUserBits = {
  first_name?: string
  last_name?: string
  email?: string
  role?: string
}

export function staffDisplayName(user: StaffUserBits): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  return name || user.email || 'Staff'
}

export function staffInitials(user: StaffUserBits): string {
  const a = user.first_name?.charAt(0) || user.email?.charAt(0) || '?'
  const b = user.last_name?.charAt(0) || ''
  return `${a}${b}`.toUpperCase()
}

export function staffRoleLabel(role?: string): string {
  if (!role) return 'Staff'
  return ROLE_LABELS[role] ?? role.replace(/_/g, ' ')
}
