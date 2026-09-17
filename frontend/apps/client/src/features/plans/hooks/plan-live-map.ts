import { formatNaira } from '../../../shared/utils/currency'
import { tariffFor, type TariffVehicleKind } from '../../../shared/tariffs/vehicleTariffs'
import type { PlanCatalogItem } from '../planCatalog'
import type { PlanApi, SubscriptionApi } from './use-operator-plans'

const PERIOD_TO_OPTION: Record<string, string> = {
  day: 'daily',
  week: 'weekly',
  month: 'monthly',
  swap: 'pps',
}

const OPTION_RANK: Record<string, number> = {
  pps: 0,
  daily: 1,
  weekly: 2,
  monthly: 3,
}

export function optionIdFromPeriod(period: string): string {
  return PERIOD_TO_OPTION[(period || '').toLowerCase()] ?? 'pps'
}

export function apiVehicleTypeFromLabel(label: string): string {
  const kind = tariffFor(label).kind
  return kind.toUpperCase()
}

export function catalogFromApiPlans(
  plans: PlanApi[],
  vehicleLabelOrType: string,
): PlanCatalogItem[] {
  const raw = (vehicleLabelOrType || '').trim()
  const vehicleType = raw.includes('_') || raw === raw.toUpperCase()
    ? raw.toUpperCase()
    : apiVehicleTypeFromLabel(raw)
  const kind = (
    vehicleType === 'TRICYCLE'
      ? 'tricycle'
      : vehicleType === 'BOAT'
        ? 'boat'
        : 'motorcycle'
  ) as TariffVehicleKind
  const matched = plans.filter(
    (p) => p.is_active && p.vehicle_type === vehicleType,
  )
  if (!matched.length) return []

  const byOption = new Map<string, PlanApi>()
  for (const p of matched) {
    const opt = optionIdFromPeriod(p.period)
    const prev = byOption.get(opt)
    if (!prev || p.price_kobo < prev.price_kobo) byOption.set(opt, p)
  }

  const order = ['pps', 'daily', 'weekly', 'monthly']
  const items: PlanCatalogItem[] = []
  for (const optId of order) {
    const p = byOption.get(optId)
    if (!p) continue
    const priceNaira = Math.round(p.price_kobo / 100)
    const swaps =
      p.swap_allowance == null ? 'Unlimited' : `Up to ${p.swap_allowance}`
    const duration =
      optId === 'pps'
        ? 'None'
        : p.duration_days
          ? `${p.duration_days} day${p.duration_days === 1 ? '' : 's'}`
          : optId
    items.push({
      id: optId,
      apiPlanId: p.id,
      name: p.name,
      detail: optId === 'pps' ? 'No commitment' : `${swaps} · ${duration}`,
      description: p.description,
      priceNaira,
      unit: optId === 'pps' ? ' / swap' : '',
      rank: OPTION_RANK[optId] ?? 0,
      swapsLabel: optId === 'pps' ? 'Per swap' : swaps,
      durationLabel: duration,
      highlights: [
        formatNaira(priceNaira) + (optId === 'pps' ? ' per swap' : ''),
        p.description || `${p.code}`,
      ].filter(Boolean),
      vehicleKind: kind,
    })
  }
  return items
}

export type LivePlanCard = {
  subscriptionId: string
  planId: string
  optionId: string
  name: string
  status: 'Active' | 'Expiring' | 'Expired'
  expiresLabel: string
  progressLabel: string
  autoRenew: boolean
  queuedPlanId: string | null
}

export function subscriptionToCard(sub: SubscriptionApi): LivePlanCard {
  const ends = new Date(sub.ends_at)
  const now = Date.now()
  const msLeft = ends.getTime() - now
  const days = Math.ceil(msLeft / 86_400_000)
  let status: LivePlanCard['status'] = 'Active'
  if (sub.status === 'EXPIRED' || sub.status === 'LAPSED_TO_PPS' || msLeft <= 0) {
    status = 'Expired'
  } else if (days <= 2) {
    status = 'Expiring'
  } else {
    status = 'Active'
  }

  const allowance =
    sub.swaps_allowance == null
      ? 'Unlimited swaps'
      : `${sub.swaps_used}/${sub.swaps_allowance} swaps`

  return {
    subscriptionId: sub.id,
    planId: sub.plan_id,
    optionId: optionIdFromPeriod(sub.plan_period),
    name: sub.plan_name,
    status,
    expiresLabel:
      status === 'Expired'
        ? 'Ended'
        : `Ends ${ends.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`,
    progressLabel:
      status === 'Expired'
        ? allowance
        : days <= 0
          ? `Ends today · ${allowance}`
          : `${days}d left · ${allowance}`,
    autoRenew: sub.auto_renew,
    queuedPlanId: sub.queued_plan_id ?? null,
  }
}

/** Matches backend entitlements: ACTIVE catalogue plan with ends_at still ahead. */
export function coveringSubscription(
  subscriptions: SubscriptionApi[],
  vehicleId: string,
  nowMs: number = Date.now(),
): SubscriptionApi | null {
  return (
    subscriptions.find((s) => {
      if (s.vehicle_id !== vehicleId || s.status !== 'ACTIVE') return false
      if (new Date(s.ends_at).getTime() <= nowMs) return false
      return optionIdFromPeriod(s.plan_period) !== 'pps'
    }) ?? null
  )
}

/** Display label for vehicle rows (Account / Home / Plans chips). */
export function planLabelForVehicle(
  subscriptions: SubscriptionApi[],
  vehicleId: string,
): string {
  return coveringSubscription(subscriptions, vehicleId)?.plan_name ?? 'Pay-per-swap'
}

export function newIdempotencyKey(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
