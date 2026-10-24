/** Human copy for a payment row — riders should never see raw enums. */
import { formatNaira } from './currency'

const PURPOSE: Record<string, string> = {
  SWAP: 'Battery swap',
  PLAN: 'Plan payment',
  FUND: 'Payment received',
  CREDIT_REPAY: 'Credit repayment',
}

const CHANNEL: Record<string, string> = {
  WALLET_DEBIT: 'Paid online',
  NUBAN_TRANSFER: 'Bank transfer',
  CARD: 'Card',
  AGENT_CASH: 'Cash at hub',
  CREDIT: 'Swap credit',
}

const STATUS: Record<string, string> = {
  SUCCESS: '',
  PENDING: 'Pending',
  FAILED: 'Failed',
  REVERSED: 'Reversed',
}

/**
 * Riders don't hold a balance: a FUND row is only the internal leg of a
 * Paystack payment (the swap / plan it paid for is the row they expect).
 */
export function isRiderFacing(p: { purpose?: string }) {
  return (p.purpose || '').toUpperCase() !== 'FUND'
}

export function isCredit(p: { purpose?: string; channel?: string }) {
  return (p.purpose || '').toUpperCase() === 'FUND'
}

export function paymentTitle(p: { purpose?: string; channel?: string }) {
  const key = (p.purpose || '').toUpperCase()
  return PURPOSE[key] ?? CHANNEL[(p.channel || '').toUpperCase()] ?? 'Payment'
}

export function paymentMeta(p: { channel?: string; status?: string; created_at: string }) {
  const when = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
  }).format(new Date(p.created_at))
  const via = CHANNEL[(p.channel || '').toUpperCase()]
  const status = STATUS[(p.status || '').toUpperCase()] ?? p.status ?? ''
  return [via, status, when].filter(Boolean).join(' · ')
}

/** "+₦700" for money in, "−₦450" for money out. */
export function paymentAmount(p: { purpose?: string; channel?: string; amount_kobo: number }) {
  return `${isCredit(p) ? '+' : '−'}${formatNaira(p.amount_kobo, { fromKobo: true })}`
}
