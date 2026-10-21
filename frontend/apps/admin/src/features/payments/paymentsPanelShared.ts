import type { TableHeader } from '@shared/components'
import type { mapShiftToCashRow } from './hooks/use-cash-ops'

export const PAYMENT_HEADERS: TableHeader[] = [
  { key: 'ref', label: 'PAYMENT' },
  { key: 'account', label: 'ACCOUNT' },
  { key: 'hub', label: 'HUB' },
  { key: 'method', label: 'METHOD' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'status', label: 'STATUS' },
]

export const CASH_HEADERS: TableHeader[] = [
  { key: 'hub', label: 'HUB' },
  { key: 'agent', label: 'AGENT' },
  { key: 'expected', label: 'EXPECTED' },
  { key: 'counted', label: 'COUNTED' },
  { key: 'variance', label: 'VARIANCE' },
  { key: 'asOf', label: 'WINDOW' },
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
  { value: 'COUNT_PENDING', label: 'Count pending' },
  { value: 'VARIANCE', label: 'Needs review' },
]

export type CashTableRow = ReturnType<typeof mapShiftToCashRow>
