import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Select } from '@mantine/core'
import { Download04Icon } from 'hugeicons-react'
import { DynamicTableSection, TableStatusBadge, type TableHeader } from '@shared/components'
import { useBatteries } from '../batteries/hooks/use-batteries'
import { STATUS_OPTIONS, batteryTone } from '../batteries/batteriesPanelModel'
import { batteryLocationLabel, batteryStatusLabel, type BatteryListApi } from '../batteries/types'
import { LOCATION_LABEL, LOCATION_OPTIONS } from './bay/bayFormat'
import { BayReceiveModal } from './bay/BayReceiveModal'
import { useCanDoBayWork, usePacksWaitingAtHub } from './hooks/use-bay-charging'

const HEADERS: TableHeader[] = [
  { key: 'serial', label: 'SERIAL' },
  { key: 'type', label: 'MODEL' },
  { key: 'where', label: 'WHERE' },
  { key: 'charge', label: 'CHARGE' },
  { key: 'health', label: 'HEALTH' },
  { key: 'status', label: 'STATUS' },
]
const PAGE_SIZE = 15
const selectStyles = { input: { backgroundColor: 'var(--in)', borderColor: 'var(--bd)', color: 'var(--tx)' } }

/** Every pack at this hub: in bays, waiting to be received, in the workshop. */
export function HubBatteriesTab({ hubId, enabled = true }: { hubId: string; enabled?: boolean }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [where, setWhere] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [receiving, setReceiving] = useState(false)
  const canWork = useCanDoBayWork()
  const { waiting } = usePacksWaitingAtHub(hubId, enabled && canWork)

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 300)
    return () => window.clearTimeout(t)
  }, [search])
  useEffect(() => setPage(1), [debounced, where, status])

  const { batteries, isPending, isFetching, totalPages, count } = useBatteries(
    {
      current_hub: hubId,
      page,
      page_size: PAGE_SIZE,
      ...(debounced ? { search: debounced } : {}),
      ...(where ? { custodian: where } : {}),
      ...(status ? { status } : {}),
    },
    { enabled },
  )

  return (
    <>
      <DynamicTableSection<BatteryListApi>
        variant="embedded"
        headers={HEADERS}
        data={batteries}
        loading={isPending || (isFetching && batteries.length === 0)}
        getRowKey={(b) => b.id}
        onRowClick={(b) => navigate(`/batteries/${b.id}`)}
        emptyTitle={debounced || where || status ? 'No packs match' : 'No packs at this hub'}
        emptyMessage={
          debounced || where || status
            ? 'Try another search or clear the filters.'
            : 'Packs added for this hub, transferred here or swapped in show up here.'
        }
        toolbar={{
          title: `Batteries at this hub · ${count}`,
          searchQuery: search,
          onSearchChange: setSearch,
          searchPlaceholder: 'Search serial or model…',
          filters: (
            <>
              <Select
                w={170}
                placeholder="Anywhere"
                data={LOCATION_OPTIONS.filter((o) => o.value !== 'NONE')}
                value={where}
                onChange={setWhere}
                clearable
                styles={selectStyles}
                comboboxProps={{ withinPortal: true }}
              />
              <Select
                w={150}
                placeholder="Any status"
                data={STATUS_OPTIONS}
                value={status}
                onChange={setStatus}
                clearable
                styles={selectStyles}
                comboboxProps={{ withinPortal: true }}
              />
            </>
          ),
          actions:
            canWork && waiting.length ? (
              <Button
                color="brand"
                leftSection={<Download04Icon size={15} />}
                rightSection={<Badge size="sm" circle color="orange">{waiting.length}</Badge>}
                onClick={() => setReceiving(true)}
              >
                Receive packs
              </Button>
            ) : undefined,
        }}
        pagination={{ page, totalPages, onPageChange: setPage, variant: 'controls', pageSize: String(PAGE_SIZE) }}
        renderItems={(b) => [
          <span key="s" className="font-mono text-xs font-semibold text-[var(--tx)]">
            {b.serial}
          </span>,
          <span key="t" className="text-xs text-[var(--mu)]">
            {b.battery_type_name}
          </span>,
          <span key="w" className="text-xs text-[var(--tx)]">
            {(b.custodian_type && LOCATION_LABEL[b.custodian_type]) || batteryLocationLabel(b)}
          </span>,
          <span key="c" className="text-xs font-semibold tabular-nums">
            {b.charge_pct}%
          </span>,
          <span key="h" className="text-xs tabular-nums text-[var(--mu)]">
            {b.health_pct}%
          </span>,
          <TableStatusBadge key="st" label={batteryStatusLabel(b.status)} tone={batteryTone(b.status)} />,
        ]}
      />
      <BayReceiveModal opened={receiving} onClose={() => setReceiving(false)} hubId={hubId} />
    </>
  )
}
