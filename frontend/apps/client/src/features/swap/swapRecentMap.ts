import { formatNaira } from '../../shared/utils/currency'
import type { SwapRecentItem } from './components/SwapHubScreen'
import type { SwapListApi } from './hooks/use-swap-live'

function paymentModeLabel(mode: string): string {
  const m = mode.toUpperCase()
  if (m === 'PLAN') return 'Plan'
  if (m === 'CREDIT') return 'Credit'
  if (m === 'CASH' || m === 'CASH_AT_HUB') return 'Cash at hub'
  if (m === 'PAYSTACK') return 'Paystack'
  if (m === 'WALLET') return 'Paid online'
  return 'Pay as you go'
}

export function swapUiStatus(s: SwapListApi): string {
  if (s.ui_status) return s.ui_status.toUpperCase()
  const status = s.status.toUpperCase()
  if (['COMPLETED', 'FAILED', 'REVERSED'].includes(status)) return status
  const rsv = (s.reservation_status || '').toUpperCase()
  const expiredHold =
    rsv === 'EXPIRED' ||
    (Boolean(s.reservation_expires_at) &&
      new Date(s.reservation_expires_at!).getTime() <= Date.now())
  if (status === 'STARTED' && expiredHold) return 'INCOMPLETE'
  if (status === 'RETURN_RECORDED' || status === 'ISSUED') return 'AT_HUB'
  if (['STARTED', 'RETURN_RECORDED', 'ISSUED'].includes(status)) return 'IN_PROGRESS'
  return status
}

function statusLabel(ui: string): string {
  if (ui === 'COMPLETED') return 'Completed'
  if (ui === 'IN_PROGRESS') return 'In progress'
  if (ui === 'AT_HUB') return 'At hub'
  if (ui === 'INCOMPLETE') return 'Expired hold'
  if (ui === 'FAILED' || ui === 'REVERSED') {
    return ui.charAt(0) + ui.slice(1).toLowerCase()
  }
  return ui
}

export function displayAmountKobo(s: SwapListApi): number {
  if (typeof s.display_amount_kobo === 'number') {
    return s.display_amount_kobo
  }
  return typeof s.amount_kobo === 'number' ? s.amount_kobo : 0
}

export function swapPaymentId(s: SwapListApi): string | undefined {
  if (s.payment_id) return s.payment_id
  if (typeof s.payment === 'string' && s.payment) return s.payment
  return undefined
}

export function mapSwapToRecentItem(s: SwapListApi): SwapRecentItem {
  const amount = displayAmountKobo(s)
  const mode = paymentModeLabel(s.payment_mode || 'WALLET')
  const ui = swapUiStatus(s)
  const paymentId = swapPaymentId(s)
  const settled = Boolean(paymentId) && ui === 'COMPLETED'
  const inProgress = ui === 'IN_PROGRESS' || ui === 'AT_HUB'
  // Cleanup marks abandoned bay sessions FAILED — still explainable (no receipt).
  const incomplete =
    ui === 'INCOMPLETE' || (ui === 'FAILED' && !paymentId)

  let amountLabel: string
  let tone: SwapRecentItem['tone'] = 'debit'
  if (s.payment_mode?.toUpperCase() === 'PLAN') {
    amountLabel = amount > 0 ? formatNaira(amount, { fromKobo: true }) : 'Included'
    tone = 'plan'
  } else if (amount > 0) {
    amountLabel = formatNaira(amount, { fromKobo: true })
  } else if (inProgress) {
    amountLabel = 'Pending'
    tone = 'neutral'
  } else if (incomplete) {
    // Known settled-zero (not missing): dash reads as "unknown" in fintech lists.
    amountLabel = formatNaira(0, { fromKobo: true })
    tone = 'neutral'
  } else {
    amountLabel = formatNaira(0, { fromKobo: true })
  }

  const packs =
    s.returned_serial || s.issued_serial
      ? ` · ${s.returned_serial || '—'} → ${s.issued_serial || '—'}`
      : ''

  return {
    id: s.id,
    title: s.hub_name || 'Battery swap',
    meta: `${statusLabel(ui)} · ${mode} · ${new Date(s.created_at).toLocaleString()}${packs}`,
    amountLabel,
    tone,
    receiptId: settled ? paymentId : undefined,
    inProgress,
    incomplete,
    paymentMode: s.payment_mode,
    uiStatus: ui,
  }
}
