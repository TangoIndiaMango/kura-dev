import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildPagePagination } from '@shared/utils/cursor-pagination'
import { Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { PlusSignIcon } from 'hugeicons-react'
import {
  AdminConfirmModal,
  AdminModuleLayout,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
  LoadingState,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import { useCapabilities } from '../auth/useCapabilities'
import {
  useActivateBatteryType,
  useBatteryTypesList,
} from './hooks/use-battery-types'
import type { BatteryTypeApi } from './types'

const HEADERS: TableHeader[] = [
  { key: 'name', label: 'NAME' },
  { key: 'mfr', label: 'MANUFACTURER' },
  { key: 'spec', label: 'SPEC' },
  { key: 'vehicle', label: 'VEHICLE' },
  { key: 'qr', label: 'QR' },
  { key: 'status', label: 'STATUS' },
]

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DEACTIVATED', label: 'Deactivated' },
]

function tone(
  status: string | undefined,
): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (status === 'ACTIVE') return 'success'
  if (status === 'PENDING') return 'warning'
  if (status === 'DEACTIVATED') return 'neutral'
  return 'info'
}


export function BatteryTypesPanel() {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const [activateId, setActivateId] = useState<string | null>(null)
  const activateMut = useActivateBatteryType(activateId ?? '')

  const controls = useAdminModuleControls({
    scope: 'battery_types',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter battery types',
    showDateRange: false,
    includeDateRangeInFilter: false,
  })


  const statusFilter = controls.getFilter('status')

  const { rows, isPending, isError, count, totalPages, isPlaceholderData, refetch } =
    useBatteryTypesList(
      {
        page: controls.page,
        page_size: controls.pageSize,
        search: controls.search || undefined,
        status: statusFilter,
      },
      { enabled: can('batteries:read') },
    )

  const pendingCount = rows.filter((r) => r.status === 'PENDING').length

  const confirmActivate = async () => {
    if (!activateId) return
    try {
      await activateMut.mutateAsync({})
      notifications.show({ color: 'teal', message: 'Battery type activated.' })
      setActivateId(null)
      refetch()
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not activate'),
      })
    }
  }

  return (
    <>
      <AdminModuleLayout
        title="Battery models"
        subtitle="Catalogue of pack models — create model, then admin activates"
        dateRangeSlot={controls.dateRangeSlot}
        kpis={[
          { title: 'Models', value: String(count), sub: 'In catalogue' },
          {
            title: 'Pending',
            value: isPending ? '—' : String(pendingCount),
            sub: 'Awaiting approval',
            tone: pendingCount > 0 ? 'warning' : 'default',
          },
        ]}
      >
        {isError ? (
          <p className="text-sm text-[var(--danger,#b42318)]">
            Could not load battery types (need batteries:read).
          </p>
        ) : isPending ? (
          <LoadingState cols={6} rows={8} />
        ) : (
          <DynamicTableSection<BatteryTypeApi>
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
              title: `Battery models · ${count}`,
              searchQuery: controls.searchQuery,
              onSearchChange: controls.setSearchQuery,
              searchPlaceholder: 'Search name or manufacturer…',
              onFilter: controls.openFilter,
              showFilter: true,
              actions: can('batteries:manage') ? (
                <Button
                  leftSection={<PlusSignIcon size={16} />}
                  className="bg-[var(--pr)] hover:opacity-90"
                  onClick={() => navigate('/batteries/types/new')}
                >
                  Add battery model
                </Button>
              ) : undefined,
            }}
            onRowClick={(item) => navigate(`/batteries/types/${item.id}/edit`)}
            renderItems={(item) => [
              <span key="name" className="text-xs font-bold text-[var(--tx)]">
                {item.name}
              </span>,
              <span key="mfr" className="text-xs text-[var(--mu)]">
                {item.manufacturer}
              </span>,
              <span key="spec" className="text-xs text-[var(--mu)]">
                {item.nominal_voltage}V · {item.capacity_kwh} kWh
              </span>,
              <span key="vt" className="text-xs text-[var(--mu)]">
                {item.vehicle_type}
              </span>,
              <span key="qr" className="text-xs text-[var(--mu)]">
                {(item.qr_scheme || '—').replace(/_/g, ' ')}
              </span>,
              <div key="st" className="flex flex-col items-start gap-1">
                <TableStatusBadge
                  label={(item.status || '—').replace(/_/g, ' ')}
                  tone={tone(item.status)}
                />
                {item.status === 'PENDING' && can('battery-types:approve') ? (
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-[var(--pr)] hover:underline"
                    onClick={(e) => {
                      e.stopPropagation()
                      setActivateId(item.id)
                    }}
                  >
                    Activate
                  </button>
                ) : null}
              </div>,
            ]}
          />
        )}
      </AdminModuleLayout>
      {controls.filterModal}
      <AdminConfirmModal
        opened={Boolean(activateId)}
        onClose={() => setActivateId(null)}
        title="Approve and activate this battery model?"
        body="Maker-checker: approver must differ from the proposer. Active models can be assigned to batteries."
        confirmLabel="Approve & Activate"
        loading={activateMut.isPending}
        onConfirm={() => {
          confirmActivate().catch(() => undefined)
        }}
      />
    </>
  )
}
