import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { PlusSignIcon } from 'hugeicons-react'
import {
  AdminModuleLayout,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableExportFormat,
  type TableHeader,
  LoadingState,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import { downloadExportFromApi } from '@shared/utils/downloadCsvFromApi'
import { buildPagePagination } from '@shared/utils/cursor-pagination'
import { useCapabilities } from '@features/auth'
import {
  HUBS_ENDPOINTS,
  useHubs,
  useHubStats,
} from './hooks/use-hubs'
import type { HubListApi, HubStatus } from './types'
import { HubNetworkCharts } from './HubNetworkCharts'

const HUB_HEADERS: TableHeader[] = [
  { key: 'id', label: 'HUB ID' },
  { key: 'name', label: 'STATION NAME' },
  { key: 'location', label: 'ADDRESS / JURISDICTION' },
  { key: 'slots', label: 'SLOTS' },
  { key: 'ready', label: 'READY' },
  { key: 'solar', label: 'SOLAR' },
  { key: 'status', label: 'STATUS' },
]

const STATUS_OPTIONS = [
  { value: 'ONLINE', label: 'Online' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'OFFLINE', label: 'Offline' },
  { value: 'CLOSED', label: 'Closed' },
]

function statusTone(status: HubStatus) {
  if (status === 'ONLINE') return 'success' as const
  if (status === 'MAINTENANCE') return 'warning' as const
  return 'danger' as const
}


export function HubsPanel() {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const [exporting, setExporting] = useState(false)
  const controls = useAdminModuleControls({
    scope: 'hubs',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter hubs',
    showDateRange: false,
    includeDateRangeInFilter: false,
  })


  const statusFilter =
    controls.getFilter('status')

  const listFilters = {
    ...(controls.search ? { search: controls.search } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  }

  const { hubs, isPending, isError, totalPages, isPlaceholderData } = useHubs({
    search: controls.search || undefined,
    status: statusFilter,
    page: controls.page,
    page_size: controls.pageSize,
  })

  const { data: stats } = useHubStats()

  const readyByHub = useMemo(
    () =>
      (stats?.by_hub_ready ?? []).map((row) => ({
        label: row.code.replace(/^HUB-/, ''),
        ready: row.ready,
      })),
    [stats],
  )
  const handleExport = async (format: TableExportFormat) => {
    setExporting(true)
    try {
      await downloadExportFromApi(HUBS_ENDPOINTS.export, `hubs.${format}`, {
        ...listFilters,
        export: format,
      })
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Export failed'),
      })
    } finally {
      setExporting(false)
    }
  }

  const totals = stats?.totals

  return (
    <>
      <AdminModuleLayout
        title="Hubs & Swapping Stations"
        subtitle="Automated swapping infrastructure, bay telemetry, and battery inventory"
        dateRangeSlot={controls.dateRangeSlot}
        kpis={[
          {
            title: 'All hubs',
            value: totals?.all ?? '—',
            sub: 'Network-wide',
          },
          {
            title: 'Online',
            value: totals?.online ?? '—',
            tone: 'success',
            sub: 'Accepting swaps',
          },
          {
            title: 'Offline',
            value: totals?.offline ?? '—',
            tone: 'danger',
            sub: 'No cloud sync',
          },
          {
            title: 'Maintenance',
            value: totals?.maintenance ?? '—',
            tone: 'warning',
            sub: 'Hidden from map',
          },
        ]}
        chartsSlot={<HubNetworkCharts readyByHub={readyByHub} />}
      >
        {isPending ? (
          <LoadingState cols={6} rows={8} />
        ) : isError ? (
          <p className="mb-4 text-[13px] text-[var(--mu)]">
            Could not load hubs (need hubs:read).
          </p>
        ) : (
          <DynamicTableSection<HubListApi>
            variant="embedded"
            headers={HUB_HEADERS}
            data={hubs}
            pagination={buildPagePagination({
              page: controls.page,
              setPage: controls.setPage,
              totalPages,
              isPlaceholderData,
              pageSize: controls.pageSize,
            })}
            getRowKey={(item) => item.id}
            toolbar={{
              title: 'All Hubs',
              searchQuery: controls.searchQuery,
              onSearchChange: controls.setSearchQuery,
              searchPlaceholder: 'Search stations by name, ID, or address…',
              onFilter: controls.openFilter,
              showFilter: true,
              showExport: true,
              onExportFormat: handleExport,
              isExporting: exporting,
              actions: can('hubs:manage') ? (
                <Button
                  leftSection={<PlusSignIcon size={16} />}
                  className="bg-[var(--pr)] hover:opacity-90"
                  onClick={() => navigate('/hubs/new')}
                >
                  Add New Hub
                </Button>
              ) : undefined,
            }}
            getRowHref={(item) => `/hubs/${item.id}`}
            emptyTitle="No hubs"
            emptyMessage="No stations match the current filters."
            renderItems={(item) => [
              <span
                key="id"
                className="font-mono text-xs font-bold text-[var(--pr)]"
              >
                {item.code}
              </span>,
              <div key="name" className="flex flex-col">
                <span className="whitespace-nowrap text-xs font-bold text-[var(--tx)]">
                  {item.name}
                </span>
                <span className="whitespace-nowrap text-[10px] text-[var(--mu)]">
                  {item.charging_count} charging · {item.empty_count} empty
                </span>
              </div>,
              <span
                key="loc"
                className="whitespace-nowrap text-xs text-[var(--mu)]"
              >
                {item.address}
              </span>,
              <span key="slots" className="text-xs font-semibold text-[var(--tx)]">
                {item.slot_count}
              </span>,
              <span key="ready" className="text-xs font-extrabold text-[#1E8E4E]">
                {item.ready_count}
              </span>,
              <span key="solar" className="text-xs font-semibold text-[var(--pr)]">
                {Number(item.solar_capacity_kw).toFixed(1)} kW
              </span>,
              <TableStatusBadge
                key="status"
                label={item.status}
                tone={statusTone(item.status)}
              />,
            ]}
          />
        )}
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
