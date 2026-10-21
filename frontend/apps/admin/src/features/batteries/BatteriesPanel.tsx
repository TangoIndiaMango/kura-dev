import {
  AdminModuleLayout,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableExportFormat,
  LoadingState,
} from '@shared/components'
import { AdminDonutChart, ADMIN_CHART_COLORS } from '@shared/components/charts'
import { Button, Progress } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { PlusSignIcon } from 'hugeicons-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiErrorMessage } from '@lib/api/auth'
import { downloadExportFromApi } from '@shared/utils/downloadCsvFromApi'
import { buildPagePagination } from '@shared/utils/cursor-pagination'
import { useCapabilities } from '../auth/useCapabilities'
import {
  BATTERY_HEADERS,
  STATUS_OPTIONS,
  batteryTone,
  fleetDonutFromStats,
} from './batteriesPanelModel'
import {
  BATTERIES_ENDPOINTS,
  useBatteries,
  useBatteryStats,
} from './hooks/use-batteries'
import {
  batteryLocationLabel,
  batteryStatusLabel,
  type BatteryListApi,
} from './types'

export function BatteriesPanel() {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const [exporting, setExporting] = useState(false)

  const controls = useAdminModuleControls({
    scope: 'batteries',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter batteries',
    showDateRange: false,
    includeDateRangeInFilter: false,
  })

  const statusFilter = controls.getFilter('status')

  const listFilters = {
    ...(controls.search ? { search: controls.search } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  }

  const { batteries, isPending, isError, isPlaceholderData, totalPages } =
    useBatteries(
      {
        search: controls.search || undefined,
        status: statusFilter,
        page: controls.page,
        page_size: controls.pageSize,
      },
      { enabled: can('batteries:read') },
    )

  const pagination = buildPagePagination({
    page: controls.page,
    setPage: controls.setPage,
    totalPages,
    isPlaceholderData,
    pageSize: controls.pageSize,
  })

  const { data: stats } = useBatteryStats({ enabled: can('batteries:read') })
  const totals = stats?.totals
  const fleetDonut = fleetDonutFromStats(totals)

  const handleExport = async (format: TableExportFormat) => {
    setExporting(true)
    try {
      await downloadExportFromApi(
        BATTERIES_ENDPOINTS.export,
        `batteries.${format}`,
        { ...listFilters, export: format },
      )
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Export failed'),
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <AdminModuleLayout
        title="Battery inventory"
        subtitle="Battery fleet — inventory, assignments, and health. Models live under Battery models."
        dateRangeSlot={controls.dateRangeSlot}
        kpis={[
          { title: 'Total', value: totals?.all ?? '—', sub: 'Tracked units' },
          {
            title: 'Ready',
            value: totals?.available ?? '—',
            tone: 'success',
            sub: 'Available in bay',
          },
          {
            title: 'Charging',
            value: totals?.charging ?? '—',
            tone: 'default',
            sub: 'In charger',
          },
          { title: 'In field', value: totals?.issued ?? '—', sub: 'On vehicles' },
          {
            title: 'Faulty',
            value: totals?.faulted ?? '—',
            tone: 'danger',
            sub: 'Needs inspection',
          },
        ]}
        chartsSlot={
          <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
            <h3 className="mb-2 text-[13px] font-bold text-[var(--tx)]">
              Fleet mix
            </h3>
            <AdminDonutChart
              data={
                fleetDonut.some((d) => d.value > 0)
                  ? fleetDonut
                  : [
                      {
                        name: 'No packs',
                        value: 1,
                        color: ADMIN_CHART_COLORS.teal,
                      },
                    ]
              }
              height={200}
              centerValue={totals?.all ?? 0}
              centerLabel="Packs"
            />
          </div>
        }
      >
        {isPending ? (
          <LoadingState cols={6} rows={8} />
        ) : isError ? (
          <p className="mb-4 text-[13px] text-[var(--mu)]">
            Could not load batteries (need batteries:read).
          </p>
        ) : (
          <DynamicTableSection<BatteryListApi>
            variant="embedded"
            headers={BATTERY_HEADERS}
            data={batteries}
            pagination={pagination}
            getRowKey={(item) => item.id}
            toolbar={{
              title: 'All packs',
              searchQuery: controls.searchQuery,
              onSearchChange: controls.setSearchQuery,
              searchPlaceholder: 'Search serial, model, or hub…',
              onFilter: controls.openFilter,
              showFilter: true,
              showExport: true,
              onExportFormat: handleExport,
              isExporting: exporting,
              actions: can('batteries:manage') ? (
                <Button
                  leftSection={<PlusSignIcon size={16} />}
                  className="bg-[var(--pr)] hover:opacity-90"
                  onClick={() => navigate('/batteries/new')}
                >
                  Add battery
                </Button>
              ) : undefined,
            }}
            getRowHref={(item) => `/batteries/${item.id}`}
            emptyTitle="No batteries"
            emptyMessage="No packs match the current filters."
            renderItems={(item) => [
              <span
                key="serial"
                className="font-mono text-xs font-bold text-[var(--pr)]"
              >
                {item.serial}
              </span>,
              <span key="type" className="text-xs text-[var(--tx)]">
                {item.battery_type_name}
              </span>,
              <span key="loc" className="text-xs text-[var(--mu)]">
                {batteryLocationLabel(item)}
              </span>,
              <div key="charge" className="pointer-events-none w-[7.5rem]">
                <Progress
                  value={item.charge_pct}
                  size="sm"
                  radius="xl"
                  color={item.charge_pct >= 80 ? 'teal' : 'orange'}
                />
                <span className="text-[10px] text-[var(--mu)]">
                  {item.charge_pct}%
                </span>
              </div>,
              <span key="health" className="text-xs font-semibold text-[var(--tx)]">
                {item.health_pct}%
              </span>,
              <span key="cycles" className="text-xs text-[var(--tx)]">
                {item.cycle_count}
              </span>,
              <TableStatusBadge
                key="status"
                label={batteryStatusLabel(item.status)}
                tone={batteryTone(item.status)}
              />,
            ]}
          />
        )}
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
