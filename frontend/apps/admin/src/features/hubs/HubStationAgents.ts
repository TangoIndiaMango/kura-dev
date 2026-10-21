/** Live hub agents for station overview — staff memberships + open shifts. */
import { useMemo } from 'react'
import { useStaffUsers } from '@features/users/hooks/use-users'
import { useShifts } from '@features/payments/hooks/use-cash-ops'
import { useCapabilities } from '@features/auth/useCapabilities'

export type HubStationAgent = {
  id: string
  name: string
  phone: string
  onDuty: boolean
}

export function useHubStationAgents(hubId: string | undefined, enabled = true) {
  // Staff names/shifts are internal — viewer roles skip these calls entirely.
  const { can } = useCapabilities()
  const staff = useStaffUsers({
    role: 'HUB_AGENT',
    hub: hubId,
    page_size: 50,
    enabled: Boolean(hubId) && enabled && can('users:read'),
  })
  const shifts = useShifts({
    hub: hubId ?? '',
    page: 1,
    enabled: Boolean(hubId) && enabled && can('shifts:manage'),
  })
  const onDutyIds = useMemo(() => {
    const open = (shifts.data?.results ?? []).filter((s) => s.status === 'OPEN')
    return new Set(open.map((s) => s.agent_id))
  }, [shifts.data])

  const agents: HubStationAgent[] = useMemo(
    () =>
      (staff.raw ?? []).map((u) => ({
        id: u.id,
        name:
          u.name ||
          [u.first_name, u.last_name].filter(Boolean).join(' ') ||
          u.email ||
          'Agent',
        phone: u.phone || '—',
        onDuty: onDutyIds.has(u.id),
      })),
    [staff.raw, onDutyIds],
  )

  return {
    agents,
    isPending: staff.isPending || shifts.isPending,
  }
}
