import { useMemo, useState } from 'react'
import {
  DetailsDrawer,
  DynamicTableSection,
  useAdminModuleControls,
  type TableHeader,
} from '@shared/components'
import { downloadCsv } from '@shared/utils/downloadCsv'
import type { CustodyEvent } from './batteryDetailLive'

const HEADERS: TableHeader[] = [
  { key: 'at', label: 'WHEN' },
  { key: 'event', label: 'EVENT' },
  { key: 'fromTo', label: 'FROM → TO' },
  { key: 'hub', label: 'HUB' },
  { key: 'charge', label: 'CHARGE' },
  { key: 'actor', label: 'ACTOR' },
]

export function BatteryCustodyTable({
  batteryId,
  serial,
  rows,
}: {
  batteryId: string
  serial: string
  rows: CustodyEvent[]
}) {
  const [peek, setPeek] = useState<CustodyEvent | null>(null)
  const controls = useAdminModuleControls({
    scope: `battery_${batteryId}_custody`,
    statusOptions: [],
    filterTitle: 'Filter custody trail',
    showDateRange: false,
    includeDateRangeInFilter: false,
    includeNameSort: false,
  })

  const filtered = useMemo(() => {
    const q = controls.search.toLowerCase()
    return rows.filter(
      (r) =>
        r.event.toLowerCase().includes(q) ||
        r.hub.toLowerCase().includes(q) ||
        r.actor.toLowerCase().includes(q) ||
        r.fromTo.toLowerCase().includes(q),
    )
  }, [rows, controls.search])

  const { pageRows, pagination } = controls.paginate(filtered)

  return (
    <>
      <DynamicTableSection<CustodyEvent>
        variant="embedded"
        headers={HEADERS}
        data={pageRows}
        pagination={pagination}
        getRowKey={(r) => r.id}
        toolbar={{
          title: 'Custody trail',
          searchQuery: controls.searchQuery,
          onSearchChange: controls.setSearchQuery,
          searchPlaceholder: 'Search event, hub, actor…',
          showFilter: false,
          showExport: true,
          onExport: () =>
            downloadCsv(
              `${serial}-custody.csv`,
              ['when', 'event', 'fromTo', 'hub', 'charge', 'actor'],
              filtered.map((r) => [r.at, r.event, r.fromTo, r.hub, r.chargePct, r.actor]),
            ),
        }}
        onRowClick={setPeek}
        emptyTitle="No custody events"
        emptyMessage="Lifecycle events for this pack will list here."
        renderItems={(r) => [
          r.at,
          r.event,
          r.fromTo,
          r.hub,
          `${r.chargePct}%`,
          r.actor,
        ]}
      />

      <DetailsDrawer
        opened={!!peek}
        onClose={() => setPeek(null)}
        title={peek?.event ?? 'Event'}
        rows={
          peek
            ? [
                { label: 'When', value: peek.at },
                { label: 'From → To', value: peek.fromTo },
                { label: 'Hub', value: peek.hub },
                { label: 'Charge', value: `${peek.chargePct}%` },
                { label: 'Actor', value: peek.actor },
              ]
            : []
        }
      />
    </>
  )
}
