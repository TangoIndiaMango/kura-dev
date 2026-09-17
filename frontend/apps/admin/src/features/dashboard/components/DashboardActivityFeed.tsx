import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search01Icon } from 'hugeicons-react'
import { Skeleton } from '@mantine/core'
import {
  DynamicTableSection,
  TableStatusBadge,
  type TableHeader,
} from '@shared/components'
import { useOpsActivity } from '../hooks/use-command-centre'

const HEADERS: TableHeader[] = [
  { key: 'time', label: 'TIME' },
  { key: 'event', label: 'EVENT' },
  { key: 'detail', label: 'DETAIL' },
  { key: 'hub', label: 'HUB' },
  { key: 'kind', label: 'KIND' },
]

export function DashboardActivityFeed() {
  const navigate = useNavigate()
  const { data, isPending } = useOpsActivity()
  const [search, setSearch] = useState('')
  const rows = data?.results ?? []

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q) ||
        (r.hub_code || '').toLowerCase().includes(q),
    )
  }, [rows, search])

  return (
    <div className="flex flex-col gap-4 rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-5 shadow-[var(--sh)]">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="text-[17px] font-bold text-[var(--tx)]">Fleet Activity Feed</div>
        <div className="flex w-full items-center gap-2 rounded-[8px] border border-[var(--bd)] bg-[var(--in)] px-3 py-2 text-[13px] text-[var(--su)] sm:w-[260px]">
          <Search01Icon size={14} className="shrink-0 opacity-70" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events"
            className="w-full border-0 bg-transparent text-[13px] text-[var(--tx)] outline-none"
          />
        </div>
      </div>

      {isPending && filtered.length === 0 ? (
        <Skeleton height={180} radius={8} />
      ) : (
        <DynamicTableSection<(typeof filtered)[number]>
          variant="embedded"
          headers={HEADERS}
          data={filtered}
          getRowKey={(item) => `${item.kind}-${item.id}`}
          onRowClick={(item) => navigate(item.link_path)}
          renderItems={(item) => [
            <span key="time" className="text-xs font-bold text-[var(--tx)]">
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>,
            <span key="event" className="text-xs font-bold text-[var(--tx)]">
              {item.title}
            </span>,
            <span key="detail" className="text-xs text-[var(--mu)]">
              {item.subtitle || '—'}
            </span>,
            <span key="hub" className="text-xs text-[var(--mu)]">
              {item.hub_code || '—'}
            </span>,
            <TableStatusBadge
              key="kind"
              label={item.kind}
              tone={item.kind === 'alert' ? 'warning' : 'success'}
            />,
          ]}
        />
      )}
    </div>
  )
}
