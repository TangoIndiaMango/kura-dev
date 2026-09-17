import { useState } from 'react'
import {
  DetailsDrawer,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
} from '@shared/components'
import { downloadCsv } from '@shared/utils/downloadCsv'
import type { OperatorActivityRow } from './operatorDetailHelpers'

const HEADERS: TableHeader[] = [
  { key: 'date', label: 'DATE' },
  { key: 'type', label: 'ACTION' },
  { key: 'hub', label: 'CHANNEL' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'status', label: 'STATUS' },
]

const STATUS_OPTIONS = [
  { value: 'Completed', label: 'Completed' },
  { value: 'Failed', label: 'Failed' },
  { value: 'Pending', label: 'Pending' },
]

function statusTone(status: string) {
  const s = status.toUpperCase()
  if (s === 'COMPLETED') return 'success' as const
  if (s === 'FAILED' || s === 'DISPUTED') return 'danger' as const
  if (s === 'PENDING') return 'warning' as const
  return 'neutral' as const
}

/** Live audit feed for this operator (account + owner subjects). */
export function OperatorActivityTable({
  operatorId,
  kuraId,
  rows,
}: {
  operatorId: string
  kuraId: string
  rows: OperatorActivityRow[]
}) {
  const [peek, setPeek] = useState<OperatorActivityRow | null>(null)
  const controls = useAdminModuleControls({
    scope: `operator_${operatorId}_activity`,
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter activity',
    showDateRange: false,
    includeDateRangeInFilter: true,
  })

  const q = controls.search.toLowerCase()
  const filtered = rows.filter(
    (r) =>
      controls.matchesStatus(r.status) &&
      ((r.action ?? r.kind).toLowerCase().includes(q) ||
        r.hubOrChannel.toLowerCase().includes(q) ||
        r.date.toLowerCase().includes(q)),
  )

  const { pageRows, pagination } = controls.paginate(filtered)

  return (
    <>
      <DynamicTableSection<OperatorActivityRow>
        variant="embedded"
        headers={HEADERS}
        data={pageRows}
        pagination={pagination}
        getRowKey={(r) => r.id}
        toolbar={{
          title: 'Activity',
          searchQuery: controls.searchQuery,
          onSearchChange: controls.setSearchQuery,
          searchPlaceholder: 'Search action, channel…',
          showFilter: true,
          onFilter: controls.openFilter,
          showExport: true,
          onExport: () =>
            downloadCsv(
              `${kuraId}-activity.csv`,
              ['date', 'action', 'channel', 'amount', 'status'],
              filtered.map((r) => [
                r.date,
                r.action ?? r.kind,
                r.hubOrChannel,
                r.amountLabel,
                r.status,
              ]),
            ),
        }}
        onRowClick={setPeek}
        emptyTitle="No activity yet"
        emptyMessage="Logins, KYC, and account events for this operator appear here."
        renderItems={(row) => [
          row.date,
          <span key="t" className="font-semibold text-[var(--tx)]">
            {row.action ?? row.kind}
          </span>,
          row.hubOrChannel,
          <span key="a" className="tabular-nums">
            {row.amountLabel}
          </span>,
          <TableStatusBadge key="s" label={row.status} tone={statusTone(row.status)} />,
        ]}
      />
      {controls.filterModal}

      <DetailsDrawer
        opened={Boolean(peek)}
        onClose={() => setPeek(null)}
        title={peek ? `${peek.action ?? peek.kind} · ${peek.date}` : 'Activity'}
        rows={
          peek
            ? [
                { label: 'Action', value: peek.action ?? peek.kind },
                { label: 'Channel', value: peek.hubOrChannel },
                { label: 'Amount', value: peek.amountLabel },
                { label: 'Status', value: peek.status },
              ]
            : []
        }
      />
    </>
  )
}
