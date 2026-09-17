import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@mantine/core'
import {
  AdminModuleLayout,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
} from '@shared/components'
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
  }, [rows, controls.filterValues, controls.search])

  const { pageRows, pagination } = controls.paginate(filtered)

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
        subtitle="Live fleet pings from hubs and vehicles"
        dateRangeSlot={controls.dateRangeSlot}
        kpis={[
          {
            title: 'Reporting live',
            value: isPending ? '—' : String(totals.live),
            sub: 'Last 24h',
            tone: 'success',
          },
          {
            title: 'Stationary',
            value: isPending ? '—' : String(totals.stationary),
            sub: 'Low speed / aging ping',
            tone: totals.stationary > 0 ? 'warning' : 'default',
          },
          {
            title: 'Offline',
            value: isPending ? '—' : String(totals.offline),
            sub: 'No recent events',
            tone: totals.offline > 0 ? 'danger' : 'default',
          },
          {
            title: 'Active vehicles',
            value: isPending ? '—' : String(totals.vehicles),
            sub: 'In fleet register',
          },
        ]}
      >
        {isError ? (
          <p className="text-sm text-[var(--danger,#b42318)]">
            Could not load telemetry fleet.
          </p>
        ) : isPending ? (
          <Skeleton height={280} radius="md" />
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
