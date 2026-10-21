import { useMemo, useState } from 'react'
import { formatNaira } from '../../../shared/utils/currency'
import { nowMs } from '../../../shared/time/serverClock'
import { useFleetSpend, type FleetSpendDay } from '../hooks/use-fleet-spend'

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
] as const

const MODE_LABEL: Record<string, string> = {
  WALLET: 'Wallet',
  CASH: 'Cash at hub',
  CREDIT: 'Swap credit',
  PLAN: 'Plan',
}

/** YYYY-MM-DD in hub time (Lagos) — the server buckets days the same way. */
function lagosDate(offsetDays = 0): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(
    new Date(nowMs() - offsetDays * 86_400_000),
  )
}

function dayLabel(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  )
}

function SpendBars({
  days,
  selected,
  onSelect,
}: {
  days: FleetSpendDay[]
  selected: string | null
  onSelect: (date: string) => void
}) {
  const max = Math.max(1, ...days.map((d) => d.total_kobo))
  return (
    <div className="flex h-36 items-end gap-[3px]" role="list" aria-label="Spend per day">
      {days.map((d) => {
        const swapH = (d.swap_fees_kobo / max) * 100
        const planH = (d.plan_fees_kobo / max) * 100
        const on = d.date === selected
        return (
          <button
            key={d.date}
            type="button"
            role="listitem"
            onClick={() => onSelect(d.date)}
            aria-label={`${dayLabel(d.date, { day: 'numeric', month: 'short' })}: ${formatNaira(d.total_kobo, { fromKobo: true })}, ${d.swaps} swaps`}
            className={`flex h-full flex-1 flex-col justify-end rounded-t-md ${
              on ? 'bg-[var(--kura-teal)]/10' : ''
            }`}
          >
            <span
              className="w-full rounded-t-sm bg-[var(--kura-amber)]"
              style={{ height: `${planH}%` }}
            />
            <span
              className={`w-full ${planH > 0 ? '' : 'rounded-t-sm'} ${
                on ? 'bg-[var(--kura-teal-bright)]' : 'bg-[var(--kura-teal)]'
              }`}
              style={{ height: `${d.swap_fees_kobo > 0 ? Math.max(swapH, 2) : 0}%` }}
            />
          </button>
        )
      })}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-3.5 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--kura-muted)]">
        {label}
      </span>
      <span className="text-[18px] font-bold tabular-nums text-[var(--kura-text)]">{value}</span>
      {sub ? <span className="text-[11px] text-[var(--kura-muted)]">{sub}</span> : null}
    </div>
  )
}

function Rows({
  title,
  rows,
}: {
  title: string
  rows: Array<{ key: string; label: string; meta: string; amountKobo: number }>
}) {
  if (rows.length === 0) return null
  const max = Math.max(1, ...rows.map((r) => r.amountKobo))
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[13px] font-bold text-[var(--kura-text)]">{title}</h3>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li
            key={r.key}
            className="rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-3.5 py-3"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[14px] font-semibold text-[var(--kura-text)]">
                {r.label}
              </span>
              <span className="text-[14px] font-bold tabular-nums text-[var(--kura-text)]">
                {formatNaira(r.amountKobo, { fromKobo: true })}
              </span>
            </div>
            <p className="mt-0.5 text-[11.5px] text-[var(--kura-muted)]">{r.meta}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--kura-border)]/50">
              <div
                className="h-full rounded-full bg-[var(--kura-teal)]"
                style={{ width: `${(r.amountKobo / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function FleetSpendScreen({ active = true }: { active?: boolean }) {
  const [days, setDays] = useState<number>(14)
  const [selected, setSelected] = useState<string | null>(null)
  const range = useMemo(
    () => ({ start_date: lagosDate(days - 1), end_date: lagosDate(0) }),
    [days],
  )
  const { spend, isPending, isError, refetch } = useFleetSpend(range, active)
  const focus = spend?.daily.find((d) => d.date === selected) ?? spend?.daily.at(-1) ?? null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-[var(--kura-text)]">Spend</h2>
        <div className="flex gap-1" role="tablist" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              role="tab"
              aria-selected={days === r.days}
              onClick={() => {
                setDays(r.days)
                setSelected(null)
              }}
              className={`rounded-lg px-2.5 py-1 text-[11.5px] font-bold ${
                days === r.days
                  ? 'bg-[var(--kura-teal)]/20 text-[var(--kura-text)]'
                  : 'text-[var(--kura-muted)]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-[var(--kura-border)]/40" />
          ))}
        </div>
      ) : isError || !spend ? (
        <div className="rounded-2xl border border-dashed border-[var(--kura-border)] px-4 py-6 text-center">
          <p className="text-[13px] text-[var(--kura-muted)]">Could not load spend.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 text-[12px] font-bold text-[var(--kura-teal-bright)]"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Stat
              label="Total paid"
              value={formatNaira(spend.totals.total_kobo, { fromKobo: true })}
              sub={`${dayLabel(spend.start_date, { day: 'numeric', month: 'short' })} – ${dayLabel(spend.end_date, { day: 'numeric', month: 'short' })}`}
            />
            <Stat
              label="Per day"
              value={formatNaira(spend.totals.avg_per_day_kobo, { fromKobo: true })}
              sub="Average"
            />
            <Stat
              label="Swaps"
              value={String(spend.totals.swaps)}
              sub={formatNaira(spend.totals.swap_fees_kobo, { fromKobo: true }) + ' in fees'}
            />
            <Stat
              label="Plans"
              value={formatNaira(spend.totals.plan_fees_kobo, { fromKobo: true })}
              sub="Plan purchases"
            />
          </div>

          <section className="rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] p-3.5">
            {spend.totals.total_kobo === 0 ? (
              <p className="py-8 text-center text-[13px] text-[var(--kura-muted)]">
                No swaps or plan payments in this range.
              </p>
            ) : (
              <>
                <SpendBars days={spend.daily} selected={focus?.date ?? null} onSelect={setSelected} />
                <div className="mt-2 flex justify-between text-[10.5px] text-[var(--kura-muted)]">
                  <span>{dayLabel(spend.start_date, { day: 'numeric', month: 'short' })}</span>
                  <span className="flex gap-3">
                    <span className="flex items-center gap-1">
                      <i className="inline-block h-2 w-2 rounded-sm bg-[var(--kura-teal)]" /> Swaps
                    </span>
                    <span className="flex items-center gap-1">
                      <i className="inline-block h-2 w-2 rounded-sm bg-[var(--kura-amber)]" /> Plans
                    </span>
                  </span>
                  <span>{dayLabel(spend.end_date, { day: 'numeric', month: 'short' })}</span>
                </div>
                {focus ? (
                  <div className="mt-3 flex items-center justify-between border-t border-[var(--kura-border-subtle)] pt-3">
                    <div>
                      <p className="text-[12px] font-semibold text-[var(--kura-text)]">
                        {dayLabel(focus.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-[11.5px] text-[var(--kura-muted)]">
                        {focus.swaps} swap{focus.swaps === 1 ? '' : 's'}
                        {focus.plan_fees_kobo > 0
                          ? ` · plans ${formatNaira(focus.plan_fees_kobo, { fromKobo: true })}`
                          : ''}
                      </p>
                    </div>
                    <span className="text-[16px] font-bold tabular-nums text-[var(--kura-text)]">
                      {formatNaira(focus.total_kobo, { fromKobo: true })}
                    </span>
                  </div>
                ) : null}
              </>
            )}
          </section>

          <Rows
            title="By vehicle"
            rows={spend.by_vehicle.map((v) => ({
              key: v.vehicle_id ?? v.plate,
              label: v.plate,
              meta:
                `${v.swaps} swap${v.swaps === 1 ? '' : 's'}` +
                (v.plan_fees_kobo > 0
                  ? ` · plans ${formatNaira(v.plan_fees_kobo, { fromKobo: true })}`
                  : ''),
              amountKobo: v.total_kobo,
            }))}
          />
          {spend.by_driver.length > 1 ? (
            <Rows
              title="By driver"
              rows={spend.by_driver.map((d) => ({
                key: d.driver_id ?? d.name,
                label: d.name,
                meta: `${d.swaps} swap${d.swaps === 1 ? '' : 's'}`,
                amountKobo: d.swap_fees_kobo,
              }))}
            />
          ) : null}
          {spend.by_payment_mode.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h3 className="text-[13px] font-bold text-[var(--kura-text)]">How swaps were paid</h3>
              <div className="flex flex-wrap gap-2">
                {spend.by_payment_mode.map((m) => (
                  <span
                    key={m.mode}
                    className="rounded-xl border border-[var(--kura-border)] px-3 py-1.5 text-[12px] text-[var(--kura-text)]"
                  >
                    {MODE_LABEL[m.mode] ?? m.mode} · {m.swaps} ·{' '}
                    {formatNaira(m.amount_kobo, { fromKobo: true })}
                  </span>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
