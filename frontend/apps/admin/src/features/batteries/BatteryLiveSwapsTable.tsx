import { useMemo, useState } from 'react'
import {
  DetailsDrawer,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
} from '@shared/components'
import { downloadCsv } from '@shared/utils/downloadCsv'
import { formatNaira } from '@shared/utils/currency'
import type { BatterySwapRow } from './hooks/use-batteries'

const HEADERS: TableHeader[] = [
  { key: 'when', label: 'WHEN' },
  { key: 'hub', label: 'HUB' },
  { key: 'role', label: 'ROLE' },
  { key: 'in', label: 'CHARGE IN' },
  { key: 'out', label: 'CHARGE OUT' },
  { key: 'vehicle', label: 'VEHICLE' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'status', label: 'STATUS' },
]

type Row = BatterySwapRow & { role: string }

export function BatteryLiveSwapsTable({
  batteryId,
  serial,
  rows,
}: {
  batteryId: string
  serial: string
  rows: BatterySwapRow[]
}) {
  const [peek, setPeek] = useState<Row | null>(null)
  const controls = useAdminModuleControls({
    scope: `battery_${batteryId}_swaps_live`,
    statusOptions: [],
    showDateRange: false,
    includeDateRangeInFilter: false,
    includeNameSort: false,
  })

  const mapped: Row[] = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        role: r.issued_serial === serial ? 'Out' : 'In',
      })),
    [rows, serial],
  )

  const filtered = useMemo(() => {
    const q = controls.search.toLowerCase()
    return mapped.filter(
      (r) =>
        (r.hub_code ?? '').toLowerCase().includes(q) ||
        (r.hub_name ?? '').toLowerCase().includes(q) ||
        (r.vehicle_plate ?? '').toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q),
    )
  }, [mapped, controls.search])

  const { pageRows, pagination } = controls.paginate(filtered)

  return (
    <>
      <DynamicTableSection<Row>
        variant="embedded"
        headers={HEADERS}
        data={pageRows}
        pagination={pagination}
        getRowKey={(r) => r.id}
        toolbar={{
          title: 'Cycle history',
          searchQuery: controls.searchQuery,
          onSearchChange: controls.setSearchQuery,
          searchPlaceholder: 'Search hub, vehicle, status…',
          showFilter: false,
          showExport: true,
          onExport: () =>
            downloadCsv(
              `${serial}-swaps.csv`,
              ['when', 'hub', 'role', 'in', 'out', 'vehicle', 'amount', 'status'],
              filtered.map((r) => [
                new Date(r.created_at).toLocaleString(),
                r.hub_code ?? r.hub_name ?? '',
                r.role,
                r.returned_charge_pct,
                r.issued_charge_pct,
                r.vehicle_plate ?? '',
                formatNaira(r.amount_kobo),
                r.status,
              ]),
            ),
        }}
        onRowClick={setPeek}
        emptyTitle="No swaps yet"
        emptyMessage="Completed swaps for this serial will list here."
        renderItems={(r) => [
          new Date(r.created_at).toLocaleString(),
          r.hub_code ?? r.hub_name ?? '—',
          r.role,
          `${r.returned_charge_pct}%`,
          `${r.issued_charge_pct}%`,
          r.vehicle_plate ?? '—',
          formatNaira(r.amount_kobo),
          <TableStatusBadge
            key="st"
            label={r.mismatch_flag ? `${r.status} · mismatch` : r.status}
            tone={r.mismatch_flag ? 'warning' : 'success'}
          />,
        ]}
      />
      <DetailsDrawer
        opened={!!peek}
        onClose={() => setPeek(null)}
        title={peek ? `Swap ${peek.id.slice(0, 8)}` : 'Swap'}
        rows={
          peek
            ? [
                { label: 'When', value: new Date(peek.created_at).toLocaleString() },
                { label: 'Hub', value: peek.hub_code ?? peek.hub_name ?? '—' },
                { label: 'Returned', value: peek.returned_serial ?? '—' },
                { label: 'Issued', value: peek.issued_serial ?? '—' },
                { label: 'Vehicle', value: peek.vehicle_plate ?? '—' },
                { label: 'Amount', value: formatNaira(peek.amount_kobo) },
              ]
            : []
        }
      />
    </>
  )
}
