import type { KuraIllustrationId } from '@shared/illustrations/catalog'
import {
  MOCK_CASH_RECON,
  MOCK_SWAPS,
  type AgentRecord,
  type CashReconRecord,
} from '@shared/mock/adminMockData'
import { formatNaira } from '@shared/utils/currency'
import { cashStatusLabel } from '../payments/cashReconHelpers'

export type AgentAction =
  | 'deactivate'
  | 'reactivate'
  | 'reset-pin'
  | 'assign-hub'
  | 'message'
  | 'export-history'
  | 'resend-invite'
  | 'wipe-device'

export const AGENT_ACTION_META: Record<
  AgentAction,
  {
    confirmTitle: string
    confirmBody: string
    confirmTone: 'primary' | 'danger'
    reasonRequired?: boolean
    reasonLabel?: string
    reasonPlaceholder?: string
    confirmLabel?: string
    illustrationId: KuraIllustrationId
    successTitle: string
    successBody: (name: string, hub: string) => string
  }
> = {
  deactivate: {
    confirmTitle: 'Deactivate agent?',
    confirmBody:
      'Ends the device session and blocks hub login until reactivation. Open shifts must be closed first in production.',
    confirmTone: 'danger',
    reasonRequired: true,
    illustrationId: 'operator-suspended',
    successTitle: 'Agent deactivated',
    successBody: (name) =>
      `${name} can no longer process swaps. Reason logged to the audit trail.`,
  },
  reactivate: {
    confirmTitle: 'Reactivate agent?',
    confirmBody: 'Restores hub login and swap processing for assigned stations.',
    confirmTone: 'primary',
    illustrationId: 'operator-reactivated',
    successTitle: 'Agent reactivated',
    successBody: (name) => `${name} can check in and process swaps again.`,
  },
  'reset-pin': {
    confirmTitle: 'Reset agent PIN?',
    confirmBody:
      'Issues a temporary PIN by SMS. The agent must enter it on the hub tablet and set a new PIN. Auto-lock stays at 5 minutes idle.',
    confirmTone: 'primary',
    illustrationId: 'pin-reset',
    successTitle: 'PIN reset',
    successBody: (name, hub) =>
      `One-time PIN sent to ${name}. Next: they open the hub tablet at ${hub}, enter the PIN, and choose a new one. Expires in 15 minutes.`,
  },
  'assign-hub': {
    confirmTitle: 'Reassign primary hub?',
    confirmBody:
      'Moves this agent’s home station. Relief hubs stay until you clear them. Device scope updates on next sync.',
    confirmTone: 'primary',
    reasonRequired: true,
    reasonLabel: 'New primary hub',
    reasonPlaceholder: 'e.g. Yaba Motor Park Mega Hub',
    confirmLabel: 'Assign hub',
    illustrationId: 'assigned-agent',
    successTitle: 'Hub assigned',
    successBody: (name) => `Primary hub updated for ${name}. Logged to audit.`,
  },
  message: {
    confirmTitle: 'Send message to agent?',
    confirmBody: 'SMS is delivered to the registered mobile. Keep it short.',
    confirmTone: 'primary',
    reasonRequired: true,
    reasonLabel: 'Message',
    reasonPlaceholder: 'e.g. Close your shift before 18:00 — variance review pending.',
    confirmLabel: 'Send SMS',
    illustrationId: 'note-added',
    successTitle: 'Message sent',
    successBody: (name) => `SMS queued to ${name}.`,
  },
  'export-history': {
    confirmTitle: 'Export agent history?',
    confirmBody:
      'Downloads swaps, overrides, cash events, and audit actions for this agent as CSV.',
    confirmTone: 'primary',
    confirmLabel: 'Export CSV',
    illustrationId: 'record-exported',
    successTitle: 'History exported',
    successBody: (name) => `Activity + audit history for ${name} was downloaded.`,
  },
  'resend-invite': {
    confirmTitle: 'Resend invite?',
    confirmBody:
      'Sends a fresh email so the agent can set their admin/hub password. Link expires in 72 hours.',
    confirmTone: 'primary',
    confirmLabel: 'Resend invite',
    illustrationId: 'pending-approval',
    successTitle: 'Invite resent',
    successBody: (name) => `Invite resent to ${name}.`,
  },
  'wipe-device': {
    confirmTitle: 'Remote wipe device?',
    confirmBody:
      'Revokes device enrolment and clears offline queues. Agent must re-enrol with an ops code.',
    confirmTone: 'danger',
    reasonRequired: true,
    confirmLabel: 'Wipe device',
    illustrationId: 'confirm-delete',
    successTitle: 'Device wiped',
    successBody: (_name, hub) =>
      `Enrolment revoked for the pad at ${hub}. Re-enrol before the next shift.`,
  },
}

export type CashStanding = 'Balanced' | 'Variance' | 'Pending' | 'No shift'

export type AgentExtras = {
  swapsToday: number
  swaps30d: number
  registrationsToday: number
  cashFloat: number
  cashCollectedToday: number
  cashDepositedToday: number
  cashVariance: number
  cashStanding: CashStanding
  pinLocked: boolean
  deviceTrusted: boolean
  shiftOpen: boolean
  shiftOpenedAt: string
  overrideRisk: 'Clear' | 'Watch' | 'Threshold'
  lastSyncLabel: string
  staffCode: string
}

export function agentExtras(a: AgentRecord): AgentExtras {
  const n = a.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const recon = cashForAgent(a)
  const cashStanding: CashStanding = recon
    ? recon.status === 'CLOSED'
      ? 'Balanced'
      : recon.status === 'CLOSED_SHORT'
        ? 'Variance'
        : recon.status === 'VARIANCE' || recon.status === 'IN_REVIEW'
          ? 'Variance'
          : 'Pending'
    : a.onDuty
      ? 'Pending'
      : 'No shift'

  return {
    swapsToday: a.onDuty ? 12 + (n % 28) : Math.max(0, 4 + (n % 8) - 4),
    swaps30d: 180 + (n % 220),
    registrationsToday: n % 5,
    cashFloat: 25_000 + (n % 40) * 1_000,
    cashCollectedToday: recon?.collected ?? (a.onDuty ? 40_000 + (n % 50) * 500 : 0),
    cashDepositedToday: recon?.deposited ?? 0,
    cashVariance: recon?.variance ?? 0,
    cashStanding,
    pinLocked: a.status === 'MAINTENANCE',
    deviceTrusted: a.status !== 'INACTIVE' && a.inviteStatus === 'ACTIVE',
    shiftOpen: a.onDuty,
    shiftOpenedAt: a.onDuty ? 'Today · 05:50' : '—',
    overrideRisk:
      a.overridesToday >= 3 ? 'Threshold' : a.overridesToday >= 1 ? 'Watch' : 'Clear',
    lastSyncLabel: a.lastSeen,
    staffCode: `STF-${a.id.replace('AGT-', '')}`,
  }
}

export function cashForAgent(a: AgentRecord): CashReconRecord | undefined {
  return MOCK_CASH_RECON.find(
    (c) => c.agentName === a.name || (c.hubName === a.hub && c.agentName.includes(a.name.split(' ')[0])),
  )
}

export function agentStatusLabel(status: AgentRecord['status']) {
  if (status === 'MAINTENANCE') return 'Device hold'
  if (status === 'INACTIVE') return 'Inactive'
  return 'Active'
}

export function agentStatusTone(status: AgentRecord['status']) {
  if (status === 'ACTIVE') return 'success' as const
  if (status === 'MAINTENANCE') return 'warning' as const
  return 'danger' as const
}

export type AgentHealthSignal = {
  id: string
  label: string
  value: string
  tone: 'success' | 'warning' | 'danger' | 'neutral'
  detail: string
}

export function healthSignalsFor(
  a: AgentRecord,
  extras: AgentExtras,
): AgentHealthSignal[] {
  return [
    {
      id: 'duty',
      label: 'Duty',
      value: a.onDuty ? 'On duty' : 'Off duty',
      tone: a.onDuty ? 'success' : 'neutral',
      detail: a.onDuty ? `Shift open · ${extras.shiftOpenedAt}` : 'No open shift',
    },
    {
      id: 'override',
      label: 'Overrides',
      value: extras.overrideRisk,
      tone:
        extras.overrideRisk === 'Threshold'
          ? 'danger'
          : extras.overrideRisk === 'Watch'
            ? 'warning'
            : 'success',
      detail: `${a.overridesToday} today · alert at ≥ 3`,
    },
    {
      id: 'cash',
      label: 'Cash',
      value: extras.cashStanding,
      tone:
        extras.cashStanding === 'Variance'
          ? 'danger'
          : extras.cashStanding === 'Pending'
            ? 'warning'
            : extras.cashStanding === 'Balanced'
              ? 'success'
              : 'neutral',
      detail:
        extras.cashStanding === 'No shift'
          ? 'No recon row for this agent today'
          : `Variance ${formatNaira(extras.cashVariance)}`,
    },
    {
      id: 'pin',
      label: 'PIN / device',
      value: extras.pinLocked
        ? 'PIN locked'
        : extras.deviceTrusted
          ? 'Trusted'
          : 'Unenrolled',
      tone: extras.pinLocked
        ? 'warning'
        : extras.deviceTrusted
          ? 'success'
          : 'danger',
      detail: `${a.deviceId} · last sync ${extras.lastSyncLabel}`,
    },
  ]
}

export type AgentOverrideRow = {
  id: string
  at: string
  swapCode: string
  reason: string
  note: string
  status: 'Flagged' | 'Reviewed' | 'Cleared'
}

export function overridesForAgent(a: AgentRecord): AgentOverrideRow[] {
  const reasons = [
    'System down',
    'Balance dispute',
    'Compassionate',
    'Discretion',
    'Plan lag',
  ]
  const n = a.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const count = Math.max(a.overridesToday, a.overridesToday === 0 ? 2 : a.overridesToday)
  return Array.from({ length: Math.min(8, count + 2) }, (_, i) => ({
    id: `ov-${a.id}-${i}`,
    at: i === 0 ? 'Today · 08:12' : i < 3 ? `Today · 0${6 + i}:${10 + i}` : `Sep ${5 - i}, 2026`,
    swapCode: `KB-${4800 + ((n + i * 7) % 900)}`,
    reason: reasons[(n + i) % reasons.length],
    note: i % 2 === 0 ? 'Operator disputed wallet debit' : 'Hub POS offline briefly',
    status:
      i === 0 && a.overridesToday >= 3
        ? 'Flagged'
        : i % 3 === 0
          ? 'Cleared'
          : 'Reviewed',
  }))
}

export type AgentActivityKind =
  | 'Swap'
  | 'Override'
  | 'Cash'
  | 'Registration'
  | 'Shift'
  | 'Audit'

export type AgentActivityRow = {
  id: string
  at: string
  kind: AgentActivityKind
  detail: string
  hubOrChannel: string
  amountLabel: string
  status: string
}

export function activityForAgent(
  a: AgentRecord,
  extras: AgentExtras,
): AgentActivityRow[] {
  const rows: AgentActivityRow[] = []
  const hubSwaps = MOCK_SWAPS.filter((s) => s.hubName === a.hub).slice(0, 5)
  for (const s of hubSwaps) {
    rows.push({
      id: `sw-${s.id}`,
      at: `Today · ${s.time}`,
      kind: s.status === 'OVERRIDE' ? 'Override' : 'Swap',
      detail: `${s.code} · ${s.operatorName}`,
      hubOrChannel: s.hubName,
      amountLabel: s.amount > 0 ? formatNaira(s.amount) : 'Plan',
      status: s.status,
    })
  }

  for (const o of overridesForAgent(a).slice(0, 4)) {
    if (rows.some((r) => r.detail.includes(o.swapCode))) continue
    rows.push({
      id: o.id,
      at: o.at,
      kind: 'Override',
      detail: `${o.swapCode} · ${o.reason}`,
      hubOrChannel: a.hub,
      amountLabel: '—',
      status: o.status.toUpperCase(),
    })
  }

  const recon = cashForAgent(a)
  if (recon) {
    rows.push({
      id: `cash-${recon.id}`,
      at: recon.asOf,
      kind: 'Cash',
      detail: `Collected ${formatNaira(recon.collected)} · deposited ${formatNaira(recon.deposited)}`,
      hubOrChannel: recon.hubName,
      amountLabel: formatNaira(recon.variance),
      status: cashStatusLabel(recon.status),
    })
  }

  if (extras.registrationsToday > 0) {
    rows.push({
      id: `reg-${a.id}`,
      at: 'Today · 09:40',
      kind: 'Registration',
      detail: `${extras.registrationsToday} provisional operator(s)`,
      hubOrChannel: a.hub,
      amountLabel: '—',
      status: 'COMPLETED',
    })
  }

  rows.push({
    id: `shift-${a.id}`,
    at: extras.shiftOpenedAt === '—' ? 'Yesterday · 18:05' : extras.shiftOpenedAt,
    kind: 'Shift',
    detail: a.onDuty ? 'Shift opened' : 'Shift closed',
    hubOrChannel: a.hub,
    amountLabel: formatNaira(extras.cashFloat),
    status: a.onDuty ? 'OPEN' : 'CLOSED',
  })

  // Audit trail events (admin actions on this staff identity)
  const audit: AgentActivityRow[] = [
    {
      id: `aud-pin-${a.id}`,
      at: 'Sep 2, 2026 · 11:20',
      kind: 'Audit',
      detail: 'PIN reset by Ops Lead',
      hubOrChannel: 'Admin console',
      amountLabel: '—',
      status: 'LOGGED',
    },
    {
      id: `aud-hub-${a.id}`,
      at: 'Aug 28, 2026 · 16:02',
      kind: 'Audit',
      detail: `Primary hub confirmed · ${a.hub}`,
      hubOrChannel: 'Admin console',
      amountLabel: '—',
      status: 'LOGGED',
    },
    {
      id: `aud-invite-${a.id}`,
      at: a.hiredDate,
      kind: 'Audit',
      detail:
        a.inviteStatus === 'PENDING'
          ? 'Invite pending · password not set'
          : 'Invite accepted · staff role Hub Agent',
      hubOrChannel: 'User management',
      amountLabel: '—',
      status: a.inviteStatus === 'PENDING' ? 'PENDING' : 'LOGGED',
    },
  ]
  if (a.status === 'INACTIVE') {
    audit.unshift({
      id: `aud-deact-${a.id}`,
      at: 'Sep 1, 2026 · 09:15',
      kind: 'Audit',
      detail: 'Deactivated · end of contract',
      hubOrChannel: 'Admin console',
      amountLabel: '—',
      status: 'LOGGED',
    })
  }

  return [...rows, ...audit]
}

export function swapTrendForAgent(extras: AgentExtras) {
  const base = Math.max(8, Math.round(extras.swaps30d / 6))
  return ['Jul 28', 'Aug 4', 'Aug 11', 'Aug 18', 'Aug 25', 'Sep 1'].map((label, i) => ({
    label,
    swaps: Math.max(4, base + ((i * 3) % 7) - 3),
  }))
}

export function overrideTrendForAgent(a: AgentRecord) {
  const n = a.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, i) => ({
    label,
    overrides: Math.max(0, ((n + i * 2) % 5) - (i === 6 ? 2 : 0)),
  }))
}

export function cashSeriesForAgent(extras: AgentExtras) {
  const base = Math.max(20_000, extras.cashCollectedToday || 45_000)
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => {
    const collected = Math.round(base * (0.7 + (i % 4) * 0.08))
    const deposited = Math.round(collected * (i === 2 ? 0.88 : 0.98))
    return { label, collected: Math.round(collected / 1000), deposited: Math.round(deposited / 1000) }
  })
}

export function overrideReasonMix(a: AgentRecord) {
  const rows = overridesForAgent(a)
  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.reason] = (acc[r.reason] ?? 0) + 1
    return acc
  }, {})
  const colors = ['#0D7C8F', '#2E7D32', '#C47D0E', '#C62828', '#5C6BC0']
  return Object.entries(counts).map(([name, value], i) => ({
    name,
    value,
    color: colors[i % colors.length],
  }))
}
