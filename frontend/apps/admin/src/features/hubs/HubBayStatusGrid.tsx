import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Button, TextInput } from '@mantine/core'
import { FilterIcon, Search01Icon } from 'hugeicons-react'
import {
  DetailsDrawer,
  sliceTablePage,
  useAdminModuleControls,
} from '@shared/components'
import type { BatteryRecord, ReservationRecord } from '@shared/mock/adminMockData'
import { buildBayBoardCards, type BayBoardCard, type BayBoardKind } from './hubBayBoardModel'
import { HubBayStatusCard } from './HubBayStatusCard'

const PAGE_SIZE = 20

const KIND_OPTIONS = [
  { value: 'ready', label: 'Ready' },
  { value: 'charging', label: 'Charging' },
  { value: 'empty', label: 'Empty' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'fault', label: 'Fault' },
]

export function HubBayStatusGrid({
  hubId,
  batteries,
  slots = 0,
  reservations = [],
  boardCards,
  title = 'Live bay board',
  subtitle = 'Today · dock status',
  embedded = false,
  pageSize = PAGE_SIZE,
  filterKinds,
  dateRangeSlot,
}: {
  hubId: string
  batteries?: BatteryRecord[]
  slots?: number
  reservations?: ReservationRecord[]
  /** When set (live slots API), skips mock battery fleet mapping. */
  boardCards?: BayBoardCard[]
  title?: string
  subtitle?: string
  embedded?: boolean
  pageSize?: number
  filterKinds?: BayBoardKind[]
  dateRangeSlot?: ReactNode
}) {
  const [page, setPage] = useState(1)
  const [peek, setPeek] = useState<BayBoardCard | null>(null)

  const controls = useAdminModuleControls({
    scope: `hub_${hubId}_bayboard`,
    statusOptions: [],
    showDateRange: false,
    includeDateRangeInFilter: false,
    includeNameSort: false,
    pageSize,
    filterTitle: 'Filter bay board',
    extraFilterFields: [
      {
        type: 'select',
        key: 'kind',
        label: 'Bay status',
        placeholder: 'Any status',
        options: KIND_OPTIONS,
      },
    ],
  })

  const allCards = useMemo(() => {
    if (boardCards) return boardCards
    return buildBayBoardCards(batteries ?? [], slots, reservations)
  }, [boardCards, batteries, slots, reservations])

  const cards = useMemo(() => {
    const q = controls.search.toLowerCase()
    return allCards.filter((c) => {
      if (filterKinds && filterKinds.length > 0 && !filterKinds.includes(c.kind)) {
        return false
      }
      if (!controls.matchesFilter('kind', c.kind)) return false
      if (!q) return true
      return (
        String(c.bay).includes(q) ||
        c.serial.toLowerCase().includes(q) ||
        c.typeTag.toLowerCase().includes(q) ||
        c.statusLabel.toLowerCase().includes(q) ||
        (c.reserved?.name.toLowerCase().includes(q) ?? false)
      )
    })
  }, [allCards, filterKinds, controls])

  useEffect(() => {
    setPage(1)
  }, [filterKinds, slots, hubId, controls.search, controls.filterValues])

  const { pageRows, totalPages, safePage } = sliceTablePage(cards, page, pageSize)

  const toolbar = (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${embedded ? 'mb-3' : 'border-b border-[var(--bd)] px-4 py-3'}`}>
      <div className="min-w-0">
        <h2 className="text-[14px] font-bold text-[var(--tx)]">{title}</h2>
        <p className="text-[12.5px] text-[var(--mu)]">
          {subtitle}
          {' · '}
          Showing {(safePage - 1) * pageSize + 1}–
          {Math.min(safePage * pageSize, cards.length)} of {cards.length}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {dateRangeSlot}
        <TextInput
          placeholder="Search bay, serial…"
          value={controls.searchQuery}
          onChange={(e) => controls.setSearchQuery(e.currentTarget.value)}
          leftSection={<Search01Icon size={15} color="var(--mu)" />}
          className="w-[200px]"
          radius="md"
          styles={{
            input: {
              backgroundColor: 'var(--in)',
              borderColor: 'var(--bd)',
              color: 'var(--tx)',
            },
          }}
        />
        <Button
          variant="default"
          leftSection={<FilterIcon size={15} />}
          onClick={controls.openFilter}
          styles={{
            root: {
              borderColor: 'var(--bd)',
              color: 'var(--tx)',
              backgroundColor: 'var(--sf)',
              fontWeight: 600,
            },
          }}
        >
          Filter
        </Button>
      </div>
    </div>
  )

  const body = (
    <>
      {toolbar}

      <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${embedded ? '' : 'p-4'}`}>
        {pageRows.map((card) => (
          <HubBayStatusCard key={card.bay} card={card} onClick={() => setPeek(card)} />
        ))}
      </div>

      {cards.length === 0 ? (
        <p className={`text-[13px] text-[var(--mu)] ${embedded ? 'mt-2' : 'px-4 pb-4'}`}>
          No bays match this filter.
        </p>
      ) : null}

      <div
        className={`flex items-center justify-between gap-2 ${
          embedded ? 'mt-3' : 'border-t border-[var(--bd)] px-4 py-3'
        }`}
      >
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => setPage(safePage - 1)}
          className="rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--mu)] disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-[12px] tabular-nums text-[var(--su)]">
          Page {safePage} of {totalPages}
        </span>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => setPage(safePage + 1)}
          className="rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--mu)] disabled:opacity-40"
        >
          Next
        </button>
      </div>

      {controls.filterModal}

      <DetailsDrawer
        opened={!!peek}
        onClose={() => setPeek(null)}
        title={peek ? `Bay #${String(peek.bay).padStart(2, '0')}` : 'Bay'}
        rows={
          peek
            ? peek.kind === 'empty'
              ? [
                  { label: 'Status', value: 'Dock open' },
                  { label: 'Lock', value: peek.sohLabel },
                  { label: 'Temp', value: peek.tempLabel },
                ]
              : peek.kind === 'reserved' && peek.reserved
                ? [
                    { label: 'Hold', value: peek.reserved.holdLeft },
                    { label: 'Operator', value: peek.reserved.name },
                    { label: 'Code', value: peek.reserved.code },
                    { label: 'Charge', value: peek.chargePct != null ? `${peek.chargePct}%` : '—' },
                    { label: 'Pack', value: peek.battery?.serial ?? '—' },
                  ]
                : [
                    { label: 'Type', value: peek.battery?.type ?? peek.typeTag },
                    { label: 'Status', value: peek.statusLabel },
                    { label: 'Charge', value: peek.chargePct != null ? `${peek.chargePct}%` : '—' },
                    { label: 'Health', value: peek.sohLabel },
                    { label: 'Temp', value: peek.tempLabel },
                    { label: 'Serial', value: peek.serial },
                  ]
            : []
        }
        viewMore={
          peek?.batteryId
            ? { to: `/batteries/${peek.batteryId}`, label: 'View pack' }
            : peek?.battery?.id
              ? { to: `/batteries/${peek.battery.id}`, label: 'View more' }
              : undefined
        }
      />
    </>
  )

  if (embedded) return <div data-hub={hubId}>{body}</div>

  return (
    <section className="overflow-hidden rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] shadow-[var(--sh)]">
      {body}
    </section>
  )
}
