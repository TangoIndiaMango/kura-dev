import type { AuditEventApi } from '@features/audit'
import { downloadCsv } from '@shared/utils/downloadCsv'
import {
  accountStandingLabel,
  accountStatusLabel,
  accountStatusTone,
  kycStatusLabel,
  kycStatusTone,
  type AccountStandingCode,
  type OperatorRecord,
} from './types'

export type { OperatorAction } from './operatorActionMeta'
export { OPERATOR_ACTION_META } from './operatorActionMeta'

export type AccountStanding = 'Healthy' | 'At risk' | 'Blocked'

export type OperatorExtras = {
  accountStanding: AccountStanding
  canSwap: boolean
}

export function accountStandingTone(standing: AccountStanding | AccountStandingCode) {
  const code = standing.toUpperCase().replace(' ', '_')
  if (code === 'HEALTHY' || standing === 'Healthy') return 'success' as const
  if (code === 'AT_RISK' || standing === 'At risk') return 'warning' as const
  return 'danger' as const
}

function standingFromApi(code: string | undefined, op: OperatorRecord): AccountStanding {
  if (code === 'HEALTHY') return 'Healthy'
  if (code === 'AT_RISK') return 'At risk'
  if (code === 'BLOCKED') return 'Blocked'
  if (op.status === 'SUSPENDED' || op.status === 'DEREGISTERED') return 'Blocked'
  if (op.kycStatus === 'REJECTED') return 'Blocked'
  if (op.kycStatus !== 'VERIFIED' || op.status === 'PENDING') return 'At risk'
  return 'Healthy'
}

export function operatorExtras(
  op: OperatorRecord,
  apiStanding?: string | null,
): OperatorExtras {
  return {
    accountStanding: standingFromApi(apiStanding ?? undefined, op),
    canSwap: op.status === 'ACTIVE' && op.kycStatus === 'VERIFIED',
  }
}

export type HealthSignal = {
  id: string
  label: string
  value: string
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  hint?: string
}

export function healthSignalsFor(
  op: OperatorRecord,
  extras: OperatorExtras,
): HealthSignal[] {
  return [
    {
      id: 'account',
      label: 'Account',
      value: accountStatusLabel(op.status),
      tone: accountStatusTone(op.status),
      hint: extras.accountStanding,
    },
    {
      id: 'kyc',
      label: 'KYC',
      value: kycStatusLabel(op.kycStatus),
      tone: kycStatusTone(op.kycStatus),
    },
    {
      id: 'standing',
      label: 'Standing',
      value: extras.accountStanding,
      tone: accountStandingTone(extras.accountStanding),
      hint: 'Operational standing',
    },
    {
      id: 'swap',
      label: 'Can swap',
      value: extras.canSwap ? 'Yes' : 'No',
      tone: extras.canSwap ? 'success' : 'warning',
      hint: extras.canSwap ? 'Active + verified' : 'Needs ACTIVE + VERIFIED',
    },
  ]
}

export function swapTrendFor(_op: OperatorRecord, _extras: OperatorExtras) {
  return [] as Array<{ label: string; swaps: number }>
}

export function paymentReliabilitySeries(_extras: OperatorExtras) {
  return [] as Array<{ label: string; onTime: number }>
}

export function hubMixFor(_op: OperatorRecord) {
  return [] as Array<{ name: string; value: number; color: string }>
}

export type OperatorActivityKind = 'Swap' | 'Payment' | 'Renewal' | 'Funding' | 'System'

export type OperatorActivityRow = {
  id: string
  date: string
  kind: OperatorActivityKind
  hubOrChannel: string
  amountLabel: string
  amount: number
  status: string
  action?: string
}

export function activityRowsFromAudit(events: AuditEventApi[]): OperatorActivityRow[] {
  return events.map((e) => {
    const channel =
      typeof e.metadata?.channel === 'string'
        ? e.metadata.channel
        : e.subject_label || e.subject_type
    return {
      id: e.id,
      date: new Date(e.at).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      kind: 'System',
      hubOrChannel: channel,
      amountLabel: '—',
      amount: 0,
      status: 'Completed',
      action: e.action,
    }
  })
}

export { accountStandingLabel }

export function exportOperatorHistory(
  kuraId: string,
  name: string,
  rows: OperatorActivityRow[],
) {
  downloadCsv(
    `${kuraId}-history.csv`,
    ['date', 'action', 'channel', 'amount', 'status', 'operator'],
    rows.map((r) => [r.date, r.action ?? r.kind, r.hubOrChannel, r.amountLabel, r.status, name]),
  )
}
