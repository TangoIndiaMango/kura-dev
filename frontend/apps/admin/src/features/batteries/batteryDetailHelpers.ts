import type { KuraIllustrationId } from '@shared/illustrations/catalog'
import { ADMIN_CHART_COLORS } from '@shared/components'
import type { BatteryRecord } from '@shared/mock/adminMockData'

export type BatteryAction = 'retire' | 'transfer' | 'flag' | 'found' | 'activate'

export const BATTERY_ACTION_META: Record<
  BatteryAction,
  {
    confirmTitle: string
    confirmBody: string
    confirmTone: 'primary' | 'danger'
    reasonRequired?: boolean
    illustrationId: KuraIllustrationId
    successTitle: string
    successBody: (serial: string) => string
    nextStatus?: 'FAULTED' | 'RETIRED' | 'AVAILABLE'
  }
> = {
  retire: {
    confirmTitle: 'Retire this battery?',
    confirmBody: 'It leaves rotation and is flagged for recycling pickup.',
    confirmTone: 'danger',
    reasonRequired: true,
    illustrationId: 'battery-retired',
    successTitle: 'Battery retired',
    successBody: (serial) =>
      `${serial} is out of rotation and flagged for recycling pickup.`,
    nextStatus: 'RETIRED',
  },
  transfer: {
    confirmTitle: 'Transfer battery?',
    confirmBody: 'Move this unit to another hub. Hub operators at both sites will be notified.',
    confirmTone: 'primary',
    illustrationId: 'battery-transferred',
    successTitle: 'Transferred',
    successBody: (serial) => `${serial} is assigned to the destination hub.`,
  },
  flag: {
    confirmTitle: 'Flag health issue?',
    confirmBody: 'Marks the pack FAULTED for inspection at its next hub visit.',
    confirmTone: 'primary',
    reasonRequired: true,
    illustrationId: 'health-flagged',
    successTitle: 'Health flagged',
    successBody: (serial) => `${serial} is marked FAULTED for inspection.`,
    nextStatus: 'FAULTED',
  },
  found: {
    confirmTitle: 'Mark pack found?',
    confirmBody: 'Clears LOST and returns the pack to AVAILABLE custody.',
    confirmTone: 'primary',
    reasonRequired: true,
    illustrationId: 'battery-transferred',
    successTitle: 'Pack found',
    successBody: (serial) => `${serial} is back in AVAILABLE rotation.`,
    nextStatus: 'AVAILABLE',
  },
  activate: {
    confirmTitle: 'Set battery available?',
    confirmBody: 'Clears fault status and returns the pack to ready rotation.',
    confirmTone: 'primary',
    reasonRequired: false,
    illustrationId: 'battery-transferred',
    successTitle: 'Battery active',
    successBody: (serial) => `${serial} is back in AVAILABLE rotation.`,
    nextStatus: 'AVAILABLE',
  },
}

export function commissionedLabel(battery: BatteryRecord) {
  const n = battery.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${months[n % 12]} ${2024 + (n % 3)}`
}

export function periodFactorFromRange(start?: string, end?: string) {
  if (!start || !end) return 1
  const days =
    (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000 + 1
  return Math.max(0.35, Math.min(1.4, days / 30))
}

export function sohSeries(healthPct: number, periodFactor: number) {
  const points = Math.max(6, Math.round(12 * periodFactor))
  return Array.from({ length: points }, (_, i) => {
    const t = i / Math.max(1, points - 1)
    const drift = (100 - healthPct) * t
    const wobble = Math.sin(i * 1.3) * 0.6
    return {
      label:
        points <= 8
          ? (['Wk1', 'Wk2', 'Wk3', 'Wk4', 'Wk5', 'Wk6', 'Wk7', 'Wk8'][i] ??
            `P${i + 1}`)
          : `M${i + 1}`,
      soh: Math.max(40, Math.min(100, Math.round(100 - drift + wobble))),
    }
  })
}

export const SOH_CHART_COLOR = ADMIN_CHART_COLORS.teal
