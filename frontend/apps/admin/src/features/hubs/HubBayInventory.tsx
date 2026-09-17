import { useMemo, useState } from 'react'
import {
  DetailsDrawer,
  DynamicTableSection,
  TableStatusBadge,
  matchesStatusFilter,
  useAdminModuleControls,
  type TableHeader,
} from '@shared/components'
import { scopeFilterKey } from '@shared/utils/table-filters/create-scoped-filters'
import type { BatteryRecord } from '@shared/mock/adminMockData'
import { downloadCsv } from '@shared/utils/downloadCsv'

type BayRow = {
  bay: number
  status: 'AVAILABLE' | 'CHARGING' | 'MAINTENANCE' | 'IN_FIELD' | 'EMPTY' | 'RETIRED'
  battery: BatteryRecord | null
}

const LIST_HEADERS: TableHeader[] = [
  { key: 'bay', label: 'BAY' },
  { key: 'serial', label: 'SERIAL' },
  { key: 'type', label: 'TYPE' },
  { key: 'status', label: 'STATUS' },
  { key: 'charge', label: 'CHARGE' },
  { key: 'health', label: 'HEALTH' },
]

const STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Ready' },
  { value: 'CHARGING', label: 'Charging' },
  { value: 'MAINTENANCE', label: 'Fault' },
  { value: 'IN_FIELD', label: 'In field' },
  { value: 'EMPTY', label: 'Empty' },
]

function batteryTone(status: BayRow['status']) {
  if (status === 'AVAILABLE') return 'success' as const
  if (status === 'MAINTENANCE') return 'danger' as const
  if (status === 'CHARGING') return 'info' as const
  if (status === 'EMPTY') return 'neutral' as const
  return 'info' as const
}

function isAttention(row: BayRow) {
  if (row.status === 'EMPTY' || row.status === 'MAINTENANCE') return true
  return Boolean(row.battery && row.battery.chargePct < 40)
}

function ChargeBar({ pct }: { pct: number }) {
  const tone =
    pct >= 80 ? 'bg-[#1E8E4E]' : pct >= 40 ? 'bg-[var(--pr)]' : 'bg-[#C0392B]'
  return (
    <div className="flex min-w-[72px] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--tn)]">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular-nums text-[12.5px] text-[var(--tx)]">{pct}%</span>
    </div>
  )
}

function buildBayRows(batteries: BatteryRecord[], slots: number): BayRow[] {
  const occupied = batteries.slice(0, slots)
  const rows: BayRow[] = occupied.map((battery, i) => ({
    bay: i + 1,
    status: battery.status,
    battery,
  }))
  for (let i = occupied.length; i < slots; i++) {
    rows.push({ bay: i + 1, status: 'EMPTY', battery: null })
  }
  return rows
}

/** List-only bay inventory — visual board lives above; Filter modal owns status. */
export function HubBayInventory({
  hubId,
  rows,
  slots,
}: {
  hubId: string
  rows: BatteryRecord[]
  slots: number
}) {
  const [peek, setPeek] = useState<BayRow | null>(null)
  const scope = `hub_${hubId}_batteries`
  const controls = useAdminModuleControls({
    scope,
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter bay inventory',
    showDateRange: false,
    includeDateRangeInFilter: false,
    includeNameSort: false,
    pageSize: 10,
    extraFilterFields: [
      {
        type: 'select',
        key: 'attention',
        label: 'Priority',
        placeholder: 'Any',
        options: [
          { value: 'attention', label: 'Needs attention' },
          { value: 'healthy', label: 'Healthy only' },
        ],
      },
    ],
  })

  const allBays = useMemo(() => buildBayRows(rows, slots), [rows, slots])

  const filtered = useMemo(() => {
    const q = controls.search.toLowerCase()
    const priority = controls.filterValues[scopeFilterKey(scope, 'attention')]
    return allBays.filter((r) => {
      if (!matchesStatusFilter(controls.filterValues, r.status)) return false
      if (priority === 'attention' && !isAttention(r)) return false
      if (priority === 'healthy' && isAttention(r)) return false
      if (!q) return true
      const serial = r.battery?.serial?.toLowerCase() ?? ''
      const type = r.battery?.type?.toLowerCase() ?? ''
      return serial.includes(q) || type.includes(q) || String(r.bay).includes(q)
    })
  }, [allBays, controls.search, controls.filterValues, scope])

  const { pageRows, pagination } = controls.paginate(filtered)

  return (
    <>
      <DynamicTableSection<BayRow>
        variant="embedded"
        headers={LIST_HEADERS}
        data={pageRows}
        pagination={pagination}
        getRowKey={(r) => `bay-${r.bay}`}
        toolbar={{
          title: 'Bay inventory',
          searchQuery: controls.searchQuery,
          onSearchChange: controls.setSearchQuery,
          searchPlaceholder: 'Search bay #, serial, or type…',
          showFilter: true,
          onFilter: controls.openFilter,
          showExport: true,
          onExport: () =>
            downloadCsv(
              `${hubId}-bays.csv`,
              ['bay', 'serial', 'type', 'status', 'charge', 'health'],
              filtered.map((r) => [
                r.bay,
                r.battery?.serial ?? '',
                r.battery?.type ?? '',
                r.status,
                r.battery?.chargePct ?? '',
                r.battery?.healthPct ?? '',
              ]),
            ),
        }}
        onRowClick={setPeek}
        emptyTitle="No bays match"
        emptyMessage="Try another filter or clear search."
        renderItems={(r) => [
          String(r.bay).padStart(2, '0'),
          r.battery?.serial ?? '—',
          r.battery?.type ?? '—',
          <TableStatusBadge
            key="s"
            label={r.status === 'AVAILABLE' ? 'Ready' : r.status.replace('_', ' ')}
            tone={batteryTone(r.status)}
          />,
          r.battery ? <ChargeBar key="c" pct={r.battery.chargePct} /> : '—',
          r.battery ? `${r.battery.healthPct}%` : '—',
        ]}
      />
      {controls.filterModal}

      <DetailsDrawer
        opened={!!peek}
        onClose={() => setPeek(null)}
        title={peek ? `Bay ${String(peek.bay).padStart(2, '0')}` : 'Bay'}
        rows={
          peek
            ? peek.battery
              ? [
                  { label: 'Serial', value: peek.battery.serial },
                  { label: 'Type', value: peek.battery.type },
                  {
                    label: 'Status',
                    value:
                      peek.status === 'AVAILABLE' ? 'Ready' : peek.status.replace('_', ' '),
                  },
                  { label: 'Charge', value: `${peek.battery.chargePct}%` },
                  { label: 'Health', value: `${peek.battery.healthPct}%` },
                  { label: 'Cycles', value: peek.battery.cycles },
                  { label: 'Last full charge', value: peek.battery.lastFullCharge },
                ]
              : [
                  { label: 'Status', value: 'Empty' },
                  { label: 'Pack', value: 'No battery docked' },
                ]
            : []
        }
        viewMore={
          peek?.battery?.id.startsWith('BAT-')
            ? { to: `/batteries/${peek.battery.id}`, label: 'View more' }
            : peek?.battery
              ? { to: '/batteries', label: 'View batteries' }
              : undefined
        }
      />
    </>
  )
}
