import { Cancel01Icon } from 'hugeicons-react'
import { formatNaira } from '@shared/utils/currency'
import type { PaymentApi } from '@features/finance'
import { paymentChannelLabel } from './paymentDetailHelpers'
import type { CashTableRow } from './paymentsPanelShared'

export function PaymentsHubScopeChip({
  label,
  onClear,
}: {
  label: string
  onClear: () => void
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3 py-2.5">
      <span className="text-[12.5px] text-[var(--mu)]">Scope</span>
      <span className="rounded-lg bg-[var(--sf)] px-2.5 py-1 text-[12.5px] font-bold text-[var(--tx)]">
        {label}
      </span>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-[var(--mu)] hover:bg-[var(--sf)] hover:text-[var(--tx)]"
      >
        <Cancel01Icon size={14} />
        All hubs
      </button>
    </div>
  )
}

export function paymentTabKpis(payments: PaymentApi[], cashOnHand: number) {
  const successSum = payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((s, p) => s + p.amount_kobo, 0)
  const pendingCount = payments.filter((p) => p.status === 'PENDING').length
  const failedCount = payments.filter((p) => p.status === 'FAILED').length
  return [
    {
      title: 'Page success total',
      value: formatNaira(successSum, { fromKobo: true }),
      sub: 'Successful on this page',
      tone: 'success' as const,
    },
    {
      title: 'Pending',
      value: pendingCount,
      sub: 'Awaiting confirm',
      tone: 'warning' as const,
    },
    {
      title: 'Failed',
      value: failedCount,
      sub: 'On this page',
      tone: (failedCount > 0 ? 'danger' : 'default') as 'danger' | 'default',
    },
    {
      title: 'Cash on hand',
      value: formatNaira(cashOnHand),
      sub: 'From open duty windows',
      tone: (cashOnHand > 0 ? 'warning' : 'default') as 'warning' | 'default',
    },
  ]
}

export function cashTabKpis(
  cashMapped: CashTableRow[],
  cashOnHand: number,
  hubScoped: boolean,
) {
  const varianceHubs = cashMapped.filter((r) => r.status === 'VARIANCE').length
  const closedCount = cashMapped.filter(
    (r) =>
      r.status === 'SETTLED' ||
      r.status === 'SHORT' ||
      r.status === 'AWAITING_LODGE',
  ).length
  return [
    {
      title: 'Hubs reporting',
      value: cashMapped.length,
      sub: hubScoped ? 'Duty windows for scoped hub' : 'In date range',
    },
    {
      title: 'Closed',
      value: closedCount,
      sub: 'Reconciled windows',
      tone: 'success' as const,
    },
    {
      title: 'Variance / review',
      value: varianceHubs,
      sub: 'Needs ops action',
      tone: (varianceHubs > 0 ? 'danger' : 'default') as 'danger' | 'default',
    },
    {
      title: 'Outstanding',
      value: formatNaira(cashOnHand),
      sub: 'Deposit pending',
      tone: 'warning' as const,
    },
  ]
}

export function channelBarData(payments: PaymentApi[]) {
  const map = new Map<string, number>()
  for (const p of payments) {
    if (p.status !== 'SUCCESS') continue
    map.set(p.channel, (map.get(p.channel) ?? 0) + p.amount_kobo)
  }
  return [...map.entries()].map(([channel, kobo]) => ({
    label: paymentChannelLabel(channel).split(' ')[0] ?? channel,
    amount: Math.round(kobo / 100_000) / 10,
  }))
}

export function cashVarianceBarData(cashMapped: CashTableRow[]) {
  return cashMapped.slice(0, 8).map((r) => ({
    label: r.hub.split('-')[1] || r.hub.slice(0, 4),
    variance: Math.abs(r.varianceNaira ?? 0) / 1000,
  }))
}
