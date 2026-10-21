import type { PaymentStatsApi } from '@features/finance/hooks/use-finance'
import { formatNaira } from '@shared/utils/currency'
import { paymentChannelLabel } from './paymentDetailHelpers'
import type { CashTableRow } from './paymentsPanelShared'

const naira = (kobo: number) => formatNaira(kobo, { fromKobo: true })

/** Payments tab — period totals for hub + dates (status filter is list-only). */
export function paymentTabKpis(stats: PaymentStatsApi | null) {
  const count = stats?.success_count ?? 0
  const avg = count > 0 ? Math.round((stats?.success_kobo ?? 0) / count) : 0
  return [
    {
      title: 'Collected',
      value: stats ? naira(stats.success_kobo) : '—',
      sub: 'Successful payments',
      tone: 'success' as const,
    },
    {
      title: 'Payments',
      value: stats ? count.toLocaleString('en-NG') : '—',
      sub: count > 0 ? `Average ${naira(avg)}` : 'Successful',
    },
    {
      title: 'Pending',
      value: stats ? stats.pending_count : '—',
      sub: 'Awaiting confirmation',
      tone: ((stats?.pending_count ?? 0) > 0 ? 'warning' : 'default') as
        | 'warning'
        | 'default',
    },
    {
      title: 'Failed',
      value: stats ? stats.failed_count : '—',
      sub: 'Not collected',
      tone: ((stats?.failed_count ?? 0) > 0 ? 'danger' : 'default') as
        | 'danger'
        | 'default',
    },
  ]
}

export function cashTabKpis(cashMapped: CashTableRow[], hubScoped: boolean) {
  const drawer = (r: CashTableRow) => r.openingNaira + Math.max(0, r.collectedNaira ?? 0)
  const onDuty = cashMapped.filter((r) => r.status === 'ON_DUTY')
  const countPending = cashMapped.filter((r) => r.status === 'COUNT_PENDING')
  const needsAction = cashMapped.filter(
    (r) => r.status === 'VARIANCE' || r.status === 'COUNT_PENDING',
  ).length
  const closed = cashMapped.filter(
    (r) => r.status === 'SETTLED' || r.status === 'SHORT' || r.status === 'AWAITING_LODGE',
  ).length
  const outstanding = [...onDuty, ...countPending].reduce((s, r) => s + drawer(r), 0)
  return [
    {
      title: 'Duty windows',
      value: cashMapped.length,
      sub: hubScoped ? 'For this hub' : 'All hubs, in range',
    },
    {
      title: 'Reconciled',
      value: closed,
      sub: 'Counted and closed',
      tone: 'success' as const,
    },
    {
      title: 'Needs action',
      value: needsAction,
      sub: 'Count pending or variance',
      tone: (needsAction > 0 ? 'danger' : 'default') as 'danger' | 'default',
    },
    {
      title: 'Cash not yet counted',
      value: formatNaira(outstanding),
      sub: `${onDuty.length} on duty · ${countPending.length} awaiting count`,
      tone: (outstanding > 0 ? 'warning' : 'default') as 'warning' | 'default',
    },
  ]
}

/** Successful collections split by how they were paid, for the current scope. */
export function PaymentsMethodBreakdown({ stats }: { stats: PaymentStatsApi | null }) {
  const rows = stats?.by_channel ?? []
  const total = stats?.success_kobo ?? 0

  return (
    <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-5 shadow-[var(--sh)]">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-bold text-[var(--tx)]">By payment method</h3>
        <span className="text-[12px] text-[var(--mu)]">Share of collected</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-[13px] text-[var(--mu)]">
          {stats ? 'No successful payments in this range.' : 'Loading…'}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const pct = total > 0 ? Math.round((row.amount_kobo / total) * 100) : 0
            return (
              <li
                key={row.channel}
                className="grid grid-cols-[minmax(110px,160px)_minmax(0,1fr)_auto] items-center gap-4"
              >
                <span className="text-[13px] font-semibold text-[var(--tx)]">
                  {paymentChannelLabel(row.channel)}
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-[var(--tn)]">
                  <span
                    className="block h-full rounded-full bg-[var(--pr)]"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </span>
                <span className="whitespace-nowrap text-right text-[13px] tabular-nums">
                  <span className="font-bold text-[var(--tx)]">{naira(row.amount_kobo)}</span>
                  <span className="ml-2 text-[var(--mu)]">
                    {row.count} · {pct}%
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
