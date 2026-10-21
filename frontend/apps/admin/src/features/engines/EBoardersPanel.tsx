import { } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildPagePagination } from '@shared/utils/cursor-pagination'
import { Button } from '@mantine/core'
import { PlusSignIcon } from 'hugeicons-react'
import {
  AdminModuleLayout,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
  LoadingState,
} from '@shared/components'
import { useCapabilities } from '../auth/useCapabilities'
import { useEBoarderStats, useEBoarders } from './hooks/use-eboarders'
import type { EBoarderListApi } from './types'

const HEADERS: TableHeader[] = [
  { key: 'serial', label: 'SERIAL' },
  { key: 'unit', label: 'UNIT' },
  { key: 'power', label: 'POWER' },
  { key: 'battery', label: 'BATTERY' },
  { key: 'hub', label: 'HUB' },
  { key: 'vehicle', label: 'VEHICLE' },
  { key: 'status', label: 'STATUS' },
]

const STATUS_OPTIONS = [
  { value: 'IN_STOCK', label: 'In stock' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'RETIRED', label: 'Retired' },
]

function tone(
  status: string,
): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (status === 'IN_STOCK') return 'success'
  if (status === 'ISSUED') return 'info'
  if (status === 'MAINTENANCE') return 'warning'
  if (status === 'RETIRED') return 'neutral'
  return 'info'
}


export function EBoardersPanel() {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const controls = useAdminModuleControls({
    scope: 'eboarders',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter e-boarders',
  })


  const statusFilter =
    controls.getFilter('status')

  const { rows, isPending, isError, count, totalPages, isPlaceholderData } =
    useEBoarders(
      {
        page: controls.page,
        page_size: controls.pageSize,
        search: controls.search || undefined,
        status: statusFilter,
      },
      { enabled: can('engines:manage') },
    )
  const { stats } = useEBoarderStats({ enabled: can('engines:manage') })

  if (!can('engines:manage')) {
    return (
      <AdminModuleLayout
        title="E-boarders"
        subtitle="You need engines:manage to view electric outboard stock."
        kpis={[]}
      >
        <p className="text-sm text-[var(--mu)]">Permission required.</p>
      </AdminModuleLayout>
    )
  }

  return (
    <>
      <AdminModuleLayout
        title="E-boarders"
        subtitle="Stock of electric outboards — pick one when installing on a hull"
        dateRangeSlot={controls.dateRangeSlot}
        kpis={[
          {
            title: 'In stock',
            value: String(stats?.totals.in_stock ?? '—'),
            sub: 'Ready to issue',
            tone: 'success',
          },
          {
            title: 'Issued',
            value: String(stats?.totals.issued ?? '—'),
            sub: 'On vehicles',
          },
          {
            title: 'Maintenance',
            value: String(stats?.totals.maintenance ?? '—'),
            tone: (stats?.totals.maintenance ?? 0) > 0 ? 'warning' : 'default',
          },
          {
            title: 'Fleet',
            value: String(stats?.totals.all ?? '—'),
            sub: 'All units',
          },
        ]}
      >
        {isError ? (
          <p className="text-sm text-[var(--danger,#b42318)]">
            Could not load e-boarders.
          </p>
        ) : isPending ? (
          <LoadingState cols={6} rows={8} />
        ) : (
          <DynamicTableSection<EBoarderListApi>
            variant="embedded"
            headers={HEADERS}
            data={rows}
            pagination={buildPagePagination({
              page: controls.page,
              setPage: controls.setPage,
              totalPages,
              isPlaceholderData,
              pageSize: controls.pageSize,
            })}
            getRowKey={(item) => item.id}
            toolbar={{
              title: `E-boarders · ${count}`,
              searchQuery: controls.searchQuery,
              onSearchChange: controls.setSearchQuery,
              searchPlaceholder: 'Search serial, make, model…',
              onFilter: controls.openFilter,
              showFilter: true,
              actions: (
                <Button
                  leftSection={<PlusSignIcon size={16} />}
                  className="bg-[var(--pr)] hover:opacity-90"
                  onClick={() => navigate('/engines/eboarders/new')}
                >
                  Add e-boarder
                </Button>
              ),
            }}
            onRowClick={(item) =>
              navigate(`/engines/eboarders/${item.id}/edit`)
            }
            renderItems={(item) => [
              <span
                key="serial"
                className="font-mono text-xs font-bold text-[var(--pr)]"
              >
                {item.serial}
              </span>,
              <span key="unit" className="text-xs text-[var(--tx)]">
                {item.make} {item.model}
              </span>,
              <span key="power" className="text-xs text-[var(--mu)]">
                {item.rated_kw} kW
                {item.petrol_hp_equivalent
                  ? ` · ≈${item.petrol_hp_equivalent} HP`
                  : ''}
              </span>,
              <span key="bat" className="text-xs text-[var(--mu)]">
                {item.battery_type_name}
              </span>,
              <span key="hub" className="text-xs text-[var(--mu)]">
                {item.current_hub_code ?? '—'}
              </span>,
              <span key="veh" className="text-xs text-[var(--mu)]">
                {item.vehicle_reg ?? '—'}
              </span>,
              <TableStatusBadge
                key="st"
                label={item.status.replace(/_/g, ' ')}
                tone={tone(item.status)}
              />,
            ]}
          />
        )}
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
