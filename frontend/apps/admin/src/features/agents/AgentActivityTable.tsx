import { useMemo, useState } from 'react'
import {
  DetailsDrawer,
  DetailPeekTrigger,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
} from '@shared/components'
import { findHubByName } from '@shared/utils/detailLinks'
import { downloadCsv } from '@shared/utils/downloadCsv'
import type { AgentActivityRow } from './agentDetailHelpers'

const HEADERS: TableHeader[] = [
  { key: 'at', label: 'WHEN' },
  { key: 'kind', label: 'TYPE' },
  { key: 'detail', label: 'DETAIL' },
  { key: 'hub', label: 'HUB / SOURCE' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'status', label: 'STATUS' },
]

const STATUS_OPTIONS = [
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'OVERRIDE', label: 'Override' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'BALANCED', label: 'Balanced' },
  { value: 'VARIANCE', label: 'Variance' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'LOGGED', label: 'Logged' },
  { value: 'FLAGGED', label: 'Flagged' },
]

function statusTone(status: string) {
  const s = status.toUpperCase()
  if (
    s === 'COMPLETED' ||
    s === 'BALANCED' ||
    s === 'CLOSED' ||
    s === 'CLEARED' ||
    s === 'LOGGED'
  )
    return 'success' as const
  if (
    s === 'FAILED' ||
    s === 'VARIANCE' ||
    s === 'FLAGGED' ||
    s === 'REJECTED' ||
    s === 'CLOSED_SHORT'
  )
    return 'danger' as const
  if (
    s === 'PENDING' ||
    s === 'DEPOSIT_PENDING' ||
    s === 'ON_DUTY' ||
    s === 'AWAITING_LODGE' ||
    s === 'IN_REVIEW' ||
    s === 'OVERRIDE' ||
    s === 'OPEN' ||
    s === 'REVIEWED'
  )
    return 'warning' as const
  return 'neutral' as const
}

/** Unified feed: swaps, overrides, cash, shifts + admin audit trail. */
export function AgentActivityTable({
  agentId,
  agentName,
  rows,
}: {
  agentId: string
  agentName: string
  rows: AgentActivityRow[]
}) {
  const [peek, setPeek] = useState<AgentActivityRow | null>(null)
  const [hubOpen, setHubOpen] = useState(false)
  const controls = useAdminModuleControls({
    scope: `agent_${agentId}_activity`,
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter activity',
    showDateRange: false,
    includeDateRangeInFilter: true,
    extraFilterFields: [
      {
        type: 'select',
        key: 'kind',
        label: 'Type',
        placeholder: 'Any',
        options: [
          { value: 'Swap', label: 'Swap' },
          { value: 'Override', label: 'Override' },
          { value: 'Cash', label: 'Cash' },
          { value: 'Registration', label: 'Registration' },
          { value: 'Shift', label: 'Shift' },
          { value: 'Audit', label: 'Audit' },
        ],
      },
    ],
  })

  const filtered = useMemo(() => {
    const q = controls.search.toLowerCase()
    return rows.filter((r) => {
      if (!controls.matchesStatus(r.status)) return false
      if (!controls.matchesFilter('kind', r.kind)) return false
      return (
        r.kind.toLowerCase().includes(q) ||
        r.detail.toLowerCase().includes(q) ||
        r.hubOrChannel.toLowerCase().includes(q) ||
        r.at.toLowerCase().includes(q)
      )
    })
  }, [rows, controls.search, controls.filterValues])

  const { pageRows, pagination } = controls.paginate(filtered)
  const hub = peek ? findHubByName(peek.hubOrChannel) : undefined

  return (
    <>
      <DynamicTableSection<AgentActivityRow>
        variant="embedded"
        headers={HEADERS}
        data={pageRows}
        pagination={pagination}
        getRowKey={(r) => r.id}
        toolbar={{
          title: 'Activity & audit',
          searchQuery: controls.searchQuery,
          onSearchChange: controls.setSearchQuery,
          searchPlaceholder: 'Search type, detail, hub…',
          onFilter: controls.openFilter,
          showFilter: true,
          onExport: () =>
            downloadCsv(
              `${agentId}-activity.csv`,
              ['when', 'type', 'detail', 'hub', 'amount', 'status', 'agent'],
              filtered.map((r) => [
                r.at,
                r.kind,
                r.detail,
                r.hubOrChannel,
                r.amountLabel,
                r.status,
                agentName,
              ]),
            ),
        }}
        emptyTitle="No activity"
        emptyMessage="Swaps, cash, overrides, and audit events for this agent will appear here."
        onRowClick={(r) => setPeek(r)}
        renderItems={(r) => [
          <span key="at" className="whitespace-nowrap text-xs text-[var(--mu)]">
            {r.at}
          </span>,
          <TableStatusBadge
            key="kind"
            label={r.kind}
            tone={
              r.kind === 'Audit'
                ? 'neutral'
                : r.kind === 'Override'
                  ? 'warning'
                  : r.kind === 'Cash'
                    ? 'info'
                    : 'success'
            }
          />,
          <span key="detail" className="max-w-[220px] truncate text-xs text-[var(--tx)]">
            {r.detail}
          </span>,
          <span key="hub" className="max-w-[180px] truncate text-xs text-[var(--tx)]">
            {hub && r.hubOrChannel === hub.name ? (
              <DetailPeekTrigger
                label={r.hubOrChannel}
                onClick={() => {
                  setPeek(r)
                  setHubOpen(true)
                }}
              />
            ) : (
              r.hubOrChannel
            )}
          </span>,
          <span key="amt" className="text-xs tabular-nums text-[var(--tx)]">
            {r.amountLabel}
          </span>,
          <TableStatusBadge key="st" label={r.status} tone={statusTone(r.status)} />,
        ]}
      />
      {controls.filterModal}

      <DetailsDrawer
        opened={Boolean(peek) && !hubOpen}
        onClose={() => setPeek(null)}
        title={peek?.kind ?? 'Event'}
        rows={
          peek
            ? [
                { label: 'When', value: peek.at },
                { label: 'Type', value: peek.kind },
                { label: 'Detail', value: peek.detail },
                { label: 'Hub / source', value: peek.hubOrChannel },
                { label: 'Amount', value: peek.amountLabel },
                { label: 'Status', value: peek.status },
              ]
            : []
        }
      />

      <DetailsDrawer
        opened={hubOpen && Boolean(hub)}
        onClose={() => {
          setHubOpen(false)
          setPeek(null)
        }}
        title={hub?.name ?? 'Hub'}
        rows={
          hub
            ? [
                { label: 'Location', value: hub.location },
                { label: 'Status', value: hub.status },
                { label: 'Agent on duty', value: hub.agentOnDuty },
              ]
            : []
        }
        viewMore={hub ? { to: `/hubs/${hub.id}`, label: 'View hub' } : undefined}
      />
    </>
  )
}
