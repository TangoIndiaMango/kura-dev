import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Progress, Skeleton } from '@mantine/core'
import {
  AdminModuleLayout,
  AdminBarChart,
  ADMIN_CHART_COLORS,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
} from '@shared/components'
import { useUrlTab } from '@shared/hooks/useUrlTab'
import {
  useBatteries,
  batteryStatusLabel,
  type BatteryListApi,
} from '@features/batteries'
import { downloadCsv } from '@shared/utils/downloadCsv'

const FLEET_HEADERS: TableHeader[] = [
  { key: 'serial', label: 'SERIAL' },
  { key: 'type', label: 'MODEL' },
  { key: 'location', label: 'LOCATION' },
  { key: 'health', label: 'SOH' },
  { key: 'cycles', label: 'CYCLES' },
  { key: 'status', label: 'STATUS' },
]

const TYPE_HEADERS: TableHeader[] = [
  { key: 'model', label: 'MODEL' },
  { key: 'count', label: 'IN FLEET' },
  { key: 'avgSoh', label: 'AVG SOH' },
  { key: 'below60', label: 'BELOW 60%' },
]

const STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'CHARGING', label: 'Charging' },
  { value: 'ISSUED', label: 'In field' },
  { value: 'FAULTED', label: 'Faulted' },
  { value: 'RETIRED', label: 'Retired' },
]

function degradationHistogram(batteries: BatteryListApi[]) {
  const buckets = [
    { label: '95–100%', min: 95, max: 101, count: 0 },
    { label: '90–94%', min: 90, max: 95, count: 0 },
    { label: '80–89%', min: 80, max: 90, count: 0 },
    { label: '70–79%', min: 70, max: 80, count: 0 },
    { label: '<60%', min: 0, max: 60, count: 0 },
  ]
  for (const b of batteries) {
    const bucket = buckets.find(
      (x) => b.health_pct >= x.min && b.health_pct < x.max,
    )
    if (bucket) bucket.count += 1
  }
  return buckets.map(({ label, count }) => ({ label, count }))
}

function byTypeRows(batteries: BatteryListApi[]) {
  const map = new Map<
    string,
    { model: string; count: number; sohSum: number; below60: number }
  >()
  for (const b of batteries) {
    const model = b.battery_type_name || 'Unknown'
    const row = map.get(model) ?? {
      model,
      count: 0,
      sohSum: 0,
      below60: 0,
    }
    row.count += 1
    row.sohSum += b.health_pct
    if (b.health_pct < 60) row.below60 += 1
    map.set(model, row)
  }
  return [...map.values()].map((r, i) => ({
    id: `t-${i}`,
    model: r.model,
    count: r.count,
    avgSoh: `${Math.round(r.sohSum / r.count)}%`,
    below60: r.below60,
  }))
}

function batteryTone(status: string) {
  if (status === 'AVAILABLE') return 'success' as const
  if (status === 'CHARGING') return 'info' as const
  if (status === 'ISSUED') return 'neutral' as const
  if (status === 'FAULTED' || status === 'RETIRED' || status === 'LOST')
    return 'danger' as const
  return 'warning' as const
}

export function HealthPanel() {
  const navigate = useNavigate()
  const [tab, setTab] = useUrlTab('fleet', { valid: ['fleet', 'type'] })
  const fleetControls = useAdminModuleControls({
    scope: 'health',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter battery fleet',
    includeNameSort: false,
    extraFilterFields: [
      {
        type: 'select',
        key: 'soh',
        label: 'Health band',
        placeholder: 'Any',
        options: [
          { value: 'healthy', label: '60% and above' },
          { value: 'watchlist', label: 'Below 60%' },
        ],
      },
    ],
  })

  const statusRaw = fleetControls.filterValues.status
  const status =
    statusRaw && statusRaw !== 'all' ? String(statusRaw) : undefined

  const { batteries, isPending, count, currentPage, totalPages } = useBatteries(
    {
      search: fleetControls.search || undefined,
      status,
      page: fleetControls.page,
      page_size: 50,
    },
    { enabled: true },
  )

  const sohBand = fleetControls.filterValues.soh
  const filtered = useMemo(() => {
    if (sohBand === 'watchlist') return batteries.filter((b) => b.health_pct < 60)
    if (sohBand === 'healthy') return batteries.filter((b) => b.health_pct >= 60)
    return batteries
  }, [batteries, sohBand])

  const typeRows = useMemo(() => {
    const q = fleetControls.search.toLowerCase()
    return byTypeRows(batteries).filter((r) =>
      r.model.toLowerCase().includes(q),
    )
  }, [batteries, fleetControls.search])

  const histogram = useMemo(() => degradationHistogram(filtered), [filtered])
  const avgSoh =
    filtered.length === 0
      ? 0
      : Math.round(
          filtered.reduce((s, b) => s + b.health_pct, 0) / filtered.length,
        )
  const below60 = filtered.filter((b) => b.health_pct < 60).length
  const avgCycles =
    filtered.length === 0
      ? 0
      : Math.round(
          filtered.reduce((s, b) => s + b.cycle_count, 0) / filtered.length,
        )

  const { pageRows, pagination } = fleetControls.paginate(filtered)

  return (
    <>
      <AdminModuleLayout
        title="Battery health"
        subtitle="Fleet SOH from live battery inventory"
        tabs={[
          { id: 'fleet', label: 'Fleet' },
          { id: 'type', label: 'By type' },
        ]}
        activeTab={tab}
        onTabChange={setTab}
        kpis={[
          {
            title: 'Avg SOH',
            value: `${avgSoh}%`,
            sub: 'Loaded page',
            tone: avgSoh < 80 ? 'warning' : 'success',
          },
          {
            title: 'Below 60%',
            value: below60,
            sub: 'Watchlist on page',
            tone: below60 > 0 ? 'danger' : 'default',
          },
          { title: 'Avg cycles', value: avgCycles, sub: 'Loaded page' },
          {
            title: 'In view',
            value: filtered.length,
            sub: `${count} total matching`,
          },
        ]}
        chartsSlot={
          <div className="rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
            <h3 className="mb-3 text-[13px] font-bold text-[var(--tx)]">
              SOH distribution (loaded page)
            </h3>
            <AdminBarChart
              data={histogram}
              series={[
                {
                  dataKey: 'count',
                  name: 'Packs',
                  color: ADMIN_CHART_COLORS.teal,
                },
              ]}
              height={220}
            />
          </div>
        }
      >
        {isPending ? (
          <Skeleton height={220} radius="md" />
        ) : tab === 'fleet' ? (
          <DynamicTableSection<BatteryListApi>
            variant="embedded"
            headers={FLEET_HEADERS}
            data={pageRows}
            pagination={{
              ...pagination,
              page: currentPage,
              totalPages,
              onPageChange: fleetControls.setPage,
            }}
            getRowKey={(b) => b.id}
            toolbar={{
              title: 'Fleet health',
              searchQuery: fleetControls.searchQuery,
              onSearchChange: fleetControls.setSearchQuery,
              searchPlaceholder: 'Search serial…',
              onFilter: fleetControls.openFilter,
              showFilter: true,
              onExport: () =>
                downloadCsv(
                  'battery-health.csv',
                  ['serial', 'type', 'hub', 'soh', 'cycles', 'status'],
                  filtered.map((b) => [
                    b.serial,
                    b.battery_type_name,
                    b.hub_code ?? b.hub_name ?? '',
                    b.health_pct,
                    b.cycle_count,
                    b.status,
                  ]),
                ),
            }}
            onRowClick={(b) => navigate(`/health/${b.id}`)}
            getRowHref={(b) => `/health/${b.id}`}
            emptyTitle="No packs"
            emptyMessage="Live inventory from GET /mobility/batteries/."
            renderItems={(b) => [
              <span key="s" className="font-mono text-xs font-bold text-[var(--pr)]">
                {b.serial}
              </span>,
              <span key="t" className="text-xs text-[var(--mu)]">
                {b.battery_type_name}
              </span>,
              <span key="l" className="text-xs text-[var(--mu)]">
                {b.hub_code ?? b.hub_name ?? '—'}
              </span>,
              <div key="h" className="pointer-events-none flex min-w-[7rem] items-center gap-2">
                <Progress
                  value={b.health_pct}
                  size="sm"
                  className="flex-1"
                  color={b.health_pct < 60 ? 'red' : 'teal'}
                />
                <span className="text-xs font-semibold">{b.health_pct}%</span>
              </div>,
              <span key="c" className="text-xs tabular-nums">
                {b.cycle_count}
              </span>,
              <TableStatusBadge
                key="st"
                label={batteryStatusLabel(b.status)}
                tone={batteryTone(b.status)}
              />,
            ]}
          />
        ) : (
          <DynamicTableSection<(typeof typeRows)[number]>
            variant="embedded"
            headers={TYPE_HEADERS}
            data={typeRows}
            getRowKey={(r) => r.id}
            toolbar={{ title: 'By battery type', showFilter: false }}
            emptyTitle="No types"
            emptyMessage="Aggregated from the loaded battery page."
            renderItems={(r) => [
              r.model,
              r.count,
              r.avgSoh,
              <span
                key="b"
                className={r.below60 > 0 ? 'font-bold text-[#C0392B]' : ''}
              >
                {r.below60}
              </span>,
            ]}
          />
        )}
      </AdminModuleLayout>
      {fleetControls.filterModal}
    </>
  )
}
