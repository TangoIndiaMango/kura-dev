import dayjs from 'dayjs'
import { formatNaira } from '@shared/utils/currency'
import type { AdminKpiTone } from '@shared/components'

export const naira = (kobo: number | null | undefined) =>
  formatNaira(kobo ?? 0, { fromKobo: true })

/** ₦135.7M / ₦48k for tiles; the exact amount goes in a tooltip. */
export function nairaShort(kobo: number | null | undefined): string {
  const n = (kobo ?? 0) / 100
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e9) return `${sign}₦${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${sign}₦${(abs / 1e6).toFixed(1)}M`
  if (abs >= 1e5) return `${sign}₦${Math.round(abs / 1e3)}k`
  return naira(kobo)
}

export const count = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('en-NG')

/** "▲ 12.4%" (with " · label" when given); growth is good unless `lowerIsBetter`. */
export function delta(
  now: number | null | undefined,
  before: number | null | undefined,
  label = '',
  lowerIsBetter = false,
): { text: string; tone: AdminKpiTone } {
  const tail = label ? ` · ${label}` : ''
  if (now == null || before == null) return { text: label, tone: 'default' }
  if (before === 0) {
    return { text: (now === 0 ? 'No change' : 'New') + tail, tone: 'default' }
  }
  const pct = ((now - before) / Math.abs(before)) * 100
  if (Math.abs(pct) < 0.05) return { text: 'No change' + tail, tone: 'default' }
  const up = pct > 0
  const good = lowerIsBetter ? !up : up
  return {
    text: `${up ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%${tail}`,
    tone: good ? 'success' : 'warning',
  }
}

/** 3.2k / 1.4M for chart axes. */
export function shortNumber(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `${(n / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}k`
  return String(Math.round(n))
}

export function rangeLabel(r: { start_date: string; end_date: string }) {
  const a = dayjs(r.start_date)
  const b = dayjs(r.end_date)
  return a.isSame(b, 'day')
    ? a.format('D MMM YYYY')
    : `${a.format(a.year() === b.year() ? 'D MMM' : 'D MMM YYYY')} – ${b.format('D MMM YYYY')}`
}

/** Payment purposes and channels as people say them. */
const WORDS: Record<string, string> = {
  SWAP: 'Swaps',
  PLAN: 'Plans',
  FUND: 'Wallet funding',
  RESERVATION: 'Bay reservations',
  SERVICE: 'Service',
  INVITE: 'Invites',
  WALLET_TOPUP: 'Wallet top-up',
  LOAN_REPAY: 'Loan repayments',
  CARD: 'Card',
  NUBAN_TRANSFER: 'Bank transfer',
  BANK_TRANSFER: 'Bank transfer',
  AGENT_CASH: 'Cash at hub',
  WALLET_DEBIT: 'Wallet',
  USSD: 'USSD',
}

export const words = (code: string) =>
  WORDS[code] ?? (code ? code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, ' ') : 'Other')
