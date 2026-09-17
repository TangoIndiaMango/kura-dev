import { useFetchData } from '@shared/hooks/api'
import {
  useActivateStaff,
  useDeactivateStaff,
  useInviteStaff,
  useResendStaffInvite,
  useStaffUser,
  useStaffUsers,
  useUpdateStaff,
  type StaffUserApi,
} from '@features/users/hooks/use-users'
import {
  useShifts,
  type ShiftRow,
} from '@features/payments/hooks/use-cash-ops'

export type AgentListRow = {
  id: string
  name: string
  email: string
  phone: string
  publicId: string
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED'
  isActive: boolean
}

function mapAgent(row: StaffUserApi): AgentListRow {
  return {
    id: row.id,
    name:
      row.name ||
      [row.first_name, row.last_name].filter(Boolean).join(' ') ||
      row.email ||
      'Agent',
    email: row.email || '',
    phone: row.phone || '—',
    publicId: row.public_id || row.id,
    status: !row.is_active
      ? 'SUSPENDED'
      : !row.last_login
        ? 'INVITED'
        : 'ACTIVE',
    isActive: row.is_active,
  }
}

export function useAgents(
  params?: {
    search?: string
    status?: string
    page?: number
    page_size?: number
  },
  options?: { enabled?: boolean },
) {
  const query = useStaffUsers({
    ...params,
    role: 'HUB_AGENT',
    enabled: options?.enabled,
  })
  return {
    ...query,
    agents: (query.raw ?? []).map(mapAgent),
  }
}

export function useAgent(id: string | undefined) {
  const query = useStaffUser(id)
  return {
    ...query,
    agent: query.raw ? mapAgent(query.raw) : null,
  }
}

export function useAgentShifts(
  agentId: string | null | undefined,
  options?: { enabled?: boolean; status?: string },
) {
  return useShifts({
    agent: agentId ?? undefined,
    status: options?.status,
    page: 1,
    enabled: Boolean(agentId) && options?.enabled !== false,
  })
}

type Page<T> = { results: T[]; count?: number }

export type OverrideRow = {
  id: string
  agent: string
  agent_email: string
  reason: string
  note: string
  swap_id: string | null
  created_at: string
}

export function useAgentOverrides(
  agentId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const id = agentId ?? ''
  const enabled = Boolean(id) && options?.enabled !== false
  const query = useFetchData<Page<OverrideRow>>(
    '/operations/overrides/',
    id ? { agent: id, page_size: 50 } : undefined,
    { enabled, staleTime: 15_000 },
  )
  return { ...query, overrides: query.data?.results ?? [] }
}

export function openShiftForAgent(shifts: ShiftRow[]): ShiftRow | null {
  return shifts.find((s) => s.status === 'OPEN') ?? null
}

export {
  useInviteStaff as useInviteAgent,
  useUpdateStaff as useUpdateAgent,
  useDeactivateStaff as useDeactivateAgent,
  useActivateStaff as useActivateAgent,
  useResendStaffInvite as useResendAgentInvite,
}
