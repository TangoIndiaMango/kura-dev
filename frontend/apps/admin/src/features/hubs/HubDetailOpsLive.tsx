/** Hub detail: agents (shifts) + alerts — reuse existing list APIs. */
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@mantine/core'
import {
  DynamicTableSection,
  TableStatusBadge,
  type TableHeader,
} from '@shared/components'
import { useAlerts, type AlertListApi } from '@features/alerts'
import {
  useShifts,
  type ShiftRow,
} from '@features/payments/hooks/use-cash-ops'

const AGENT_HEADERS: TableHeader[] = [
  { key: 'agent', label: 'AGENT' },
  { key: 'duty', label: 'DUTY' },
  { key: 'opened', label: 'OPENED' },
  { key: 'status', label: 'SHIFT' },
]

const ALERT_HEADERS: TableHeader[] = [
  { key: 'raised', label: 'RAISED' },
  { key: 'kind', label: 'KIND' },
  { key: 'severity', label: 'SEVERITY' },
  { key: 'status', label: 'STATUS' },
]

function alertTone(severity: string) {
  if (severity === 'CRITICAL') return 'danger' as const
  if (severity === 'WARNING') return 'warning' as const
  return 'info' as const
}

export function HubAgentsLiveTable({
  hubId,
  enabled = true,
}: {
  hubId: string
  enabled?: boolean
}) {
  const navigate = useNavigate()
  const { data, isPending } = useShifts({
    hub: hubId,
    page: 1,
    enabled,
  })
  const shifts = data?.results ?? []

  if (isPending) return <Skeleton height={140} radius="md" />

  return (
    <DynamicTableSection<ShiftRow>
      variant="embedded"
      headers={AGENT_HEADERS}
      data={shifts}
      getRowKey={(row) => row.id}
      toolbar={{
        title: 'Duty roster (shifts)',
        showFilter: false,
      }}
      emptyTitle="No shifts at this hub"
      emptyMessage="Open a shift from the bay or Payments → Cash to show agents here."
      onRowClick={(row) => navigate(`/agents/${row.agent_id}`)}
      renderItems={(row) => [
        <span key="a" className="text-xs font-semibold text-[var(--tx)]">
          {row.agent_name || row.agent_id}
        </span>,
        <span key="d" className="text-xs text-[var(--mu)]">
          {row.status === 'OPEN' ? 'On duty' : 'Off duty'}
        </span>,
        <span key="o" className="text-xs text-[var(--mu)]">
          {row.opened_at ? new Date(row.opened_at).toLocaleString() : '—'}
        </span>,
        <TableStatusBadge
          key="s"
          label={row.status}
          tone={row.status === 'OPEN' ? 'success' : 'neutral'}
        />,
      ]}
    />
  )
}

export function HubAlertsLiveTable({
  hubId,
  enabled = true,
}: {
  hubId: string
  enabled?: boolean
}) {
  const navigate = useNavigate()
  const { alerts, isPending } = useAlerts(
    { hub: hubId, page_size: 50 },
    { enabled, poll: enabled },
  )

  if (isPending) return <Skeleton height={140} radius="md" />

  return (
    <DynamicTableSection<AlertListApi>
      variant="embedded"
      headers={ALERT_HEADERS}
      data={alerts}
      getRowKey={(row) => row.id}
      toolbar={{
        title: 'Hub alerts',
        showFilter: false,
      }}
      emptyTitle="No alerts for this hub"
      emptyMessage="Open alerts for this hub appear here when rules fire."
      onRowClick={(row) => navigate(`/alerts/${row.id}`)}
      renderItems={(row) => [
        <span key="r" className="text-xs text-[var(--mu)]">
          {new Date(row.created_at).toLocaleString()}
        </span>,
        <span key="k" className="text-xs font-semibold text-[var(--tx)]">
          {row.kind.replace(/_/g, ' ')}
        </span>,
        <TableStatusBadge
          key="sev"
          label={row.severity}
          tone={alertTone(row.severity)}
        />,
        <span key="st" className="text-xs text-[var(--mu)]">
          {row.status}
        </span>,
      ]}
    />
  )
}
