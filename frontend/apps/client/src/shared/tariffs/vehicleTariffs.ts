/**
 * Offline fallback tariff matrix. The server PriceMatrix is the source of
 * truth — swap prices come from each vehicle's `pay_per_swap_kobo`, and plan
 * prices from /mobility/plans/. These numbers only render while the live
 * price is unavailable. Motorcycle is the default when type is unknown.
 */
export type TariffVehicleKind = 'motorcycle' | 'tricycle' | 'boat'

export interface VehicleTariff {
  kind: TariffVehicleKind
  label: string
  payPerSwap: number
  daily: number
  weekly: number
  monthly: number
  dailySwaps: number
  weeklySwaps: number | 'unlimited'
  monthlySwaps: number | 'unlimited'
}

export const VEHICLE_TARIFFS: Record<TariffVehicleKind, VehicleTariff> = {
  motorcycle: {
    kind: 'motorcycle',
    label: 'Motorcycle',
    payPerSwap: 450,
    daily: 1200,
    weekly: 6500,
    monthly: 24000,
    dailySwaps: 2,
    weeklySwaps: 14,
    monthlySwaps: 'unlimited',
  },
  tricycle: {
    kind: 'tricycle',
    label: 'Tricycle',
    payPerSwap: 650,
    daily: 1800,
    weekly: 9500,
    monthly: 35000,
    dailySwaps: 3,
    weeklySwaps: 18,
    monthlySwaps: 'unlimited',
  },
  boat: {
    kind: 'boat',
    label: 'Boat',
    payPerSwap: 1200,
    daily: 3500,
    weekly: 18000,
    monthly: 65000,
    dailySwaps: 2,
    weeklySwaps: 12,
    monthlySwaps: 'unlimited',
  },
}

export function resolveTariffKind(raw: string | null | undefined): TariffVehicleKind {
  const s = String(raw ?? '').toLowerCase()
  if (
    s.includes('boat') ||
    s.includes('canoe') ||
    s.includes('boarder') ||
    s.includes('hull') ||
    s.includes('marine') ||
    s.includes('outboard')
  ) {
    return 'boat'
  }
  if (s.includes('tricycle') || s.includes('keke') || s.includes('tri')) {
    return 'tricycle'
  }
  return 'motorcycle'
}

export function tariffFor(raw: string | null | undefined): VehicleTariff {
  return VEHICLE_TARIFFS[resolveTariffKind(raw)]
}
