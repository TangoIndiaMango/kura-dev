import {
  ZapIcon,
  DashboardSpeed01Icon,
  Location01Icon,
  Route01Icon,
  BatteryCharging01Icon,
  Clock01Icon,
} from 'hugeicons-react'
import { AdminAreaChart, ADMIN_CHART_COLORS } from '@shared/components/charts'
import type { TelemetryEventApi, TelemetryFleetRow } from '../types'

type Props = {
  row: TelemetryFleetRow
  events: TelemetryEventApi[]
}

function chartPoints(events: TelemetryEventApi[]) {
  const chronological = [...events].reverse().slice(-12)
  if (!chronological.length) {
    return [{ label: '—', speed: 0, soc: 0 }]
  }
  return chronological.map((ev) => ({
    label: new Date(ev.recorded_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    speed: ev.speed_kmh ?? 0,
    soc: ev.battery_pct ?? 0,
  }))
}

function waypoints(events: TelemetryEventApi[], plate: string) {
  const withCoords = events.filter((e) => e.lat != null && e.lng != null).slice(0, 6)
  if (!withCoords.length) {
    return [
      {
        name: plate,
        time: '—',
        status: 'No GPS trail yet — SoC updates only',
      },
    ]
  }
  return [...withCoords].reverse().map((ev, idx, arr) => {
    const isLast = idx === arr.length - 1
    return {
      name:
        ev.lat != null && ev.lng != null
          ? `${Number(ev.lat).toFixed(4)}, ${Number(ev.lng).toFixed(4)}`
          : plate,
      time: new Date(ev.recorded_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: isLast
        ? `Latest · SOC ${ev.battery_pct ?? '—'}%`
        : `SOC ${ev.battery_pct ?? '—'}% · ${ev.speed_kmh ?? 0} km/h`,
    }
  })
}

export function TelemetryCockpitAndRouteCard({ row, events }: Props) {
  const isLive = row.telemetry_status === 'LIVE'
  const isStationary = row.telemetry_status === 'STATIONARY'
  const socPct = row.battery_pct ?? 0
  const currentSpeed = row.speed_kmh ?? 0
  const estRangeKm = Math.round((socPct / 100) * 55)
  const profile = chartPoints(events)
  const trail = waypoints(events, row.registration_plate)

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
        <div className="mb-3.5 flex items-center justify-between border-b border-[var(--bd)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--pr)]/10 text-[var(--pr)]">
              <DashboardSpeed01Icon size={18} />
            </div>
            <div>
              <h3 className="text-[13.5px] font-bold text-[var(--tx)]">
                Cockpit telemetry
              </h3>
              <p className="text-[11.5px] text-[var(--mu)]">
                From recent events · {row.source ?? 'unknown'} source
              </p>
            </div>
          </div>
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
              isLive
                ? 'bg-[#27AE60]/15 text-[#27AE60]'
                : isStationary
                  ? 'bg-[#F5A623]/15 text-[#F5A623]'
                  : 'bg-[#E74C3C]/15 text-[#E74C3C]'
            }`}
          >
            {row.telemetry_status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-0.5 rounded-lg border border-[var(--bd)]/60 bg-[var(--bg)] p-2.5">
            <div className="flex items-center justify-between text-[11px] text-[var(--mu)]">
              <span>Battery SoC</span>
              <BatteryCharging01Icon size={13} className="text-[#27AE60]" />
            </div>
            <span className="text-[15px] font-extrabold text-[var(--tx)]">
              {socPct}%{' '}
              <span className="text-[11px] font-normal text-[#27AE60]">
                ~{estRangeKm} km
              </span>
            </span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-lg border border-[var(--bd)]/60 bg-[var(--bg)] p-2.5">
            <div className="flex items-center justify-between text-[11px] text-[var(--mu)]">
              <span>Current speed</span>
              <DashboardSpeed01Icon size={13} className="text-[var(--pr)]" />
            </div>
            <span className="text-[15px] font-extrabold text-[var(--tx)]">
              {currentSpeed}{' '}
              <span className="text-[11px] font-normal text-[var(--mu)]">km/h</span>
            </span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-lg border border-[var(--bd)]/60 bg-[var(--bg)] p-2.5">
            <div className="flex items-center justify-between text-[11px] text-[var(--mu)]">
              <span>Events</span>
              <ZapIcon size={13} className="text-[var(--pr)]" />
            </div>
            <span className="text-[15px] font-extrabold text-[var(--tx)]">
              {events.length}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-[13.5px] font-bold text-[var(--tx)]">
              Speed & SoC profile
            </h3>
            <p className="text-[11.5px] text-[var(--mu)]">
              Recent telemetry samples for this vehicle
            </p>
          </div>
        </div>
        <AdminAreaChart
          data={profile}
          series={[
            {
              dataKey: 'speed',
              name: 'Speed (km/h)',
              color: ADMIN_CHART_COLORS.teal,
            },
            {
              dataKey: 'soc',
              name: 'SoC (%)',
              color: ADMIN_CHART_COLORS.amber,
            },
          ]}
          height={190}
          showLegend
        />
      </div>

      <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
        <div className="mb-3.5 flex items-center justify-between border-b border-[var(--bd)] pb-3">
          <div className="flex items-center gap-2">
            <Route01Icon size={17} className="text-[var(--pr)]" />
            <h3 className="text-[13.5px] font-bold text-[var(--tx)]">
              GPS breadcrumb trail
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--mu)]">
            <Location01Icon size={13} className="text-[var(--pr)]" />
            <span>{row.make} {row.model}</span>
          </div>
        </div>
        <div className="relative pl-6">
          <div className="absolute bottom-2 left-2.5 top-2 w-0.5 bg-gradient-to-b from-[var(--pr)] via-[#4FC3F7] to-[#27AE60]" />
          <div className="flex flex-col gap-3">
            {trail.map((wp, idx) => {
              const isLast = idx === trail.length - 1
              return (
                <div
                  key={`${wp.name}-${wp.time}-${idx}`}
                  className="relative flex items-start justify-between gap-3 text-[12px]"
                >
                  <div
                    className={`absolute -left-[20px] top-1 h-3 w-3 rounded-full border-2 border-[var(--sf)] ${
                      isLast
                        ? 'bg-[#27AE60] ring-4 ring-[#27AE60]/20'
                        : 'bg-[var(--pr)]'
                    }`}
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-[var(--tx)]">{wp.name}</span>
                    <p className="text-[11px] text-[var(--mu)]">{wp.status}</p>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[11px] text-[var(--mu)]">
                    <Clock01Icon size={12} />
                    <span>{wp.time}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
