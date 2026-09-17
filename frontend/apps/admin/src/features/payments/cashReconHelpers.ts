/** Shift cash lifecycle — labels for ops, not ledger jargon. */

export type CashDisplayStatus =
  | 'ON_DUTY'
  | 'AWAITING_LODGE'
  | 'SETTLED'
  | 'VARIANCE'
  | 'SHORT'
  /** @deprecated Prefer ON_DUTY */
  | 'DEPOSIT_PENDING'
  /** @deprecated Prefer SETTLED / AWAITING_LODGE */
  | 'CLOSED'
  /** @deprecated Prefer SHORT */
  | 'CLOSED_SHORT'

export function shiftCashPhase(input: {
  status: string
  lodged_at?: string | null
  variance_kobo?: number | null
}): Exclude<CashDisplayStatus, 'DEPOSIT_PENDING' | 'CLOSED' | 'CLOSED_SHORT'> {
  if (input.status === 'OPEN') return 'ON_DUTY'
  const variance = input.variance_kobo ?? 0
  const flagged = Math.abs(variance) >= 10_000
  const short = variance < 0
  if (!input.lodged_at) {
    if (flagged) return 'VARIANCE'
    if (short) return 'SHORT'
    return 'AWAITING_LODGE'
  }
  if (flagged) return 'VARIANCE'
  if (short) return 'SHORT'
  return 'SETTLED'
}

export function cashStatusTone(status: CashDisplayStatus | string) {
  if (status === 'SETTLED' || status === 'CLOSED') return 'success' as const
  if (status === 'SHORT' || status === 'CLOSED_SHORT') return 'info' as const
  if (
    status === 'ON_DUTY' ||
    status === 'DEPOSIT_PENDING' ||
    status === 'AWAITING_LODGE'
  ) {
    return 'warning' as const
  }
  return 'danger' as const
}

export function cashStatusLabel(status: CashDisplayStatus | string) {
  switch (status) {
    case 'ON_DUTY':
    case 'DEPOSIT_PENDING':
      return 'On duty'
    case 'AWAITING_LODGE':
      return 'Awaiting bank lodge'
    case 'SETTLED':
    case 'CLOSED':
      return 'Settled'
    case 'VARIANCE':
      return 'Needs review'
    case 'SHORT':
    case 'CLOSED_SHORT':
      return 'Short drawer'
    default:
      return String(status)
  }
}

/** Primary CTA on list cards / tables. */
export function cashNextActionLabel(status: CashDisplayStatus | string) {
  switch (status) {
    case 'ON_DUTY':
    case 'DEPOSIT_PENDING':
      return 'Count drawer'
    case 'AWAITING_LODGE':
    case 'VARIANCE':
    case 'SHORT':
    case 'CLOSED_SHORT':
      return 'Confirm lodge'
    default:
      return 'View shift'
  }
}

export function cashPhaseHint(status: CashDisplayStatus | string) {
  switch (status) {
    case 'ON_DUTY':
    case 'DEPOSIT_PENDING':
      return 'Agent is collecting cash. End of day: count the drawer, then lodge.'
    case 'AWAITING_LODGE':
      return 'Drawer counted. Confirm the bank or PSP lodge to clear the float.'
    case 'VARIANCE':
      return 'Counted cash does not match expected. Review, then lodge.'
    case 'SHORT':
    case 'CLOSED_SHORT':
      return 'Drawer is short of expected. Lodge what was banked, then follow up.'
    case 'SETTLED':
    case 'CLOSED':
      return 'Shift closed and cash lodged.'
    default:
      return ''
  }
}
