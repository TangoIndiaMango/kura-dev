import { Skeleton } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { useCommandCentre } from '../hooks/use-command-centre'

function hubBadge(status: string) {
  const s = status.toUpperCase()
  if (s === 'ONLINE') return { bg: 'var(--tg)', color: '#1E8E4E', label: 'Online' }
  if (s === 'OFFLINE') return { bg: 'var(--tr)', color: '#C0392B', label: 'Offline' }
  return { bg: 'var(--ta)', color: '#B26A00', label: status }
}

function syncAge(iso: string | null | undefined): string {
  if (!iso) return 'Never'
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms) || ms < 0) return '—'
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 48) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function DashboardHubStrip() {
  const navigate = useNavigate()
  const { data, isPending } = useCommandCentre()
  const hubs = data?.hubs ?? []

  if (isPending && hubs.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={140} radius={12} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {hubs.map((hub) => {
        const badge = hubBadge(hub.status)
        const solarLabel = hub.solar_fault
          ? 'Solar fault'
          : hub.solar_capacity_kw
            ? `Rated ${hub.solar_capacity_kw} kW`
            : 'Solar —'
        return (
          <button
            key={hub.id}
            type="button"
            onClick={() => navigate(`/hubs/${hub.id}`)}
            className="flex flex-col gap-3 rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 text-left shadow-[var(--sh)] transition-colors hover:border-[var(--pr)] sm:p-[16px_18px]"
          >
            <div className="flex items-center justify-between gap-2.5">
              <div className="min-w-0 flex flex-col">
                <div className="truncate text-[14.5px] font-bold text-[var(--tx)]">
                  {hub.name}
                </div>
                <div className="text-[11.5px] font-medium text-[var(--mu)]">{hub.code}</div>
              </div>
              <div
                style={{ background: badge.bg, color: badge.color }}
                className="rounded-[12px] px-2.5 py-1 text-[11px] font-bold leading-none"
              >
                {badge.label}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-[var(--bd)] pt-1">
              <div className="flex flex-col gap-0.5">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--su)]">
                  Ready
                </div>
                <div className="text-[15px] font-bold text-[var(--tx)]">{hub.ready}</div>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--su)]">
                  Charging
                </div>
                <div className="text-[15px] font-bold text-[var(--tx)]">{hub.charging}</div>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--su)]">
                  Alerts
                </div>
                <div className="text-[15px] font-bold text-[var(--tx)]">{hub.open_alerts}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-[var(--bd)] pt-1">
              <div className="flex flex-col gap-0.5">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--su)]">
                  Sync
                </div>
                <div className="text-[12.5px] font-semibold text-[var(--tx)]">
                  {syncAge(hub.last_sync_at)}
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--su)]">
                  Solar
                </div>
                <div
                  className={`text-[12.5px] font-semibold ${
                    hub.solar_fault ? 'text-[#C0392B]' : 'text-[var(--tx)]'
                  }`}
                >
                  {solarLabel}
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
