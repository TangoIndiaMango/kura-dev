import { useMemo, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Skeleton, Text } from '@mantine/core'
import { AdminDetailPage, TableStatusBadge } from '@shared/components'
import { useCapabilities } from '../auth/useCapabilities'
import { TelemetryCockpitAndRouteCard } from './components/TelemetryCockpitAndRouteCard'
import { useTelemetryEvents, useTelemetryFleet } from './hooks/use-telemetry'
import type { TelemetryStatus } from './types'

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
        {label}
      </div>
      <div className="mt-1 text-[13px] text-[var(--tx)]">{value}</div>
    </div>
  )
}

function telemetryTone(status: TelemetryStatus | string) {
  if (status === 'LIVE') return 'success' as const
  if (status === 'STATIONARY') return 'warning' as const
  return 'danger' as const
}

export function TelemetryDetailPanel() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const { rows, isPending: fleetPending } = useTelemetryFleet(
    undefined,
    { enabled: can('telemetry:read') },
  )
  const row = useMemo(
    () => rows.find((r) => r.vehicle_id === id) ?? null,
    [rows, id],
  )
  const eventsQ = useTelemetryEvents(id, {
    enabled: Boolean(id) && can('telemetry:read'),
  })

  const events = useMemo(() => {
    const data = eventsQ.data
    if (!data) return []
    if (Array.isArray(data)) return data
    return data.results ?? []
  }, [eventsQ.data])

  if (!can('telemetry:read')) {
    return (
      <AdminDetailPage
        backLabel="Back to telemetry"
        onBack={() => navigate('/telemetry')}
        breadcrumbs={[{ label: 'Telemetry', to: '/telemetry' }, { label: '—' }]}
        title="Permission required"
        summaryRows={[{ label: 'Cap', value: 'telemetry:read' }]}
      />
    )
  }

  if (fleetPending) {
    return (
      <div className="p-6">
        <Skeleton height={280} radius="md" />
      </div>
    )
  }

  if (!row) {
    return (
      <AdminDetailPage
        backLabel="Back to telemetry"
        onBack={() => navigate('/telemetry')}
        breadcrumbs={[{ label: 'Telemetry', to: '/telemetry' }, { label: id ?? '—' }]}
        title="Vehicle not found"
        summaryRows={[{ label: 'ID', value: id ?? '—' }]}
      />
    )
  }

  return (
    <AdminDetailPage
      backLabel="Back to telemetry"
      onBack={() => navigate('/telemetry')}
      breadcrumbs={[
        { label: 'Telemetry', to: '/telemetry' },
        { label: row.registration_plate },
      ]}
      title={row.registration_plate}
      subtitle={`${row.make} ${row.model} · ${row.owner_name}`}
      statusLabel={row.telemetry_status}
      statusTone={
        row.telemetry_status === 'LIVE'
          ? 'success'
          : row.telemetry_status === 'STATIONARY'
            ? 'warning'
            : 'danger'
      }
      actions={[
        {
          id: 'vehicle',
          label: 'Open vehicle',
          onClick: () => navigate(`/vehicles/${row.vehicle_id}`),
        },
      ]}
      tabs={[
        {
          id: 'overview',
          label: 'Overview',
          content: (
            <div className="flex flex-col gap-5">
              {eventsQ.isPending ? (
                <Skeleton height={220} radius="md" />
              ) : (
                <TelemetryCockpitAndRouteCard row={row} events={events} />
              )}
              <section>
                <Text fw={700} size="sm" className="mb-3 text-[var(--tx)]">
                  Last known
                </Text>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Fact
                    label="Owner"
                    value={
                      <Link
                        to={`/operators/${row.account_id}`}
                        className="font-semibold text-[var(--pr)] hover:underline"
                      >
                        {row.owner_name}
                      </Link>
                    }
                  />
                  <Fact
                    label="Telemetry"
                    value={
                      <TableStatusBadge
                        label={row.telemetry_status}
                        tone={telemetryTone(row.telemetry_status)}
                      />
                    }
                  />
                  <Fact
                    label="Battery"
                    value={
                      row.battery_pct != null ? `${row.battery_pct}%` : '—'
                    }
                  />
                  <Fact
                    label="Speed"
                    value={
                      row.speed_kmh != null ? `${row.speed_kmh} km/h` : '—'
                    }
                  />
                  <Fact
                    label="Last ping"
                    value={
                      row.last_recorded_at
                        ? new Date(row.last_recorded_at).toLocaleString()
                        : '—'
                    }
                  />
                  <Fact label="Source" value={row.source ?? '—'} />
                </div>
              </section>
              <section>
                <Text fw={700} size="sm" className="mb-2 text-[var(--tx)]">
                  Recent events
                </Text>
                {eventsQ.isPending ? (
                  <Skeleton height={120} radius="md" />
                ) : events.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    No telemetry events for this vehicle yet.
                  </Text>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {events.slice(0, 12).map((ev) => (
                      <li
                        key={ev.id}
                        className="rounded-[10px] border border-[var(--bd)] bg-[var(--in)] px-3 py-2.5"
                      >
                        <div className="text-[13px] font-semibold text-[var(--tx)]">
                          {ev.source} · SOC{' '}
                          {ev.battery_pct != null ? `${ev.battery_pct}%` : '—'}
                        </div>
                        <div className="mt-0.5 text-[12px] text-[var(--mu)]">
                          {new Date(ev.recorded_at).toLocaleString()}
                          {ev.speed_kmh != null
                            ? ` · ${ev.speed_kmh} km/h`
                            : ''}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ),
        },
      ]}
    />
  )
}
