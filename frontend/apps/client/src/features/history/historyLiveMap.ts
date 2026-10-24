import { formatNaira } from '../../shared/utils/currency'
import {
  isCredit,
  paymentAmount,
  paymentMeta,
  paymentTitle,
} from '../../shared/utils/paymentDisplay'
import { swapUiStatus } from '../swap/swapRecentMap'
import type { SwapListApi } from '../swap/hooks/use-swap-live'
import type { HistoryItem } from './historyTypes'

export function paymentToHistory(p: {
  id: string
  purpose: string
  channel: string
  amount_kobo: number
  status: string
  created_at: string
  receipt_code: string
}): HistoryItem {
  return {
    id: p.id,
    kind: 'payments',
    title: paymentTitle(p),
    meta: paymentMeta(p),
    amountLabel: paymentAmount(p),
    tone: isCredit(p) ? 'credit' : 'debit',
    receiptId: p.id,
    tapKind: 'receipt',
  }
}

const SWAP_MODE_LABEL: Record<string, string> = {
  WALLET: 'Paid online',
  CASH: 'Cash at hub',
  CASH_AT_HUB: 'Cash at hub',
  PLAN: 'Plan',
  CREDIT: 'Swap credit',
  PAYSTACK: 'Paystack',
}

function uiLabel(ui: string): string {
  if (ui === 'COMPLETED') return 'Completed'
  if (ui === 'IN_PROGRESS') return 'In progress'
  if (ui === 'AT_HUB') return 'At hub'
  if (ui === 'INCOMPLETE') return 'Expired hold'
  if (ui === 'FAILED') return 'Failed'
  if (ui === 'REVERSED') return 'Reversed'
  return ui
}

export function swapToHistory(s: SwapListApi): HistoryItem {
  const mode = (s.payment_mode || 'WALLET').toUpperCase()
  const swapPayment =
    mode === 'CASH' || mode === 'CASH_AT_HUB'
      ? 'CASH_AT_HUB'
      : mode === 'PLAN'
        ? 'PLAN'
        : mode === 'CREDIT'
          ? 'CREDIT'
          : mode === 'PAYSTACK'
            ? 'PAYSTACK'
            : 'WALLET'
  const ui = swapUiStatus(s)
  const amount =
    typeof s.display_amount_kobo === 'number'
      ? s.display_amount_kobo
      : s.amount_kobo
  const paymentId = s.payment_id || s.payment || undefined
  const canOpenReceipt = Boolean(paymentId) && ui === 'COMPLETED'

  const swapStatus =
    ui === 'COMPLETED'
      ? 'completed'
      : ui === 'FAILED' || ui === 'REVERSED'
        ? 'cancelled'
        : ui === 'INCOMPLETE'
          ? 'expired'
          : 'completed'

  let tapKind: HistoryItem['tapKind'] = 'none'
  if (canOpenReceipt) tapKind = 'receipt'
  else if (ui === 'INCOMPLETE' || (ui === 'FAILED' && !paymentId))
    tapKind = 'incomplete'
  else if (ui === 'IN_PROGRESS' || ui === 'AT_HUB') tapKind = 'in_progress'

  return {
    id: s.id,
    kind: 'swaps',
    title: `Swap · ${s.hub_name || 'Hub'}`,
    meta: `${s.vehicle_plate || 'Vehicle'} · ${uiLabel(ui)} · ${
      SWAP_MODE_LABEL[mode] ?? mode
    }`,
    amountLabel:
      mode === 'PLAN' && amount <= 0
        ? 'Included'
        : (ui === 'INCOMPLETE' || ui === 'FAILED') && amount <= 0
          ? formatNaira(0, { fromKobo: true })
          : formatNaira(amount, { fromKobo: true }),
    tone:
      ui === 'FAILED' || ui === 'REVERSED'
        ? 'danger'
        : mode === 'PLAN'
          ? 'plan'
          : ui === 'INCOMPLETE'
            ? 'neutral'
            : 'debit',
    receiptId: canOpenReceipt ? String(paymentId) : undefined,
    swapStatus,
    swapPayment,
    tapKind,
    hubName: s.hub_name ?? undefined,
    uiStatus: ui,
  }
}
