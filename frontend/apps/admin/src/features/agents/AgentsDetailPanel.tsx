import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminConfirmModal,
  AdminDetailPage,
  DynamicTableSection,
  TableStatusBadge,
  type AdminDetailAction,
  type TableHeader,
} from '@shared/components'
import { useUrlTab } from '@shared/hooks/useUrlTab'
import { apiErrorMessage } from '@lib/api/auth'
import { useCapabilities } from '../auth/useCapabilities'
import { useState } from 'react'
import {
  openShiftForAgent,
  useActivateAgent,
  useAgent,
  useAgentOverrides,
  useAgentShifts,
  useDeactivateAgent,
  useResendAgentInvite,
} from './hooks/use-agents'
import type { ShiftRow } from '@features/payments/hooks/use-cash-ops'

const SHIFT_HEADERS: TableHeader[] = [
  { key: 'hub', label: 'HUB' },
  { key: 'opened', label: 'OPENED' },
  { key: 'status', label: 'STATUS' },
]

const OVERRIDE_HEADERS: TableHeader[] = [
  { key: 'when', label: 'WHEN' },
  { key: 'reason', label: 'REASON' },
  { key: 'note', label: 'NOTE' },
]

export function AgentsDetailPanel({ id }: { id: string }) {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const [tab] = useUrlTab('shifts', { valid: ['shifts', 'overrides'] })
  const { agent, isPending, isError, refetch } = useAgent(id)
  const { data: shiftsData, isPending: shiftsPending } = useAgentShifts(id, {
    enabled: tab === 'shifts',
  })
  const { overrides, isPending: overridesPending } = useAgentOverrides(id, {
    enabled: tab === 'overrides',
  })
  const deactivate = useDeactivateAgent(id)
  const activate = useActivateAgent(id)
  const resendInvite = useResendAgentInvite(id)
  const [pending, setPending] = useState<
    'deactivate' | 'activate' | 'resend-invite' | null
  >(null)

  const shifts = shiftsData?.results ?? []
  const open = openShiftForAgent(shifts)

  if (isPending) {
    return (
      <div className="p-6">
        <Skeleton height={280} radius="md" />
      </div>
    )
  }

  if (isError || !agent) {
    return (
      <AdminDetailPage
        backLabel="Back to hub operators"
        onBack={() => navigate('/agents')}
        title="Hub operator not found"
        summaryRows={[{ label: 'ID', value: id }]}
      />
    )
  }

  const actions: AdminDetailAction[] = []
  if (can('users:manage')) {
    actions.push({
      id: 'edit',
      label: 'Edit',
      onClick: () => navigate(`/agents/${agent.id}/edit`),
    })
    if (agent.status === 'INVITED') {
      actions.push({
        id: 'resend-invite',
        label: 'Resend invite',
        onClick: () => setPending('resend-invite'),
      })
    }
    if (agent.isActive) {
      actions.push({
        id: 'deactivate',
        label: 'Deactivate',
        tone: 'danger',
        onClick: () => setPending('deactivate'),
      })
    } else {
      actions.push({
        id: 'activate',
        label: 'Activate',
        onClick: () => setPending('activate'),
      })
    }
  }

  return (
    <>
      <AdminDetailPage
        backLabel="Back to hub operators"
        onBack={() => navigate('/agents')}
        breadcrumbs={[{ label: 'Hub Operators', to: '/agents' }, { label: agent.name }]}
        title={agent.name}
        subtitle={agent.email || agent.phone}
        statusLabel={agent.status}
        statusTone={
          agent.status === 'ACTIVE'
            ? 'success'
            : agent.status === 'INVITED'
              ? 'warning'
              : 'danger'
        }
        actions={actions}
        summaryRows={[
          { label: 'Staff code', value: agent.publicId },
          { label: 'Phone', value: agent.phone },
          { label: 'Email', value: agent.email || '—' },
          {
            label: 'On duty',
            value: open
              ? `Yes · ${open.hub_code || open.hub_name}`
              : 'No open shift',
          },
        ]}
        tabs={[
          {
            id: 'shifts',
            label: 'Shifts',
            content: shiftsPending ? (
              <Skeleton height={140} radius="md" />
            ) : (
              <DynamicTableSection<ShiftRow>
                variant="embedded"
                headers={SHIFT_HEADERS}
                data={shifts}
                getRowKey={(r) => r.id}
                toolbar={{ title: 'Shifts', showFilter: false }}
                emptyTitle="No shifts"
                emptyMessage="Open shifts for this agent will show here after they clock in at a hub."
                onRowClick={(r) => navigate(`/payments/${r.id}`)}
                renderItems={(r) => [
                  r.hub_code || r.hub_name,
                  new Date(r.opened_at).toLocaleString(),
                  <TableStatusBadge
                    key="s"
                    label={r.status}
                    tone={r.status === 'OPEN' ? 'success' : 'neutral'}
                  />,
                ]}
              />
            ),
          },
          {
            id: 'overrides',
            label: 'Overrides',
            content: overridesPending ? (
              <Skeleton height={140} radius="md" />
            ) : (
              <DynamicTableSection<(typeof overrides)[number]>
                variant="embedded"
                headers={OVERRIDE_HEADERS}
                data={overrides}
                getRowKey={(r) => r.id}
                toolbar={{ title: 'Overrides', showFilter: false }}
                emptyTitle="No overrides"
                emptyMessage="Bay PIN overrides by this agent will appear here."
                renderItems={(r) => [
                  new Date(r.created_at).toLocaleString(),
                  r.reason,
                  r.note || '—',
                ]}
              />
            ),
          },
        ]}
      />

      <AdminConfirmModal
        opened={Boolean(pending)}
        onClose={() => setPending(null)}
        title={
          pending === 'deactivate'
            ? 'Deactivate agent?'
            : pending === 'resend-invite'
              ? 'Resend invite?'
              : 'Activate agent?'
        }
        body={
          pending === 'deactivate'
            ? 'Agent loses bay access until reactivated.'
            : pending === 'resend-invite'
              ? 'Emails a fresh password-setup link. They cannot sign in until they set a password.'
              : 'Restores staff login for this agent.'
        }
        confirmTone={pending === 'deactivate' ? 'danger' : 'primary'}
        confirmLabel={
          pending === 'deactivate'
            ? 'Deactivate'
            : pending === 'resend-invite'
              ? 'Resend invite'
              : 'Activate'
        }
        loading={
          deactivate.isPending || activate.isPending || resendInvite.isPending
        }
        onConfirm={async () => {
          const action = pending
          try {
            if (action === 'deactivate') await deactivate.mutateAsync({})
            else if (action === 'resend-invite')
              await resendInvite.mutateAsync({})
            else await activate.mutateAsync({})
            setPending(null)
            await refetch()
            notifications.show({
              color: 'teal',
              message:
                action === 'resend-invite' ? 'Invite email sent.' : 'Updated.',
            })
          } catch (err) {
            notifications.show({
              color: 'red',
              message: apiErrorMessage(err, 'Update failed'),
            })
          }
        }}
      />
    </>
  )
}
