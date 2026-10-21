import { useFetchData, usePatchData, usePostData } from '@shared/hooks/api'
import {
  ROLES_ENDPOINTS,
  ROLES_QUERY_KEY,
  USERS_ENDPOINTS,
  USERS_QUERY_KEY,
} from '../constants/users-api.constants'
import type { RoleItem } from '../rolesData'
import { isAssignableStaffRole } from '../rolesData'
import type { AdminUserRecord } from '@shared/mock/adminMockData'

export type StaffUserApi = {
  id: string
  public_id?: string | null
  email: string | null
  phone: string | null
  first_name: string
  last_name: string
  name: string
  role: string
  assigned_role_code?: string | null
  assigned_role_name?: string | null
  hub_ids?: string[]
  is_active: boolean
  is_staff: boolean
  last_login?: string | null
  created_at?: string
  updated_at?: string
  temporary_password?: string
  invite_email_sent?: boolean
  expires_hours?: number
}

export type RoleListApi = {
  id: string
  code: string
  name: string
  description: string
  is_system: boolean
  is_active: boolean
  user_count: number
  permission_count: number
  created_at?: string
  updated_at?: string
}

export type RoleDetailApi = RoleListApi & {
  permissions: Array<{
    id: string
    code: string
    name: string
    module: string
    description?: string
  }>
}

/** @deprecated prefer RoleListApi / RoleDetailApi */
export type RoleApi = RoleDetailApi

type Paginated<T> = {
  count: number
  results: T[]
  current_page?: number
  total_pages?: number
  page_size?: number
}

export type StaffUserStats = {
  totals: {
    all: number
    active: number
    invited: number
    suspended: number
    roles: number
  }
}

export type RoleStats = {
  totals: {
    all: number
    system: number
    custom: number
    users_assigned: number
  }
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  OPS_MANAGER: 'Ops Manager',
  HUB_AGENT: 'Hub Agent',
  COMMERCIAL_ADMIN: 'Commercial Admin',
  GOVERNMENT_VIEWER: 'Government Viewer',
  PARTNER_VIEWER: 'Partner Viewer',
}

function staffStatus(row: StaffUserApi): AdminUserRecord['status'] {
  if (!row.is_active) return 'SUSPENDED'
  if (!row.last_login) return 'INVITED'
  return 'ACTIVE'
}

export function mapStaffUser(row: StaffUserApi): AdminUserRecord {
  return {
    id: row.id,
    publicId: row.public_id || row.id,
    name:
      row.name ||
      [row.first_name, row.last_name].filter(Boolean).join(' ') ||
      row.email ||
      'User',
    email: row.email || '',
    phone: row.phone || '—',
    role: row.assigned_role_name || ROLE_LABELS[row.role] || row.role,
    scope: 'Network-wide',
    organisation: 'KURA Energy Nigeria',
    status: staffStatus(row),
    lastLogin: row.last_login
      ? new Date(row.last_login).toLocaleString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—',
    invitedAt: row.created_at
      ? new Date(row.created_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—',
    mfaEnabled: false,
    authMethod: 'Email + password',
    sessionTimeout: '8 hours',
    audit: [],
  }
}

export function mapRole(row: RoleListApi): RoleItem {
  const stamp = row.updated_at || row.created_at
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || '',
    is_system: row.is_system,
    is_active: row.is_active !== false,
    permissionCount: row.permission_count ?? 0,
    usersAssigned: row.user_count ?? 0,
    updatedAt: stamp
      ? new Date(stamp).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—',
    status: row.is_active === false ? 'INACTIVE' : 'ACTIVE',
  }
}

export function useStaffUsers(params?: {
  search?: string
  status?: string
  role?: string
  hub?: string
  page?: number
  page_size?: number
  enabled?: boolean
}) {
  const query = useFetchData<Paginated<StaffUserApi>>(
    USERS_ENDPOINTS.list,
    {
      page: params?.page ?? 1,
      page_size: params?.page_size ?? 10,
      ...(params?.search ? { q: params.search, search: params.search } : {}),
      ...(params?.status && params.status !== 'all' ? { status: params.status } : {}),
      ...(params?.role ? { role: params.role } : {}),
      ...(params?.hub ? { hub: params.hub } : {}),
    },
    { keepPreviousData: true, enabled: params?.enabled ?? true },
  )
  return {
    ...query,
    users: (query.data?.results ?? []).map(mapStaffUser),
    count: query.data?.count ?? 0,
    totalPages: query.data?.total_pages ?? 1,
    currentPage: query.data?.current_page ?? params?.page ?? 1,
    raw: query.data?.results ?? [],
    isPending: query.isPending,
    isFetching: query.isFetching,
  }
}

export function useStaffUserStats(params?: {
  start_date?: string
  end_date?: string
  enabled?: boolean
}) {
  return useFetchData<StaffUserStats>(
    USERS_ENDPOINTS.stats,
    {
      ...(params?.start_date ? { start_date: params.start_date } : {}),
      ...(params?.end_date ? { end_date: params.end_date } : {}),
    },
    { keepPreviousData: true, enabled: params?.enabled ?? true },
  )
}

export function useStaffUser(id: string | undefined) {
  const query = useFetchData<StaffUserApi>(
    id ? USERS_ENDPOINTS.detail(id) : USERS_ENDPOINTS.list,
    undefined,
    { enabled: Boolean(id) },
  )
  return {
    ...query,
    user: query.data ? mapStaffUser(query.data) : null,
    raw: query.data ?? null,
    isPending: query.isPending,
    isFetching: query.isFetching,
  }
}

export function useInviteStaff() {
  return usePostData<
    {
      email: string
      role: string
      first_name?: string
      last_name?: string
      phone?: string
      password?: string
      cooperative_id?: string
      hub_ids?: string[]
    },
    StaffUserApi
  >(USERS_ENDPOINTS.list, [USERS_QUERY_KEY, USERS_ENDPOINTS.list], {
    silentError: true,
  })
}

export function useUpdateStaff(id: string) {
  return usePatchData<
    {
      first_name?: string
      last_name?: string
      phone?: string
      role?: string
      is_active?: boolean
      hub_ids?: string[]
    },
    StaffUserApi
  >(USERS_ENDPOINTS.detail(id), [USERS_QUERY_KEY, USERS_ENDPOINTS.list], {
    silentError: true,
  })
}

export function useDeactivateStaff(id: string) {
  return usePostData<Record<string, never>, StaffUserApi>(
    USERS_ENDPOINTS.deactivate(id),
    [USERS_QUERY_KEY, USERS_ENDPOINTS.list],
    { silentError: true, body: () => ({}) },
  )
}

export function useActivateStaff(id: string) {
  return usePostData<Record<string, never>, StaffUserApi>(
    USERS_ENDPOINTS.activate(id),
    [USERS_QUERY_KEY, USERS_ENDPOINTS.list],
    { silentError: true, body: () => ({}) },
  )
}

export function useResendStaffInvite(id: string) {
  return usePostData<Record<string, never>, StaffUserApi>(
    USERS_ENDPOINTS.resendInvite(id),
    [USERS_QUERY_KEY, USERS_ENDPOINTS.list, USERS_ENDPOINTS.detail(id)],
    { silentError: true, body: () => ({}) },
  )
}

export function useRoles(params?: {
  search?: string
  page?: number
  page_size?: number
  is_system?: boolean
  is_active?: boolean
  enabled?: boolean
}) {
  const query = useFetchData<Paginated<RoleListApi>>(
    ROLES_ENDPOINTS.list,
    {
      page: params?.page ?? 1,
      page_size: params?.page_size ?? 10,
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.is_system != null ? { is_system: params.is_system } : {}),
      ...(params?.is_active != null ? { is_active: params.is_active } : {}),
    },
    { keepPreviousData: true, enabled: params?.enabled ?? true },
  )
  return {
    ...query,
    roles: (query.data?.results ?? []).map(mapRole),
    count: query.data?.count ?? 0,
    totalPages: query.data?.total_pages ?? 1,
    currentPage: query.data?.current_page ?? params?.page ?? 1,
    raw: query.data?.results ?? [],
    isPending: query.isPending,
    isFetching: query.isFetching,
  }
}

export function useRole(id: string | undefined) {
  const query = useFetchData<RoleDetailApi>(
    id ? ROLES_ENDPOINTS.detail(id) : ROLES_ENDPOINTS.list,
    undefined,
    { enabled: Boolean(id) },
  )
  return {
    ...query,
    role: query.data ? mapRole(query.data) : null,
    raw: query.data ?? null,
    permissionCodes: (query.data?.permissions ?? []).map((p) => p.code),
    isPending: query.isPending,
    isFetching: query.isFetching,
  }
}

/** Active non-operator roles for staff invite / change-role pickers. */
export function useAssignableStaffRoles(options?: { enabled?: boolean }) {
  const query = useRoles({
    page_size: 100,
    is_active: true,
    enabled: options?.enabled ?? true,
  })
  const roleOptions = query.roles
    .filter((r) => isAssignableStaffRole(r.code, r.is_active))
    .map((r) => ({ value: r.code, label: r.name }))
  return { ...query, options: roleOptions }
}

export function useRoleStats(params?: { enabled?: boolean }) {
  return useFetchData<RoleStats>(ROLES_ENDPOINTS.stats, undefined, {
    keepPreviousData: true,
    enabled: params?.enabled ?? true,
  })
}

export function useCreateRole() {
  return usePostData<
    {
      code: string
      name: string
      description?: string
      permission_ids?: string[]
    },
    RoleDetailApi
  >(ROLES_ENDPOINTS.list, [ROLES_QUERY_KEY, ROLES_ENDPOINTS.list], {
    silentError: true,
  })
}

export function useUpdateRole(id: string) {
  return usePatchData<
    {
      name?: string
      description?: string
      permission_ids?: string[]
      is_active?: boolean
    },
    RoleDetailApi
  >((_) => ROLES_ENDPOINTS.detail(id), [ROLES_QUERY_KEY, ROLES_ENDPOINTS.list, ROLES_ENDPOINTS.detail(id)], {
    silentError: true,
  })
}

export function useActivateRole(id: string) {
  return usePostData<Record<string, never>, RoleDetailApi>(
    ROLES_ENDPOINTS.activate(id),
    [ROLES_QUERY_KEY, ROLES_ENDPOINTS.list, ROLES_ENDPOINTS.detail(id)],
    { silentError: true, body: () => ({}) },
  )
}

export function useDeactivateRole(id: string) {
  return usePostData<Record<string, never>, RoleDetailApi>(
    ROLES_ENDPOINTS.deactivate(id),
    [ROLES_QUERY_KEY, ROLES_ENDPOINTS.list, ROLES_ENDPOINTS.detail(id)],
    { silentError: true, body: () => ({}) },
  )
}

export function usePermissions() {
  return useFetchData<Paginated<{ id: string; code: string; name: string; module: string }>>(
    ROLES_ENDPOINTS.permissions,
    { page_size: 200 },
  )
}
