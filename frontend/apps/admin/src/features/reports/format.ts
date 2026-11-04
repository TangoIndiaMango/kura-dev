import dayjs from 'dayjs'
import { formatNaira } from '@shared/utils/currency'
import type { AdminKpiTone } from '@shared/components'

export const naira = (kobo: number | null | undefined) =>
  formatNaira(kobo ?? 0, { fromKobo: true })

export const count = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('en-NG')

/** "▲ 12.4% vs 1 Sep – 30 Sep"; growth is good unless `lowerIsBetter`. */
export function delta(
  now: number | null | undefined,
  before: number | null | undefined,
  label: string,
  lowerIsBetter = false,
): { text: string; tone: AdminKpiTone } {
  if (now == null || before == null) return { text: label, tone: 'default' }
  if (before === 0) {
    return { text: now === 0 ? `No change · ${label}` : `New · ${label}`, tone: 'default' }
  }
  const pct = ((now - before) / Math.abs(before)) * 100
  if (Math.abs(pct) < 0.05) return { text: `No change · ${label}`, tone: 'default' }
  const up = pct > 0
  const good = lowerIsBetter ? !up : up
  return {
    text: `${up ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}% · ${label}`,
    tone: good ? 'success' : 'warning',
  }
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
