import type { OperatorVehicle } from '../../../shared/session'

export const LOW_SOC = 40

export function socTone(soc: number | null) {
  if (soc == null)
    // No telemetry yet — say so plainly rather than "Unknown".
    return { fill: '#8aa0a8', label: 'No reading', glow: 'rgba(138,160,168,0.35)' }
  if (soc <= 20)
    return { fill: '#e74c3c', label: 'Critical', glow: 'rgba(231,76,60,0.45)' }
  if (soc <= LOW_SOC)
    return { fill: '#f5a623', label: 'Low', glow: 'rgba(245,166,35,0.4)' }
  return { fill: '#2fbecf', label: 'Good', glow: 'rgba(47,190,207,0.35)' }
}

export function hasNoPack(vehicle: OperatorVehicle): boolean {
  return !vehicle.battery || vehicle.battery === 'No pack mounted'
}

export function needsSwapCta(vehicle: OperatorVehicle): boolean {
  if (hasNoPack(vehicle)) return true
  if (vehicle.socPercent == null) return false
  return vehicle.socPercent <= LOW_SOC
}

/** Linear catalogue range remaining before SoC hits the Low threshold. */
export function kmUntilLow(
  soc: number | null,
  rangeKm: number | null,
): number | null {
  if (soc == null || rangeKm == null || soc <= LOW_SOC || rangeKm <= 0) {
    return null
  }
  return Math.max(0, Math.round(rangeKm * (1 - LOW_SOC / soc)))
}

export function packSignalLabel(
  observedAt: string | null | undefined,
  source: string | null | undefined,
): { label: string; live: boolean } {
  if (!observedAt) {
    return { label: 'Awaiting pack', live: false }
  }
  const ageMs = Date.now() - new Date(observedAt).getTime()
  if (Number.isNaN(ageMs) || ageMs < 0) {
    return { label: 'Awaiting pack', live: false }
  }
  const mins = Math.floor(ageMs / 60_000)
  const fromTelemetry = (source ?? '').toUpperCase() === 'TELEMETRY'
  if (mins < 2) {
    return { label: fromTelemetry ? 'Live now' : 'Just updated', live: true }
  }
  if (mins < 60) {
    return { label: `${mins}m ago`, live: fromTelemetry }
  }
  const hours = Math.floor(mins / 60)
  if (hours < 24) {
    return { label: `${hours}h ago`, live: false }
  }
  return { label: `${Math.floor(hours / 24)}d ago`, live: false }
}
