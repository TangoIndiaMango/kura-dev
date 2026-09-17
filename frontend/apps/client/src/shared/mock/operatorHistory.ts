export type HistoryFilter = 'all' | 'swaps' | 'payments' | 'plans'

/** Sub-filters when History is opened as swap history (from Swaps → See all). */
export type SwapHistoryFilter =
  | 'all'
  | 'completed'
  | 'cancelled'
  | 'plan'
  | 'wallet'
  | 'cash'

export type SwapHistoryStatus = 'completed' | 'cancelled' | 'expired'

export type SwapPaymentMode = 'PLAN' | 'WALLET' | 'CREDIT' | 'CASH_AT_HUB'

export interface HistoryItem {
  id: string
  title: string
  meta: string
  amountLabel: string
  tone: 'credit' | 'debit' | 'neutral' | 'danger' | 'plan'
  kind: Exclude<HistoryFilter, 'all'>
  receiptId: string
  /** Present on swap rows for swap-history filters */
  swapStatus?: SwapHistoryStatus
  swapPayment?: SwapPaymentMode
  hubName?: string
  vehicleLabel?: string
}

export const HISTORY_MOCK = {
  summary: 'This month 24 swaps · ₦11,000 paid',
  /** Period-scoped only — never expose all-time aggregates on client. */
  periods: [
    {
      id: '2026-09',
      label: 'Sep 2026',
      year: 2026,
      month: 9,
      swaps: 24,
      paidLabel: '₦11,000',
    },
    {
      id: '2026-08',
      label: 'Aug 2026',
      year: 2026,
      month: 8,
      swaps: 31,
      paidLabel: '₦14,500',
    },
    {
      id: '2026-07',
      label: 'Jul 2026',
      year: 2026,
      month: 7,
      swaps: 28,
      paidLabel: '₦12,000',
    },
    {
      id: '2025-12',
      label: 'Dec 2025',
      year: 2025,
      month: 12,
      swaps: 19,
      paidLabel: '₦9,000',
    },
  ],
  pageSize: 5,
  items: [
    {
      id: 'h1',
      title: 'Battery swap',
      meta: 'Yaba Motor Park · E-Moto · 07:02',
      amountLabel: 'Plan',
      tone: 'plan' as const,
      kind: 'swaps' as const,
      receiptId: 'rc-swap-1',
      swapStatus: 'completed' as const,
      swapPayment: 'PLAN' as const,
      hubName: 'Yaba Motor Park',
      vehicleLabel: 'E-Moto',
    },
    {
      id: 'h2',
      title: 'Wallet funded',
      meta: 'Transfer · Sep 3',
      amountLabel: '+₦10,000',
      tone: 'credit' as const,
      kind: 'payments' as const,
      receiptId: 'rc-funded-1',
    },
    {
      id: 'h3',
      title: 'Loan repayment',
      meta: 'Auto-debit · Sep 3',
      amountLabel: '−₦1,000',
      tone: 'debit' as const,
      kind: 'payments' as const,
      receiptId: 'rc-loan-1',
    },
    {
      id: 'h4',
      title: 'Battery swap',
      meta: 'Igbokoda Waterfront · E-Boarder · Sep 2',
      amountLabel: 'Plan',
      tone: 'plan' as const,
      kind: 'swaps' as const,
      receiptId: 'rc-swap-2',
      swapStatus: 'completed' as const,
      swapPayment: 'PLAN' as const,
      hubName: 'Igbokoda Waterfront',
      vehicleLabel: 'E-Boarder',
    },
    {
      id: 'h5',
      title: 'Plan renewal',
      meta: 'Monthly · E-Moto · Aug 29',
      amountLabel: '−₦45,000',
      tone: 'debit' as const,
      kind: 'plans' as const,
      receiptId: 'rc-plan-1',
    },
    {
      id: 'h6',
      title: 'Payment declined',
      meta: 'Wallet debit · Aug 27',
      amountLabel: '₦1,200',
      tone: 'danger' as const,
      kind: 'payments' as const,
      receiptId: 'rc-declined-1',
    },
    {
      id: 'h7',
      title: 'Battery swap',
      meta: 'Ikeja Along · E-Moto · Aug 26',
      amountLabel: 'Plan',
      tone: 'plan' as const,
      kind: 'swaps' as const,
      receiptId: 'rc-swap-1',
      swapStatus: 'completed' as const,
      swapPayment: 'PLAN' as const,
      hubName: 'Ikeja Along',
      vehicleLabel: 'E-Moto',
    },
    {
      id: 'h8',
      title: 'Battery swap',
      meta: 'Oshodi Terminal · E-Moto · Aug 24',
      amountLabel: '₦1,500',
      tone: 'debit' as const,
      kind: 'swaps' as const,
      receiptId: 'rc-swap-2',
      swapStatus: 'completed' as const,
      swapPayment: 'WALLET' as const,
      hubName: 'Oshodi Terminal',
      vehicleLabel: 'E-Moto',
    },
    {
      id: 'h9',
      title: 'Hold expired',
      meta: 'Yaba Motor Park · E-Moto · Aug 22',
      amountLabel: 'No charge',
      tone: 'neutral' as const,
      kind: 'swaps' as const,
      receiptId: 'rc-swap-1',
      swapStatus: 'expired' as const,
      swapPayment: 'PLAN' as const,
      hubName: 'Yaba Motor Park',
      vehicleLabel: 'E-Moto',
    },
    {
      id: 'h10',
      title: 'Wallet funded',
      meta: 'USSD · Aug 20',
      amountLabel: '+₦5,000',
      tone: 'credit' as const,
      kind: 'payments' as const,
      receiptId: 'rc-funded-1',
    },
    {
      id: 'h11',
      title: 'Battery swap',
      meta: 'Ikeja Along · E-Boarder · Aug 18',
      amountLabel: 'Cash',
      tone: 'debit' as const,
      kind: 'swaps' as const,
      receiptId: 'rc-swap-2',
      swapStatus: 'completed' as const,
      swapPayment: 'CASH_AT_HUB' as const,
      hubName: 'Ikeja Along',
      vehicleLabel: 'E-Boarder',
    },
    {
      id: 'h12',
      title: 'Swap cancelled',
      meta: 'Oshodi Terminal · E-Moto · Aug 16',
      amountLabel: 'Refunded',
      tone: 'neutral' as const,
      kind: 'swaps' as const,
      receiptId: 'rc-swap-1',
      swapStatus: 'cancelled' as const,
      swapPayment: 'WALLET' as const,
      hubName: 'Oshodi Terminal',
      vehicleLabel: 'E-Moto',
    },
    {
      id: 'h13',
      title: 'Battery swap',
      meta: 'Yaba Motor Park · E-Moto · Aug 14',
      amountLabel: 'Credit',
      tone: 'debit' as const,
      kind: 'swaps' as const,
      receiptId: 'rc-swap-2',
      swapStatus: 'completed' as const,
      swapPayment: 'CREDIT' as const,
      hubName: 'Yaba Motor Park',
      vehicleLabel: 'E-Moto',
    },
  ] satisfies HistoryItem[],
}

export function matchesSwapFilter(
  item: HistoryItem,
  filter: SwapHistoryFilter,
): boolean {
  if (item.kind !== 'swaps') return false
  if (filter === 'all') return true
  if (filter === 'completed') return item.swapStatus === 'completed'
  if (filter === 'cancelled') {
    return item.swapStatus === 'cancelled' || item.swapStatus === 'expired'
  }
  if (filter === 'plan') return item.swapPayment === 'PLAN'
  if (filter === 'wallet') {
    return item.swapPayment === 'WALLET' || item.swapPayment === 'CREDIT'
  }
  if (filter === 'cash') return item.swapPayment === 'CASH_AT_HUB'
  return true
}
