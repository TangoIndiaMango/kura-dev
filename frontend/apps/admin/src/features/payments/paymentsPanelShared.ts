import type { TableHeader } from '@shared/components'
import type { mapShiftToCashRow } from './hooks/use-cash-ops'

export const PAYMENT_HEADERS: TableHeader[] = [
  { key: 'ref', label: 'REFERENCE' },
  { key: 'date', label: 'DATE & TIME' },
  { key: 'account', label: 'ACCOUNT' },
  { key: 'channel', label: 'CHANNEL' },
  { key: 'purpose', label: 'PURPOSE' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'status', label: 'STATUS' },
]

export const CASH_HEADERS: TableHeader[] = [
  { key: 'hub', label: 'HUB' },
  { key: 'agent', label: 'AGENT' },
  { key: 'collected', label: 'COLLECTED' },
  { key: 'deposited', label: 'DEPOSITED' },
  { key: 'variance', label: 'VARIANCE' },
  { key: 'asOf', label: 'AS OF' },
  { key: 'status', label: 'STATUS' },
]

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'SUCCESS', label: 'Successful' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REVERSED', label: 'Reversed' },
]

export const CASH_STATUS_OPTIONS = [
  { value: 'ON_DUTY', label: 'On duty' },
  { value: 'AWAITING_LODGE', label: 'Awaiting bank lodge' },
  { value: 'SETTLED', label: 'Settled' },
  { value: 'SHORT', label: 'Short drawer' },
  { value: 'VARIANCE', label: 'Needs review' },
]

export const CHANNEL_OPTIONS = [
  { value: 'NUBAN_TRANSFER', label: 'NUBAN transfer' },
  { value: 'WALLET_DEBIT', label: 'Wallet debit' },
  { value: 'AGENT_CASH', label: 'Cash at hub' },
  { value: 'CARD', label: 'Card' },
  { value: 'CREDIT', label: 'Credit' },
]

/** Stable reference — inline arrays thrash filter memo and reset cursor pagination. */
export const PAYMENTS_EXTRA_FILTER_FIELDS = [
  {
    type: 'select' as const,
    key: 'channel',
    label: 'Channel',
    placeholder: 'Any',
    options: CHANNEL_OPTIONS,
  },
]

export type CashTableRow = ReturnType<typeof mapShiftToCashRow>

export function readFilter(
  values: Record<string, unknown>,
  key: string,
): string | undefined {
  const raw =
    key in values
      ? values[key]
      : Object.entries(values).find(
          ([k]) => k === key || k.endsWith(`_${key}`),
        )?.[1]
  if (raw == null || raw === '' || raw === 'all') return undefined
  if (Array.isArray(raw)) return raw.length ? String(raw[0]) : undefined
  return String(raw)
}
