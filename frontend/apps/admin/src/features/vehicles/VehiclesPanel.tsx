import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { PlusSignIcon } from 'hugeicons-react'
import {
  AdminModuleLayout,
  DynamicTableSection,
  LoadingState,
  TableStatusBadge,
  useAdminModuleControls,
  type TableExportFormat,
  type TableHeader,
} from '@shared/components'
import { AdminDonutChart, ADMIN_CHART_COLORS } from '@shared/components/charts'
import { apiErrorMessage } from '@lib/api/auth'
import { downloadExportFromApi } from '@shared/utils/downloadCsvFromApi'
import { buildPagePagination } from '@shared/utils/cursor-pagination'
import { useCapabilities } from '../auth/useCapabilities'
import {
  VEHICLES_ENDPOINTS,
  useVehicleStats,
  useVehicles,
} from './hooks/use-vehicles'
import { vehicleStatusLabel, type VehicleListApi } from './types'

const DONUT_COLORS = Object.values(ADMIN_CHART_COLORS)

const HEADERS: TableHeader[] = [
  { key: 'reg', label: 'REGISTRATION' },
  { key: 'type', label: 'TYPE' },
  { key: 'model', label: 'MAKE / MODEL' },
  { key: 'battery', label: 'BATTERY TYPE' },
  { key: 'owner', label: 'OWNER' },
  { key: 'status', label: 'STATUS' },
]

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SUSPENDED', label: 'Suspended' },
]

function statusTone(status: string) {
  if (status === 'ACTIVE') return 'success' as const
  if (status === 'PENDING') return 'warning' as const
  return 'danger' as const
}


export function VehiclesPanel() {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const [exporting, setExporting] = useState(false)
  const controls = useAdminModuleControls({
    scope: 'vehicles',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter vehicles',
    showDateRange: false,
    includeDateRangeInFilter: false,
  })


  const statusFilter = controls.getFilter('status')

  const listFilters = {
    ...(controls.search ? { search: controls.search } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  }

  const { vehicles, isPending, isFetching, isError, totalPages, isPlaceholderData } =
    useVehicles({
      search: controls.search || undefined,
      status: statusFilter,
      page: controls.page,
      page_size: controls.pageSize,
    })

  const { data: stats } = useVehicleStats()
  const totals = stats?.totals

  const fleetDonut = useMemo(() => {
    const rows = stats?.by_type ?? []
    return rows.map((row, i) => ({
      name: row.vehicle_type || 'Unknown',
      value: row.count,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }))
  }, [stats?.by_type])

  const handleExport = async (format: TableExportFormat) => {
    setExporting(true)
    try {
      await downloadExportFromApi(
        VEHICLES_ENDPOINTS.export,
        `vehicles.${format}`,
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
        title="Vehicles"
        subtitle="Registered fleet — plates, owners, and pack linkage"
        dateRangeSlot={controls.dateRangeSlot}
        kpis={[
          { title: 'All vehicles', value: totals?.all ?? '—', sub: 'Registered' },
          {
            title: 'Active',
            value: totals?.active ?? '—',
            tone: 'success',
            sub: 'On road',
          },
          {
            title: 'Pending',
            value: totals?.pending ?? '—',
            tone: 'warning',
            sub: 'Inspection',
          },
          {
            title: 'Suspended',
            value: totals?.suspended ?? '—',
            tone: 'danger',
            sub: 'Blocked',
          },
        ]}
        chartsSlot={
          <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
            <h3 className="mb-2 text-[13px] font-bold text-[var(--tx)]">
              Fleet by type
            </h3>
            <AdminDonutChart
              data={
                fleetDonut.some((d) => d.value > 0)
                  ? fleetDonut
                  : [
                      {
                        name: 'No vehicles',
                        value: 1,
                        color: ADMIN_CHART_COLORS.teal,
                      },
                    ]
              }
              height={200}
              centerValue={totals?.all ?? 0}
              centerLabel="Fleet"
            />
          </div>
        }
      >
        {isPending ? (
          <LoadingState cols={6} rows={8} />
        ) : isError ? (
          <p className="mb-4 text-[13px] text-[var(--mu)]">
            Could not load vehicles (need vehicles:read).
          </p>
        ) : (
          <div className={isFetching ? 'opacity-70 transition-opacity' : undefined}>
          <DynamicTableSection<VehicleListApi>
            variant="embedded"
            headers={HEADERS}
            data={vehicles}
            pagination={buildPagePagination({
              page: controls.page,
              setPage: controls.setPage,
              totalPages,
              isPlaceholderData,
              pageSize: controls.pageSize,
            })}
            getRowKey={(item) => item.id}
            toolbar={{
              title: 'Fleet register',
              searchQuery: controls.searchQuery,
              onSearchChange: controls.setSearchQuery,
              searchPlaceholder: 'Search plate, make, model, or owner…',
              onFilter: controls.openFilter,
              showFilter: true,
              showExport: can('vehicles:read'),
              onExportFormat: handleExport,
              isExporting: exporting,
              actions: can('vehicles:manage') ? (
                <Button
                  leftSection={<PlusSignIcon size={16} />}
                  className="bg-[var(--pr)] hover:opacity-90"
                  onClick={() => navigate('/vehicles/new')}
                >
                  Add vehicle
                </Button>
              ) : undefined,
            }}
            getRowHref={(item) => `/vehicles/${item.id}`}
            emptyTitle="No vehicles"
            emptyMessage="No vehicles match the current filters."
            renderItems={(item) => [
              <span
                key="reg"
                className="font-mono text-xs font-bold text-[var(--pr)]"
              >
                {item.registration_plate}
              </span>,
              <span key="type" className="text-xs text-[var(--tx)]">
                {item.vehicle_type}
              </span>,
              <span key="model" className="text-xs font-semibold text-[var(--tx)]">
                {item.make} {item.model_name}
              </span>,
              <span key="battery" className="text-xs text-[var(--mu)]">
                {item.battery_type_name || '—'}
              </span>,
              <span key="owner" className="text-xs text-[var(--tx)]">
                {item.owner_name || item.owner_kura_id || '—'}
              </span>,
              <TableStatusBadge
                key="status"
                label={vehicleStatusLabel(item.status)}
                tone={statusTone(item.status)}
              />,
            ]}
          />
          </div>
        )}
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
