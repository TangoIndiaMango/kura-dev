import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Progress } from '@mantine/core'
import {
  AdminModuleLayout,
  AdminBarChart,
  ADMIN_CHART_COLORS,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
  LoadingState,
} from '@shared/components'
import { useUrlTab } from '@shared/hooks/useUrlTab'
import {
  useBatteries,
  batteryStatusLabel,
  type BatteryListApi,
} from '@features/batteries'
import { buildPagePagination } from '@shared/utils/cursor-pagination'
import { downloadCsv } from '@shared/utils/downloadCsv'
import {
  batteryTone,
  byTypeRows,
  degradationHistogram,
} from './healthPanelMetrics'

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

  const status = fleetControls.getFilter('status')

  const { batteries, isPending, count, totalPages, isPlaceholderData } =
    useBatteries(
      {
        search: fleetControls.search || undefined,
        status,
        page: fleetControls.page,
        page_size: fleetControls.pageSize,
      },
      { enabled: true },
    )

  const sohBand = fleetControls.getFilter('soh')
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
  const faulted = filtered.filter((b) => b.status === 'FAULTED').length
  const { pageRows: typePageRows, pagination: typePagination } =
    fleetControls.paginate(typeRows)

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
        overviewTitle="Watchlist"
        kpis={[
          {
            title: 'Below 60% SOH',
            value: below60,
            sub: 'On this page · open filter for band',
            tone: below60 > 0 ? 'danger' : 'success',
          },
          {
            title: 'Faulted',
            value: faulted,
            sub: 'Needs depot action',
            tone: faulted > 0 ? 'danger' : 'default',
          },
          {
            title: 'Avg SOH',
            value: `${avgSoh}%`,
            sub: `${count} matching inventory`,
            tone: avgSoh < 80 ? 'warning' : 'success',
          },
        ]}
        chartsSlot={
          <div className="rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
            <h3 className="mb-3 text-[13px] font-bold text-[var(--tx)]">
              SOH distribution (current page)
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
          <LoadingState cols={6} rows={8} />
        ) : tab === 'fleet' ? (
          <DynamicTableSection<BatteryListApi>
            variant="embedded"
            headers={FLEET_HEADERS}
            data={filtered}
            pagination={buildPagePagination({
              page: fleetControls.page,
              setPage: fleetControls.setPage,
              totalPages,
              isPlaceholderData,
              pageSize: fleetControls.pageSize,
            })}
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
            emptyTitle={sohBand ? 'No packs in this band' : 'No packs'}
            emptyMessage={
              sohBand
                ? 'Clear the health band filter or change page.'
                : 'Live inventory from GET /mobility/batteries/.'
            }
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
            data={typePageRows}
            pagination={typePagination}
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
