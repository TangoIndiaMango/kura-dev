import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Skeleton } from '@mantine/core'
import { PlusSignIcon } from 'hugeicons-react'
import {
  AdminModuleLayout,
  DynamicTableSection,
  useAdminModuleControls,
  type TableHeader,
  type TablePaginationConfig,
} from '@shared/components'
import { useCapabilities } from '../auth/useCapabilities'
import {
  useVehicleModelStats,
  useVehicleModelsList,
} from './hooks/use-vehicle-models'
import type { VehicleModelApi } from './types'

const HEADERS: TableHeader[] = [
  { key: 'make', label: 'MAKE' },
  { key: 'model', label: 'MODEL' },
  { key: 'type', label: 'TYPE' },
  { key: 'battery', label: 'BATTERY' },
  { key: 'service', label: 'SERVICE' },
]

const TYPE_OPTIONS = [
  { value: 'MOTORCYCLE', label: 'Motorcycle' },
  { value: 'TRICYCLE', label: 'Tricycle' },
  { value: 'BOAT', label: 'Boat' },
]

function serverPagination(
  page: number,
  totalPages: number,
  pageSize: number,
  setPage: (p: number) => void,
): TablePaginationConfig {
  return {
    page,
    totalPages: Math.max(1, totalPages),
    onPageChange: setPage,
    variant: 'controls',
    pageSize: String(pageSize).padStart(2, '0'),
  }
}

function serviceLabel(item: VehicleModelApi) {
  const parts = [
    item.service_interval_km != null
      ? `${item.service_interval_km.toLocaleString()} km`
      : null,
    item.service_interval_days != null
      ? `${item.service_interval_days} days`
      : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : '—'
}

function readTypeFilter(values: Record<string, unknown>): string | undefined {
  const raw =
    values.vehicle_type ??
    Object.entries(values).find(([k]) => k.endsWith('_vehicle_type'))?.[1]
  if (raw == null || raw === '' || raw === 'all') return undefined
  return String(raw)
}

export function VehicleModelsPanel() {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const controls = useAdminModuleControls({
    scope: 'vehicle_models',
    statusOptions: [],
    filterTitle: 'Filter vehicle models',
    includeNameSort: false,
    includeValueSort: false,
    showDateRange: false,
    includeDateRangeInFilter: false,
    extraFilterFields: [
      {
        type: 'select',
        key: 'vehicle_type',
        label: 'Vehicle type',
        placeholder: 'Any type',
        options: TYPE_OPTIONS,
      },
    ],
  })
  const vehicleTypeFilter = readTypeFilter(controls.filterValues)

  useEffect(() => {
    if (controls.page !== 1) controls.setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls.search, controls.filterValues])

  const { models, isPending, isError, count, totalPages, currentPage } =
    useVehicleModelsList(
      {
        search: controls.search || undefined,
        vehicle_type: vehicleTypeFilter,
        page: controls.page,
        page_size: controls.pageSize,
      },
      { enabled: can('vehicles:read') },
    )
  const { data: stats } = useVehicleModelStats({
    enabled: can('vehicles:read'),
  })
  const totals = stats?.totals

  let tableBody
  if (isError) {
    tableBody = (
      <p className="mb-4 text-[13px] text-[var(--mu)]">
        Could not load models (need vehicles:read).
      </p>
    )
  } else if (isPending) {
    tableBody = <Skeleton height={280} radius="md" />
  } else {
    tableBody = (
      <DynamicTableSection<VehicleModelApi>
        variant="embedded"
        headers={HEADERS}
        data={models}
        pagination={serverPagination(
          currentPage,
          totalPages,
          controls.pageSize,
          controls.setPage,
        )}
        getRowKey={(item) => item.id}
        getRowHref={(item) => `/vehicles/models/${item.id}/edit`}
        emptyTitle="No vehicle models"
        emptyMessage="Add a catalogue model to use when registering fleet vehicles."
        toolbar={{
          title: `Catalogue · ${count}`,
          searchQuery: controls.searchQuery,
          onSearchChange: controls.setSearchQuery,
          searchPlaceholder: 'Search make or model…',
          onFilter: controls.openFilter,
          showFilter: true,
          actions: can('vehicles:manage') ? (
            <Button
              leftSection={<PlusSignIcon size={16} />}
              className="bg-[var(--pr)] hover:opacity-90"
              onClick={() => navigate('/vehicles/models/new')}
            >
              Add model
            </Button>
          ) : undefined,
        }}
        renderItems={(item) => [
          <span key="make" className="text-xs font-semibold text-[var(--tx)]">
            {item.make}
          </span>,
          <span key="model" className="text-xs text-[var(--tx)]">
            {item.model}
          </span>,
          <span key="type" className="text-xs text-[var(--mu)]">
            {item.vehicle_type}
          </span>,
          <span key="battery" className="text-xs text-[var(--mu)]">
            {item.battery_type_name || '—'}
          </span>,
          <span key="service" className="text-xs text-[var(--mu)]">
            {serviceLabel(item)}
          </span>,
        ]}
      />
    )
  }

  return (
    <>
      <AdminModuleLayout
        title="Vehicle models"
        subtitle="Catalogue of make / model / type and compatible battery"
        kpis={[
          {
            title: 'Catalogue',
            value: totals?.all ?? '—',
            sub: 'Models',
          },
          {
            title: 'Motorcycle',
            value: totals?.motorcycle ?? '—',
            sub: 'Bike',
          },
          {
            title: 'Tricycle',
            value: totals?.tricycle ?? '—',
            sub: 'Keke',
          },
          {
            title: 'Boat',
            value: totals?.boat ?? '—',
            sub: 'Marine',
          },
        ]}
      >
        {tableBody}
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
