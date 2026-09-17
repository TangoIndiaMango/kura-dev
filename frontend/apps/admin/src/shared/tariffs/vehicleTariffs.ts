/**
 * Same locked matrix as client `vehicleTariffs` — admin settle / pricing stay in lockstep (PRD 4.4).
 */
export type TariffVehicleKind = 'motorcycle' | 'tricycle' | 'boat'

export interface VehicleTariff {
  kind: TariffVehicleKind
  label: string
  payPerSwap: number
  daily: number
  weekly: number
  monthly: number
}

export const VEHICLE_TARIFFS: Record<TariffVehicleKind, VehicleTariff> = {
  motorcycle: {
    kind: 'motorcycle',
    label: 'Motorcycle',
    payPerSwap: 450,
    daily: 1200,
    weekly: 6500,
    monthly: 24000,
  },
  tricycle: {
    kind: 'tricycle',
    label: 'Tricycle',
    payPerSwap: 650,
    daily: 1800,
    weekly: 9500,
    monthly: 35000,
  },
  boat: {
    kind: 'boat',
    label: 'Boat',
    payPerSwap: 1200,
    daily: 3500,
    weekly: 18000,
    monthly: 65000,
  },
}

export function resolveTariffKind(raw: string | null | undefined): TariffVehicleKind {
  const s = String(raw ?? '').toLowerCase()
  if (
    s.includes('boat') ||
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

/** @deprecated Prefer tariffFor(vehicle).payPerSwap — motorcycle default for legacy call sites. */
export const HUB_SWAP_DUE_NAIRA = VEHICLE_TARIFFS.motorcycle.payPerSwap
