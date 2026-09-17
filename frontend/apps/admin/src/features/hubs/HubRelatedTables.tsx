import { useMemo, useState } from 'react'
import {
  DetailsDrawer,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
} from '@shared/components'
import {
  type BatteryRecord,
  type SwapRecord,
} from '@shared/mock/adminMockData'
import { downloadCsv } from '@shared/utils/downloadCsv'
import { formatNaira } from '@shared/utils/currency'

const BATTERY_HEADERS: TableHeader[] = [
  { key: 'serial', label: 'SERIAL' },
  { key: 'status', label: 'STATUS' },
  { key: 'charge', label: 'CHARGE' },
  { key: 'health', label: 'HEALTH' },
]

const SWAP_HEADERS: TableHeader[] = [
  { key: 'code', label: 'CODE' },
  { key: 'time', label: 'TIME' },
  { key: 'operator', label: 'OPERATOR' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'status', label: 'STATUS' },
]

const BATTERY_STATUS = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'CHARGING', label: 'Charging' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'IN_FIELD', label: 'In field' },
]

const SWAP_STATUS = [
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'OVERRIDE', label: 'Override' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'RESERVED', label: 'Reserved' },
]

function batteryTone(status: BatteryRecord['status']) {
  if (status === 'AVAILABLE') return 'success' as const
  if (status === 'MAINTENANCE') return 'warning' as const
  if (status === 'IN_FIELD') return 'info' as const
  return 'neutral' as const
}

function swapTone(status: SwapRecord['status']) {
  if (status === 'COMPLETED') return 'success' as const
  if (status === 'OVERRIDE') return 'warning' as const
  if (status === 'FAILED') return 'danger' as const
  return 'info' as const
}

export function HubBatteriesTable({
  hubId,
  rows,
}: {
  hubId: string
  rows: BatteryRecord[]
}) {
  const [peek, setPeek] = useState<BatteryRecord | null>(null)
  const controls = useAdminModuleControls({
    scope: `hub_${hubId}_batteries`,
    statusOptions: BATTERY_STATUS,
    filterTitle: 'Filter bay inventory',
    showDateRange: false,
    includeDateRangeInFilter: false,
  })

  const filtered = useMemo(() => {
    const q = controls.search.toLowerCase()
    return rows.filter(
      (r) =>
        controls.matchesStatus(r.status) &&
        (r.serial.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)),
    )
  }, [rows, controls.search, controls.filterValues])

  const { pageRows, pagination } = controls.paginate(filtered)

  return (
    <>
      <DynamicTableSection<BatteryRecord>
        variant="embedded"
        headers={BATTERY_HEADERS}
        data={pageRows}
        pagination={pagination}
        getRowKey={(r) => r.id}
        toolbar={{
          title: 'Bay inventory',
          searchQuery: controls.searchQuery,
          onSearchChange: controls.setSearchQuery,
          searchPlaceholder: 'Search serial or type…',
          showFilter: true,
          onFilter: controls.openFilter,
          showExport: true,
          onExport: () =>
            downloadCsv(
              `${hubId}-batteries.csv`,
              ['serial', 'status', 'charge', 'health'],
              filtered.map((r) => [r.serial, r.status, r.chargePct, r.healthPct]),
            ),
        }}
        onRowClick={setPeek}
        emptyTitle="No batteries on bay"
        emptyMessage="Inventory appears when packs dock at this hub."
        renderItems={(r) => [
          r.serial,
          <TableStatusBadge key="s" label={r.status.replace('_', ' ')} tone={batteryTone(r.status)} />,
          `${r.chargePct}%`,
          `${r.healthPct}%`,
        ]}
      />
      {controls.filterModal}

      <DetailsDrawer
        opened={!!peek}
        onClose={() => setPeek(null)}
        title={peek?.serial ?? 'Battery'}
        rows={
          peek
            ? [
                { label: 'Status', value: peek.status.replace('_', ' ') },
                { label: 'Charge', value: `${peek.chargePct}%` },
                { label: 'Health', value: `${peek.healthPct}%` },
                { label: 'Type', value: peek.type },
              ]
            : []
        }
        viewMore={
          peek
            ? peek.id.startsWith('BAT-')
              ? { to: `/batteries/${peek.id}`, label: 'View more' }
              : { to: '/batteries', label: 'View batteries' }
            : undefined
        }
      />
    </>
  )
}

export function HubSwapsTable({
  hubId,
  rows,
}: {
  hubId: string
  rows: SwapRecord[]
}) {
  const [peek, setPeek] = useState<SwapRecord | null>(null)
  const controls = useAdminModuleControls({
    scope: `hub_${hubId}_swaps`,
    statusOptions: SWAP_STATUS,
    filterTitle: 'Filter hub swaps',
    showDateRange: false,
    includeDateRangeInFilter: true,
  })

  const filtered = useMemo(() => {
    const q = controls.search.toLowerCase()
    return rows.filter(
      (r) =>
        controls.matchesStatus(r.status) &&
        (r.code.toLowerCase().includes(q) ||
          r.operatorName.toLowerCase().includes(q)),
    )
  }, [rows, controls.search, controls.filterValues])

  const { pageRows, pagination } = controls.paginate(filtered)

  return (
    <>
      <DynamicTableSection<SwapRecord>
        variant="embedded"
        headers={SWAP_HEADERS}
        data={pageRows}
        pagination={pagination}
        getRowKey={(r) => r.id}
        toolbar={{
          title: 'Sessions at this hub',
          searchQuery: controls.searchQuery,
          onSearchChange: controls.setSearchQuery,
          searchPlaceholder: 'Search code or operator…',
          showFilter: true,
          onFilter: controls.openFilter,
          showExport: true,
          onExport: () =>
            downloadCsv(
              `${hubId}-swaps.csv`,
              ['code', 'time', 'operator', 'amount', 'status'],
              filtered.map((r) => [r.code, r.time, r.operatorName, r.amount, r.status]),
            ),
        }}
        onRowClick={setPeek}
        emptyTitle="No swaps yet"
        emptyMessage="Completed sessions at this hub will list here."
        renderItems={(r) => [
          r.code,
          r.time,
          r.operatorName,
          r.amount ? formatNaira(r.amount) : 'Plan',
          <TableStatusBadge key="s" label={r.status} tone={swapTone(r.status)} />,
        ]}
      />
      {controls.filterModal}

      <DetailsDrawer
        opened={!!peek}
        onClose={() => setPeek(null)}
        title={peek?.code ?? 'Swap'}
        rows={
          peek
            ? [
                { label: 'Time', value: `Today · ${peek.time}` },
                { label: 'Operator', value: peek.operatorName },
                { label: 'Status', value: peek.status },
                {
                  label: 'Amount',
                  value: peek.planCovered ? 'Plan covered' : formatNaira(peek.amount),
                },
              ]
            : []
        }
        viewMore={
          peek
            ? peek.id.startsWith('SW-')
              ? { to: `/swaps/${peek.id}`, label: 'View more' }
              : { to: '/swaps', label: 'View swaps' }
            : undefined
        }
      />
    </>
  )
}
