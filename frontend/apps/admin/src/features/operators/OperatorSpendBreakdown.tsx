import { formatNaira } from '@shared/utils/currency'
import { AdminBarChart, ADMIN_CHART_COLORS } from '@shared/components'
import type { AccountMoney } from './types'

type SpendRow = {
  plate?: string
  name?: string
  swaps: number
  amount_kobo: number
}

export function OperatorSpendBreakdown({
  amountKobo,
  byVehicle,
  byDriver,
  money,
}: {
  amountKobo?: number
  byVehicle?: SpendRow[]
  byDriver?: SpendRow[]
  money?: AccountMoney
}) {
  const vehicles = byVehicle ?? []
  const drivers = byDriver ?? []
  if (amountKobo == null && vehicles.length === 0 && drivers.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      {money ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Total paid', money.totals.total_kobo],
            ['Per day', money.totals.avg_per_day_kobo],
            ['Swap fees', money.totals.swap_fees_kobo],
            ['Plan fees', money.totals.plan_fees_kobo],
          ].map(([label, kobo]) => (
            <div
              key={label as string}
              className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--su)]">
                {label}
              </p>
              <p className="mt-1 text-[16px] font-bold tabular-nums text-[var(--tx)]">
                {formatNaira(kobo as number, { fromKobo: true })}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--su)]">
            Period spend
          </p>
          <p className="mt-1 text-[18px] font-bold tabular-nums text-[var(--tx)]">
            {formatNaira(amountKobo ?? 0, { fromKobo: true, showDecimals: true })}
          </p>
        </div>
      )}
      {money && money.totals.total_kobo > 0 ? (
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-2 py-3">
          <p className="mb-1 px-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--su)]">
            Paid per day (₦)
          </p>
          <AdminBarChart
            data={money.daily.map((d) => ({
              label: new Intl.DateTimeFormat('en-GB', {
                day: 'numeric',
                month: 'short',
                timeZone: 'UTC',
              }).format(new Date(`${d.date}T00:00:00Z`)),
              swaps: d.swap_fees_kobo / 100,
              plans: d.plan_fees_kobo / 100,
            }))}
            series={[
              { dataKey: 'swaps', name: 'Swap fees', color: ADMIN_CHART_COLORS.teal, stackId: 'paid' },
              { dataKey: 'plans', name: 'Plan fees', color: ADMIN_CHART_COLORS.amber, stackId: 'paid' },
            ]}
            height={200}
            showLegend
            yAxisWidth={64}
            valueFormatter={(v) => formatNaira(v)}
          />
        </div>
      ) : null}
      {vehicles.length > 0 ? (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--su)]">
            By vehicle
          </p>
          <ul className="flex flex-col gap-1">
            {vehicles.slice(0, 8).map((row) => (
              <li
                key={row.plate ?? String(row.amount_kobo)}
                className="flex items-center justify-between text-[12px] text-[var(--tx)]"
              >
                <span className="font-mono">{row.plate ?? '—'}</span>
                <span className="tabular-nums text-[var(--mu)]">
                  {row.swaps} ·{' '}
                  {formatNaira(row.amount_kobo, {
                    fromKobo: true,
                    showDecimals: true,
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {drivers.length > 0 ? (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--su)]">
            By driver
          </p>
          <ul className="flex flex-col gap-1">
            {drivers.slice(0, 8).map((row) => (
              <li
                key={row.name ?? String(row.amount_kobo)}
                className="flex items-center justify-between text-[12px] text-[var(--tx)]"
              >
                <span>{row.name ?? '—'}</span>
                <span className="tabular-nums text-[var(--mu)]">
                  {row.swaps} ·{' '}
                  {formatNaira(row.amount_kobo, {
                    fromKobo: true,
                    showDecimals: true,
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
