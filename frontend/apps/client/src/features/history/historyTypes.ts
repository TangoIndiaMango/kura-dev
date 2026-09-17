export type HistoryFilter = 'all' | 'swaps' | 'payments' | 'plans'

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
  receiptId?: string
  /** What tap should do when there is no payment receipt yet. */
  tapKind?: 'receipt' | 'incomplete' | 'in_progress' | 'none'
  swapStatus?: SwapHistoryStatus
  swapPayment?: SwapPaymentMode
  hubName?: string
  vehicleLabel?: string
  uiStatus?: string
}

export function matchesSwapFilter(
  item: HistoryItem,
  filter: SwapHistoryFilter,
): boolean {
  if (item.kind !== 'swaps') return false
  if (filter === 'all') return true
  if (filter === 'completed') {
    return item.swapStatus === 'completed' && Boolean(item.receiptId)
  }
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
