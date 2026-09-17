import { formatNaira } from '../../shared/utils/currency'
import {
  tariffFor,
  type TariffVehicleKind,
  type VehicleTariff,
} from '../../shared/tariffs/vehicleTariffs'

export interface PlanCatalogItem {
  id: string
  /** Live catalogue UUID when loaded from API */
  apiPlanId?: string
  name: string
  detail: string
  description?: string
  priceNaira: number
  unit: string
  /** Higher = more coverage / commitment */
  rank: number
  swapsLabel: string
  durationLabel: string
  highlights: string[]
  vehicleKind: TariffVehicleKind
}

function swapsText(n: number | 'unlimited'): string {
  return n === 'unlimited' ? 'Unlimited' : `Up to ${n}`
}

/** Build plan cards for a vehicle kind — PRD 4.4 vehicle matrix. */
export function plansForVehicle(
  kindOrLabel: string | TariffVehicleKind | null | undefined,
): PlanCatalogItem[] {
  const t = tariffFor(kindOrLabel)
  return catalogFromTariff(t)
}

function catalogFromTariff(t: VehicleTariff): PlanCatalogItem[] {
  return [
    {
      id: 'pps',
      name: 'Pay-per-swap',
      detail: 'No commitment',
      priceNaira: t.payPerSwap,
      unit: ' / swap',
      rank: 0,
      swapsLabel: 'Per swap',
      durationLabel: 'None',
      highlights: ['Pay only when you swap', 'No expiry', 'Best for rare use'],
      vehicleKind: t.kind,
    },
    {
      id: 'daily',
      name: 'Daily',
      detail: `${swapsText(t.dailySwaps)} · 24 hours`,
      priceNaira: t.daily,
      unit: '',
      rank: 1,
      swapsLabel: swapsText(t.dailySwaps),
      durationLabel: '24 hours',
      highlights: ['Short trips', 'Resets daily', 'Cheaper than PPS bursts'],
      vehicleKind: t.kind,
    },
    {
      id: 'weekly',
      name: 'Weekly',
      detail: `${swapsText(t.weeklySwaps)} · 7 days`,
      priceNaira: t.weekly,
      unit: '',
      rank: 2,
      swapsLabel: swapsText(t.weeklySwaps),
      durationLabel: '7 days',
      highlights: ['Busy weeks', 'Auto-renew available', `${t.label} tariff`],
      vehicleKind: t.kind,
    },
    {
      id: 'monthly',
      name: 'Monthly',
      detail: `${swapsText(t.monthlySwaps)} · 30 days`,
      priceNaira: t.monthly,
      unit: '',
      rank: 3,
      swapsLabel: swapsText(t.monthlySwaps),
      durationLabel: '30 days',
      highlights: ['Best value', 'Unlimited swaps', 'Auto-renew available'],
      vehicleKind: t.kind,
    },
  ]
}

/** Default catalog (motorcycle) — prefer plansForVehicle when vehicle is known. */
export const PLAN_CATALOG: PlanCatalogItem[] = plansForVehicle('motorcycle')

export type PlanChangeKind =
  | 'current'
  | 'renew'
  | 'upgrade'
  | 'downgrade'
  | 'subscribe'

export function changeKindLabel(kind: PlanChangeKind): string {
  if (kind === 'renew') return 'Renew'
  if (kind === 'upgrade') return 'Upgrade'
  if (kind === 'downgrade') return 'Downgrade'
  if (kind === 'subscribe') return 'Subscribe'
  return 'Current'
}

export function catalogById(
  id: string,
  kindOrLabel?: string | TariffVehicleKind | null,
) {
  return plansForVehicle(kindOrLabel ?? 'motorcycle').find((p) => p.id === id)
}

export function resolvePlanOptionId(planNameOrSubtitle: string): string | null {
  const raw = planNameOrSubtitle.toLowerCase()
  if (raw.includes('month')) return 'monthly'
  if (raw.includes('week')) return 'weekly'
  if (raw.includes('daily') || raw.includes('day')) return 'daily'
  if (raw.includes('pay') || raw.includes('pps') || raw.includes('none')) {
    return 'pps'
  }
  const hit = PLAN_CATALOG.find((p) => raw.includes(p.name.toLowerCase()))
  return hit?.id ?? null
}

export function getChangeKind(input: {
  currentOptionId: string | null
  targetOptionId: string
  status?: 'Active' | 'Expiring' | 'Expired'
}): PlanChangeKind {
  const { currentOptionId, targetOptionId, status } = input
  if (!currentOptionId || currentOptionId === 'pps') {
    return targetOptionId === 'pps' ? 'current' : 'subscribe'
  }
  if (currentOptionId === targetOptionId) {
    if (status === 'Expiring' || status === 'Expired') return 'renew'
    return 'current'
  }
  const current = catalogById(currentOptionId)
  const target = catalogById(targetOptionId)
  if (!current || !target) return 'subscribe'
  if (target.rank > current.rank) return 'upgrade'
  return 'downgrade'
}

export function changeConfirmCopy(input: {
  kind: PlanChangeKind
  target: PlanCatalogItem
  vehicleLabel?: string
}): { title: string; body: string; confirmLabel: string } {
  const { kind, target, vehicleLabel } = input
  const price = `${formatNaira(target.priceNaira)}${target.unit}`
  const forVehicle = vehicleLabel ? ` for ${vehicleLabel}` : ''
  if (kind === 'renew') {
    return {
      title: `Renew ${target.name}?`,
      body: `Charge ${price}${forVehicle}. Auto-renew uses the rate effective on renewal.`,
      confirmLabel: 'Confirm renew',
    }
  }
  if (kind === 'downgrade') {
    return {
      title: `Switch to ${target.name}?`,
      body: `Downgrade${forVehicle} to ${target.name}. You keep your current plan until it ends — no mid-period refund.`,
      confirmLabel: 'Queue switch',
    }
  }
  if (kind === 'upgrade') {
    return {
      title: `Upgrade to ${target.name}?`,
      body: `Starts now at ${price}${forVehicle}. Unused time on your current plan is not refunded.`,
      confirmLabel: 'Confirm upgrade',
    }
  }
  if (kind === 'subscribe') {
    return {
      title: `Start ${target.name}?`,
      body: `Subscribe${forVehicle} at ${price}.`,
      confirmLabel: 'Confirm',
    }
  }
  return {
    title: target.name,
    body: `Already on this plan${forVehicle}.`,
    confirmLabel: 'OK',
  }
}

/** @deprecated use PLAN_CATALOG / plansForVehicle */
export const PLAN_OPTIONS = PLAN_CATALOG.map((p) => ({
  id: p.id,
  name: p.name,
  detail: p.detail,
  priceNaira: p.priceNaira,
  unit: p.unit,
}))

/** Legacy re-export name used by shared/mock/operatorPlans. */
export const PLANS_MOCK = { catalog: PLAN_CATALOG }
