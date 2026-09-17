import { formatNaira } from '@shared/utils/currency'
import { PLAN_OPTION_CHOICES } from './constants'
import type { DiscountApi, DiscountStatus } from './types'

export function formatDiscountValue(d: {
  value_type?: string
  valueType?: string
  value: number
}): string {
  const type = d.value_type ?? d.valueType
  if (type === 'PERCENT') return `${d.value}%`
  return formatNaira(d.value)
}

export function discountStatusTone(status: DiscountStatus | string) {
  if (status === 'ACTIVE') return 'success' as const
  if (
    status === 'SCHEDULED' ||
    status === 'PENDING' ||
    status === 'DRAFT' ||
    status === 'PAUSED'
  )
    return 'warning' as const
  return 'danger' as const
}

export function discountStatusLabel(status: DiscountStatus | string) {
  if (status === 'PENDING') return 'Pending sign-off'
  if (!status) return '—'
  return status.charAt(0) + status.slice(1).toLowerCase()
}

export function discountAudienceLabel(d: DiscountApi): string {
  if (d.audience === 'FLEET')
    return `Fleet · ${d.fleet_min_vehicles ?? 2}+ vehicles`
  if (d.audience === 'SEGMENT')
    return d.segment_id ? `Segment · ${d.segment_id.slice(0, 8)}…` : 'Segment'
  return 'All operators'
}

export function discountPlansLabel(d: DiscountApi): string {
  if (d.applies_to_all_plans) return 'All plans'
  if (!d.plan_option_ids?.length) return '—'
  const map = Object.fromEntries(
    PLAN_OPTION_CHOICES.map((p) => [p.value, p.label]),
  )
  return d.plan_option_ids.map((id) => map[id] ?? id).join(' · ')
}

export function discountPeriodsLabel(d: DiscountApi): string {
  const map: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    swap: 'Pay-per-swap',
  }
  return (d.periods ?? []).map((p) => map[p] ?? p).join(' · ')
}

export function formatDiscountWindow(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
) {
  const fmt = (iso: string | null | undefined) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleDateString()
    } catch {
      return iso
    }
  }
  return `${fmt(startsAt)} → ${fmt(endsAt)}`
}
