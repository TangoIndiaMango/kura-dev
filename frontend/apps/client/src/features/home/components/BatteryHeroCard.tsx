import { ArrowRight01Icon } from 'hugeicons-react'
import type { OperatorVehicle } from '../../../shared/session'
import {
  LOW_SOC,
  kmUntilLow,
  needsSwapCta,
  packSignalLabel,
  socTone,
} from './batteryHeroUtils'

function MetricTile({
  label,
  value,
  accent,
}: {
  label: string
  value: React.ReactNode
  accent?: string
}) {
  return (
    <div className="rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg)]/45 px-3 py-2.5 backdrop-blur-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--kura-muted)]">
        {label}
      </p>
      <p
        className="mt-0.5 text-[18px] font-extrabold tracking-tight text-[var(--kura-text)]"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
    </div>
  )
}

function HealthyRideMetrics({ vehicle }: { vehicle: OperatorVehicle }) {
  const until = kmUntilLow(vehicle.socPercent, vehicle.rangeKm)
  const signal = packSignalLabel(vehicle.chargeObservedAt, vehicle.chargeSource)
  return (
    <div className="grid grid-cols-2 gap-2">
      <MetricTile
        label="Until low"
        value={
          until == null ? (
            <span className="text-[13px] font-bold text-[var(--kura-muted)]">
              —
            </span>
          ) : (
            <>
              {until}
              <span className="ml-1 text-[12px] font-bold text-[var(--kura-muted)]">
                km
              </span>
            </>
          )
        }
      />
      <MetricTile
        label="Pack signal"
        accent={signal.live ? '#2fbecf' : undefined}
        value={
          <span className="inline-flex items-center gap-1.5 text-[13px] font-extrabold">
            {signal.live ? (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--kura-teal-bright)] kura-pulse-dot"
                aria-hidden
              />
            ) : null}
            {signal.label}
          </span>
        }
      />
    </div>
  )
}

export function BatteryCard({
  vehicle,
  onBookSwap,
  active,
}: {
  vehicle: OperatorVehicle
  onBookSwap: () => void
  active: boolean
}) {
  const tone = socTone(vehicle.socPercent)
  const circumference = 2 * Math.PI * 54
  const soc = vehicle.socPercent
  const dash = soc == null ? 0 : (soc / 100) * circumference
  const showBook = needsSwapCta(vehicle)

  return (
    <section className="kura-home-hero relative h-full overflow-hidden rounded-[1.35rem] border border-[var(--kura-border)] px-5 pb-5 pt-5">
      <div className="pointer-events-none absolute inset-0 kura-home-mesh" aria-hidden />
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl"
        style={{ background: tone.glow }}
        aria-hidden
      />

      <div className="relative z-[1] flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--kura-teal-bright)]">
            Current battery
          </p>
          <h2 className="mt-1 truncate text-[20px] font-extrabold tracking-tight text-[var(--kura-text)]">
            {vehicle.short}
          </h2>
          <p className="mt-0.5 truncate text-[12px] text-[var(--kura-muted)]">
            {vehicle.battery} · {vehicle.reg}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
          style={{
            color: tone.fill,
            background: `color-mix(in srgb, ${tone.fill} 18%, transparent)`,
            border: `1px solid color-mix(in srgb, ${tone.fill} 35%, transparent)`,
          }}
        >
          {tone.label}
        </span>
      </div>

      <div className="relative z-[1] mt-4 flex items-center gap-5">
        <div className="relative h-[120px] w-[120px] shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="8"
            />
            <circle
              key={`${vehicle.id}-${active}`}
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={tone.fill}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              className={active ? 'kura-soc-draw' : undefined}
              style={{ filter: `drop-shadow(0 0 10px ${tone.glow})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[28px] font-extrabold leading-none tracking-tight text-[var(--kura-text)]">
              {soc == null ? '—' : soc}
              {soc != null ? (
                <span className="text-[14px] font-bold text-[var(--kura-muted)]">
                  %
                </span>
              ) : null}
            </span>
            <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--kura-muted)]">
              charge
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg)]/45 px-3.5 py-3 backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--kura-muted)]">
              Est. range
            </p>
            <p className="mt-0.5 text-[22px] font-extrabold tracking-tight text-[var(--kura-text)]">
              {vehicle.rangeKm == null ? (
                <span className="text-[15px] font-bold text-[var(--kura-muted)]">
                  Not tracked yet
                </span>
              ) : (
                <>
                  {vehicle.rangeKm}
                  <span className="ml-1 text-[13px] font-bold text-[var(--kura-muted)]">
                    km
                  </span>
                </>
              )}
            </p>
          </div>
          {showBook ? (
            <button
              type="button"
              onClick={onBookSwap}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--kura-amber)] px-3.5 py-3 text-[13px] font-extrabold text-[#1a1204] shadow-[0_8px_24px_rgba(245,166,35,0.28)]"
            >
              {soc != null && soc <= LOW_SOC ? 'Swap now' : 'Book a swap'}
              <ArrowRight01Icon size={16} />
            </button>
          ) : (
            <HealthyRideMetrics vehicle={vehicle} />
          )}
        </div>
      </div>
    </section>
  )
}

export function EmptyBatteryHero({
  onBookSwap,
  onAddVehicle,
}: {
  onBookSwap: () => void
  onAddVehicle?: () => void
}) {
  return (
    <section className="kura-home-hero relative overflow-hidden rounded-[1.35rem] border border-[var(--kura-border)] px-5 py-6">
      <div className="pointer-events-none absolute inset-0 kura-home-mesh" aria-hidden />
      <div className="relative z-[1] flex flex-col gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--kura-teal-bright)]">
          Your ride
        </p>
        <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--kura-text)]">
          Add a vehicle to track battery
        </h2>
        <p className="max-w-[260px] text-[13px] leading-relaxed text-[var(--kura-muted)]">
          Once linked, Home shows the mounted pack and live charge from the hub.
        </p>
        <button
          type="button"
          onClick={onAddVehicle ?? onBookSwap}
          className="mt-1 inline-flex w-fit items-center gap-2 rounded-xl bg-[var(--kura-teal)] px-4 py-2.5 text-[13px] font-bold text-[var(--kura-text-inverse)]"
        >
          Add vehicle
          <ArrowRight01Icon size={16} />
        </button>
      </div>
    </section>
  )
}
