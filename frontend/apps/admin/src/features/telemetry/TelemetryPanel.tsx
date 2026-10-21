import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AdminModuleLayout,
  DynamicTableSection,
  LoadingState,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
} from '@shared/components'
import { scopeFilterKey } from '@shared/utils/table-filters/create-scoped-filters'
import { downloadCsv } from '@shared/utils/downloadCsv'
import { useCapabilities } from '../auth/useCapabilities'
import { useTelemetryFleet } from './hooks/use-telemetry'
import type { TelemetryFleetRow, TelemetryStatus } from './types'

const HEADERS: TableHeader[] = [
  { key: 'reg', label: 'REG NUMBER' },
  { key: 'type', label: 'TYPE' },
  { key: 'model', label: 'MAKE / MODEL' },
  { key: 'owner', label: 'OWNER' },
  { key: 'telemetry', label: 'TELEMETRY' },
  { key: 'soc', label: 'SOC' },
  { key: 'status', label: 'VEHICLE' },
]

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'PENDING', label: 'Pending' },
]

function telemetryTone(status: TelemetryStatus) {
  if (status === 'LIVE') return 'success' as const
  if (status === 'STATIONARY') return 'warning' as const
  return 'danger' as const
}

export function TelemetryPanel() {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const controls = useAdminModuleControls({
    scope: 'telemetry',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter telemetry',
    showDateRange: false,
    includeDateRangeInFilter: false,
    extraFilterFields: [
      {
        type: 'select',
        key: 'telemetry',
        label: 'Telemetry state',
        placeholder: 'Any',
        options: [
          { value: 'LIVE', label: 'Live' },
          { value: 'STATIONARY', label: 'Stationary' },
          { value: 'OFFLINE', label: 'Offline' },
        ],
      },
    ],
  })

  const teleFilter = controls.getFilter('telemetry')

  const { rows, totals, isPending, isError } = useTelemetryFleet(
    { search: controls.search || undefined },
    { enabled: can('telemetry:read') },
  )

  const filtered = useMemo(() => {
    return rows.filter((v) => {
      if (!controls.matchesStatus(v.vehicle_status)) return false
      if (!controls.matchesFilter('telemetry', v.telemetry_status)) return false
      return true
    })
  }, [rows, controls.filterValues])

  const { pageRows, pagination } = controls.paginate(filtered)

  const focusOffline = () => {
    controls.applyFilters({
      ...controls.filterValues,
      [scopeFilterKey('telemetry', 'telemetry')]: 'OFFLINE',
    })
  }

  if (!can('telemetry:read')) {
    return (
      <AdminModuleLayout
        title="Telemetry"
        subtitle="You need telemetry:read to view live fleet data."
        kpis={[]}
      >
        <p className="text-sm text-[var(--mu)]">Permission required.</p>
      </AdminModuleLayout>
    )
  }

  return (
    <>
      <AdminModuleLayout
        title="Telemetry"
        subtitle="Who needs attention right now — offline first, then live coverage"
        overviewTitle="Fleet signal"
        kpis={[
          {
            title: 'Offline',
            value: isPending ? '—' : String(totals.offline),
            sub: totals.offline > 0 ? 'Needs follow-up' : 'None silent',
            tone: totals.offline > 0 ? 'danger' : 'success',
          },
          {
            title: 'Live',
            value: isPending ? '—' : String(totals.live),
            sub: 'Pinged in last 24h',
            tone: 'success',
          },
          {
            title: 'Stationary',
            value: isPending ? '—' : String(totals.stationary),
            sub: 'Aging / low-motion ping',
            tone: totals.stationary > 0 ? 'warning' : 'default',
          },
        ]}
      >
        {totals.offline > 0 && !teleFilter ? (
          <button
            type="button"
            onClick={focusOffline}
            className="mb-3 text-left text-[12.5px] font-semibold text-[var(--pr)] hover:underline"
          >
            Show {totals.offline} offline vehicle{totals.offline === 1 ? '' : 's'} →
          </button>
        ) : null}
        {isError ? (
          <p className="text-sm text-[var(--danger,#b42318)]">
            Could not load telemetry fleet.
          </p>
        ) : isPending ? (
          <LoadingState cols={6} rows={8} />
        ) : (
          <DynamicTableSection<TelemetryFleetRow>
            variant="embedded"
            headers={HEADERS}
            data={pageRows}
            pagination={pagination}
            getRowKey={(item) => item.vehicle_id}
            toolbar={{
              title: 'Fleet telemetry',
              searchQuery: controls.searchQuery,
              onSearchChange: controls.setSearchQuery,
              searchPlaceholder: 'Search reg or owner…',
              onFilter: controls.openFilter,
              showFilter: true,
              showExport: true,
              onExport: () =>
                downloadCsv(
                  'telemetry-fleet.csv',
                  [
                    'reg',
                    'type',
                    'make',
                    'model',
                    'owner',
                    'telemetry',
                    'soc',
                    'vehicle_status',
                  ],
                  filtered.map((v) => [
                    v.registration_plate,
                    v.vehicle_type,
                    v.make,
                    v.model,
                    v.owner_name,
                    v.telemetry_status,
                    v.battery_pct ?? '',
                    v.vehicle_status,
                  ]),
                ),
            }}
            onRowClick={(item) => navigate(`/telemetry/${item.vehicle_id}`)}
            emptyTitle={teleFilter ? 'No vehicles in this state' : 'No telemetry yet'}
            emptyMessage={
              teleFilter
                ? 'Clear the telemetry filter to see the full fleet.'
                : 'Vehicles appear here once hubs report events.'
            }
            renderItems={(item) => [
              <span
                key="reg"
                className="font-mono text-xs font-bold text-[var(--pr)]"
              >
                {item.registration_plate}
              </span>,
              <span key="type" className="text-xs text-[var(--mu)]">
                {item.vehicle_type}
              </span>,
              <span key="model" className="text-xs text-[var(--tx)]">
                {item.make} {item.model}
              </span>,
              <span key="owner" className="text-xs text-[var(--mu)]">
                {item.owner_name}
              </span>,
              <TableStatusBadge
                key="tel"
                label={item.telemetry_status}
                tone={telemetryTone(item.telemetry_status)}
              />,
              <span key="soc" className="text-xs text-[var(--mu)]">
                {item.battery_pct != null ? `${item.battery_pct}%` : '—'}
              </span>,
              <TableStatusBadge
                key="st"
                label={item.vehicle_status}
                tone={item.vehicle_status === 'ACTIVE' ? 'success' : 'neutral'}
              />,
            ]}
          />
        )}
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
