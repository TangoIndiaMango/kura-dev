import type { BatteryDetailApi, BatteryListApi } from './types'
import { sohSeries } from './batteryDetailHelpers'

const DEFAULT_RATED_CYCLES = 1500
const CELL_COUNT = 20

export type BatteryCellMv = {
  cell: string
  label: string
  mv: number
}

export type BatteryHealthAnalytics = {
  id: string
  serial: string
  healthPct: number
  chargePct: number
  cycles: number
  maxRatedCycles: number
  cells: BatteryCellMv[]
  internalResistanceMohm: number
  sohTrend: { label: string; soh: number }[]
}

function packSeed(id: string) {
  return id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
}

/**
 * 20S LiFePO4 module voltages (mV) derived from live pack SOC/SOH.
 * When OEM cell arrays arrive on telemetry.raw, prefer those via
 * `cellsFromTelemetryRaw` and fall back here.
 */
export function cellModuleSeries(input: {
  id: string
  healthPct: number
  chargePct: number
}): BatteryCellMv[] {
  const seed = packSeed(input.id)
  const base = 3180 + Math.round((Math.max(0, Math.min(100, input.chargePct)) / 100) * 440)
  const imbalance = Math.max(3, Math.round((100 - input.healthPct) * 0.4))
  return Array.from({ length: CELL_COUNT }, (_, i) => {
    const wobble = ((seed * (i + 3)) % (imbalance * 2 + 1)) - imbalance
    const mv = Math.max(3000, Math.min(3650, base + wobble))
    const label = `C${String(i + 1).padStart(2, '0')}`
    return { cell: label, label, mv }
  })
}

export function cellsFromTelemetryRaw(
  raw: Record<string, unknown> | null | undefined,
): BatteryCellMv[] | null {
  if (!raw) return null
  const vendor =
    raw.vendor && typeof raw.vendor === 'object'
      ? (raw.vendor as Record<string, unknown>)
      : raw
  const cells = vendor.cells ?? vendor.cell_mv ?? vendor.cellVoltages
  if (!Array.isArray(cells) || cells.length === 0) return null
  const mapped: BatteryCellMv[] = []
  cells.forEach((entry, i) => {
    let mv: number | null = null
    if (typeof entry === 'number') mv = entry > 50 ? entry : Math.round(entry * 1000)
    else if (entry && typeof entry === 'object') {
      const row = entry as Record<string, unknown>
      const v = row.mv ?? row.mV ?? row.voltage_mv ?? row.v
      if (typeof v === 'number') mv = v > 50 ? v : Math.round(v * 1000)
    }
    if (mv == null || !Number.isFinite(mv)) return
    const label = `C${String(i + 1).padStart(2, '0')}`
    mapped.push({ cell: label, label, mv: Math.round(mv) })
  })
  return mapped.length ? mapped : null
}

export function mapBatteryHealthAnalytics(
  battery: BatteryListApi | BatteryDetailApi,
  options?: {
    telemetryRaw?: Record<string, unknown> | null
    maxRatedCycles?: number
    periodFactor?: number
  },
): BatteryHealthAnalytics {
  const healthPct = battery.health_pct
  const chargePct = battery.charge_pct
  const cycles = battery.cycle_count
  const maxRatedCycles = options?.maxRatedCycles ?? DEFAULT_RATED_CYCLES
  const cells =
    cellsFromTelemetryRaw(options?.telemetryRaw) ??
    cellModuleSeries({
      id: battery.id,
      healthPct,
      chargePct,
    })
  const seed = packSeed(battery.id)
  const internalResistanceMohm =
    Math.round((12 + (100 - healthPct) * 0.18 + (seed % 7) * 0.1) * 10) / 10

  return {
    id: battery.id,
    serial: battery.serial,
    healthPct,
    chargePct,
    cycles,
    maxRatedCycles,
    cells,
    internalResistanceMohm,
    sohTrend: sohSeries(healthPct, options?.periodFactor ?? 1),
  }
}
