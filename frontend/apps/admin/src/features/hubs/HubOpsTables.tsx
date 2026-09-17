import { useMemo, useState } from 'react'
import {
  DetailsDrawer,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
} from '@shared/components'
import {
  type AgentRecord,
  type AlertRecord,
  type CashReconRecord,
  type ReservationRecord,
} from '@shared/mock/adminMockData'
import { downloadCsv } from '@shared/utils/downloadCsv'
import { formatNaira } from '@shared/utils/currency'
import { cashStatusLabel } from '../payments/cashReconHelpers'

const AGENT_HEADERS: TableHeader[] = [
  { key: 'name', label: 'NAME' },
  { key: 'duty', label: 'DUTY' },
  { key: 'device', label: 'DEVICE' },
  { key: 'overrides', label: 'OVERRIDES' },
  { key: 'status', label: 'STATUS' },
]

const RSV_HEADERS: TableHeader[] = [
  { key: 'code', label: 'CODE' },
  { key: 'time', label: 'TIME' },
  { key: 'operator', label: 'OPERATOR' },
  { key: 'expires', label: 'EXPIRES' },
  { key: 'status', label: 'STATUS' },
]

const CASH_HEADERS: TableHeader[] = [
  { key: 'agent', label: 'AGENT' },
  { key: 'collected', label: 'COLLECTED' },
  { key: 'deposited', label: 'DEPOSITED' },
  { key: 'variance', label: 'VARIANCE' },
  { key: 'status', label: 'STATUS' },
]

const ALERT_HEADERS: TableHeader[] = [
  { key: 'raised', label: 'RAISED' },
  { key: 'title', label: 'TITLE' },
  { key: 'severity', label: 'SEVERITY' },
  { key: 'status', label: 'STATUS' },
]

function agentTone(status: AgentRecord['status']) {
  if (status === 'ACTIVE') return 'success' as const
  if (status === 'MAINTENANCE') return 'warning' as const
  return 'neutral' as const
}

function rsvTone(status: ReservationRecord['status']) {
  if (status === 'ACTIVE') return 'success' as const
  if (status === 'EXPIRED') return 'warning' as const
  return 'neutral' as const
}

function cashTone(status: CashReconRecord['status'] | string) {
  if (status === 'CLOSED' || status === 'SETTLED') return 'success' as const
  if (status === 'CLOSED_SHORT' || status === 'SHORT') return 'info' as const
  if (
    status === 'DEPOSIT_PENDING' ||
    status === 'ON_DUTY' ||
    status === 'AWAITING_LODGE' ||
    status === 'IN_REVIEW'
  ) {
    return 'warning' as const
  }
  return 'danger' as const
}

function alertTone(severity: AlertRecord['severity']) {
  if (severity === 'CRITICAL') return 'danger' as const
  if (severity === 'OPERATIONAL') return 'warning' as const
  return 'info' as const
}

export function HubAgentsTable({ hubId, rows }: { hubId: string; rows: AgentRecord[] }) {
  const [peek, setPeek] = useState<AgentRecord | null>(null)
  const controls = useAdminModuleControls({
    scope: `hub_${hubId}_agents`,
    statusOptions: [
      { value: 'ACTIVE', label: 'Active' },
      { value: 'MAINTENANCE', label: 'Maintenance' },
      { value: 'INACTIVE', label: 'Inactive' },
    ],
    filterTitle: 'Filter agents',
    showDateRange: false,
    includeDateRangeInFilter: false,
  })

  const filtered = useMemo(() => {
    const q = controls.search.toLowerCase()
    return rows.filter(
      (r) =>
        controls.matchesStatus(r.status) &&
        (r.name.toLowerCase().includes(q) || r.deviceId.toLowerCase().includes(q)),
    )
  }, [rows, controls.search, controls.filterValues])

  const { pageRows, pagination } = controls.paginate(filtered)

  return (
    <>
      <DynamicTableSection<AgentRecord>
        variant="embedded"
        headers={AGENT_HEADERS}
        data={pageRows}
        pagination={pagination}
        getRowKey={(r) => r.id}
        toolbar={{
          title: 'Assigned agents',
          searchQuery: controls.searchQuery,
          onSearchChange: controls.setSearchQuery,
          searchPlaceholder: 'Search name or device…',
          showFilter: true,
          onFilter: controls.openFilter,
          showExport: true,
          onExport: () =>
            downloadCsv(
              `${hubId}-agents.csv`,
              ['name', 'duty', 'device', 'overrides', 'status'],
              filtered.map((r) => [
                r.name,
                r.onDuty ? 'On duty' : 'Off',
                r.deviceId,
                r.overridesToday,
                r.status,
              ]),
            ),
        }}
        onRowClick={setPeek}
        emptyTitle="No agents assigned"
        emptyMessage="Assign agents to this hub from User Management."
        renderItems={(r) => [
          r.name,
          r.onDuty ? 'On duty' : 'Off duty',
          r.deviceId,
          r.overridesToday,
          <TableStatusBadge key="s" label={r.status} tone={agentTone(r.status)} />,
        ]}
      />
      {controls.filterModal}
      <DetailsDrawer
        opened={!!peek}
        onClose={() => setPeek(null)}
        title={peek?.name ?? 'Agent'}
        rows={
          peek
            ? [
                { label: 'Phone', value: peek.phone },
                { label: 'Device', value: peek.deviceId },
                { label: 'On duty', value: peek.onDuty ? 'Yes' : 'No' },
                { label: 'Overrides today', value: peek.overridesToday },
                { label: 'Status', value: peek.status },
              ]
            : []
        }
        viewMore={peek ? { to: `/agents/${peek.id}`, label: 'View more' } : undefined}
      />
    </>
  )
}

export function HubReservationsTable({
  hubId,
  rows,
}: {
  hubId: string
  rows: ReservationRecord[]
}) {
  const [peek, setPeek] = useState<ReservationRecord | null>(null)
  const controls = useAdminModuleControls({
    scope: `hub_${hubId}_rsv`,
    statusOptions: [
      { value: 'ACTIVE', label: 'Active' },
      { value: 'EXPIRED', label: 'Expired' },
      { value: 'CANCELLED', label: 'Cancelled' },
    ],
    filterTitle: 'Filter reservations',
    showDateRange: false,
    includeDateRangeInFilter: false,
  })

  const filtered = useMemo(() => {
    const q = controls.search.toLowerCase()
    return rows.filter(
      (r) =>
        controls.matchesStatus(r.status) &&
        (r.code.toLowerCase().includes(q) || r.operatorName.toLowerCase().includes(q)),
    )
  }, [rows, controls.search, controls.filterValues])

  const { pageRows, pagination } = controls.paginate(filtered)

  return (
    <>
      <DynamicTableSection<ReservationRecord>
        variant="embedded"
        headers={RSV_HEADERS}
        data={pageRows}
        pagination={pagination}
        getRowKey={(r) => r.id}
        toolbar={{
          title: 'Reservations',
          searchQuery: controls.searchQuery,
          onSearchChange: controls.setSearchQuery,
          searchPlaceholder: 'Search code or operator…',
          showFilter: true,
          onFilter: controls.openFilter,
          showExport: true,
          onExport: () =>
            downloadCsv(
              `${hubId}-reservations.csv`,
              ['code', 'time', 'operator', 'expires', 'status'],
              filtered.map((r) => [r.code, r.time, r.operatorName, r.expiresIn, r.status]),
            ),
        }}
        onRowClick={setPeek}
        emptyTitle="No reservations"
        emptyMessage="Active holds at this hub will appear here."
        renderItems={(r) => [
          r.code,
          r.time,
          r.operatorName,
          r.expiresIn,
          <TableStatusBadge key="s" label={r.status} tone={rsvTone(r.status)} />,
        ]}
      />
      {controls.filterModal}
      <DetailsDrawer
        opened={!!peek}
        onClose={() => setPeek(null)}
        title={peek?.code ?? 'Reservation'}
        rows={
          peek
            ? [
                { label: 'Operator', value: peek.operatorName },
                { label: 'Vehicle', value: peek.vehicleReg },
                { label: 'Expires', value: peek.expiresIn },
                { label: 'Status', value: peek.status },
              ]
            : []
        }
        viewMore={peek ? { to: '/reservations', label: 'View reservations' } : undefined}
      />
    </>
  )
}

export function HubCashTable({ hubId, rows }: { hubId: string; rows: CashReconRecord[] }) {
  const [peek, setPeek] = useState<CashReconRecord | null>(null)
  const controls = useAdminModuleControls({
    scope: `hub_${hubId}_cash`,
    statusOptions: [
      { value: 'ON_DUTY', label: 'On duty' },
      { value: 'AWAITING_LODGE', label: 'Awaiting bank lodge' },
      { value: 'SETTLED', label: 'Settled' },
      { value: 'SHORT', label: 'Short drawer' },
      { value: 'VARIANCE', label: 'Needs review' },
    ],
    filterTitle: 'Filter cash shifts',
    showDateRange: false,
    includeDateRangeInFilter: false,
  })

  const filtered = useMemo(() => {
    const q = controls.search.toLowerCase()
    return rows.filter(
      (r) =>
        controls.matchesStatus(r.status) && r.agentName.toLowerCase().includes(q),
    )
  }, [rows, controls.search, controls.filterValues])

  const { pageRows, pagination } = controls.paginate(filtered)

  return (
    <>
      <DynamicTableSection<CashReconRecord>
        variant="embedded"
        headers={CASH_HEADERS}
        data={pageRows}
        pagination={pagination}
        getRowKey={(r) => r.id}
        toolbar={{
          title: 'Cash & shifts',
          searchQuery: controls.searchQuery,
          onSearchChange: controls.setSearchQuery,
          searchPlaceholder: 'Search agent…',
          showFilter: true,
          onFilter: controls.openFilter,
          showExport: true,
          onExport: () =>
            downloadCsv(
              `${hubId}-cash.csv`,
              ['agent', 'collected', 'deposited', 'variance', 'status'],
              filtered.map((r) => [
                r.agentName,
                r.collected,
                r.deposited,
                r.variance,
                r.status,
              ]),
            ),
        }}
        onRowClick={setPeek}
        emptyTitle="No cash shifts"
        emptyMessage="Reconciliation rows for this hub will list here."
        renderItems={(r) => [
          r.agentName,
          formatNaira(r.collected),
          formatNaira(r.deposited),
          formatNaira(r.variance),
          <TableStatusBadge key="s" label={cashStatusLabel(r.status)} tone={cashTone(r.status)} />,
        ]}
      />
      {controls.filterModal}
      <DetailsDrawer
        opened={!!peek}
        onClose={() => setPeek(null)}
        title={peek?.agentName ?? 'Cash shift'}
        rows={
          peek
            ? [
                { label: 'Expected', value: formatNaira(peek.expected) },
                { label: 'Collected', value: formatNaira(peek.collected) },
                { label: 'Deposited', value: formatNaira(peek.deposited) },
                { label: 'Variance', value: formatNaira(peek.variance) },
                { label: 'As of', value: peek.asOf },
                { label: 'Status', value: cashStatusLabel(peek.status) },
              ]
            : []
        }
        viewMore={
          peek
            ? { to: `/payments/${peek.id}`, label: 'Open reconciliation' }
            : { to: '/payments', label: 'View payments' }
        }
      />
    </>
  )
}

export function HubAlertsTable({ hubId, rows }: { hubId: string; rows: AlertRecord[] }) {
  const [peek, setPeek] = useState<AlertRecord | null>(null)
  const controls = useAdminModuleControls({
    scope: `hub_${hubId}_alerts`,
    statusOptions: [
      { value: 'OPEN', label: 'Open' },
      { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
      { value: 'RESOLVED', label: 'Resolved' },
      { value: 'ESCALATED', label: 'Escalated' },
    ],
    filterTitle: 'Filter alerts',
    showDateRange: false,
    includeDateRangeInFilter: false,
  })

  const filtered = useMemo(() => {
    const q = controls.search.toLowerCase()
    return rows.filter(
      (r) =>
        controls.matchesStatus(r.status) &&
        (r.title.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q)),
    )
  }, [rows, controls.search, controls.filterValues])

  const { pageRows, pagination } = controls.paginate(filtered)

  return (
    <>
      <DynamicTableSection<AlertRecord>
        variant="embedded"
        headers={ALERT_HEADERS}
        data={pageRows}
        pagination={pagination}
        getRowKey={(r) => r.id}
        toolbar={{
          title: 'Incidents at this hub',
          searchQuery: controls.searchQuery,
          onSearchChange: controls.setSearchQuery,
          searchPlaceholder: 'Search alert…',
          showFilter: true,
          onFilter: controls.openFilter,
          showExport: true,
          onExport: () =>
            downloadCsv(
              `${hubId}-alerts.csv`,
              ['raised', 'title', 'severity', 'status'],
              filtered.map((r) => [r.raisedTime, r.title, r.severity, r.status]),
            ),
        }}
        onRowClick={setPeek}
        emptyTitle="No open incidents"
        emptyMessage="Hub-scoped alerts will appear here."
        renderItems={(r) => [
          r.raisedTime,
          r.title,
          <TableStatusBadge key="sev" label={r.severity} tone={alertTone(r.severity)} />,
          <TableStatusBadge key="st" label={r.status} tone="neutral" />,
        ]}
      />
      {controls.filterModal}
      <DetailsDrawer
        opened={!!peek}
        onClose={() => setPeek(null)}
        title={peek?.title ?? 'Alert'}
        rows={
          peek
            ? [
                { label: 'Subject', value: peek.subject },
                { label: 'Severity', value: peek.severity },
                { label: 'Delivery', value: peek.delivery },
                { label: 'Age', value: peek.age },
                { label: 'Status', value: peek.status },
              ]
            : []
        }
        viewMore={
          peek?.id.startsWith('ALT-')
            ? { to: `/alerts/${peek.id}`, label: 'View more' }
            : { to: '/alerts', label: 'View alerts' }
        }
      />
    </>
  )
}
