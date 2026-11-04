import type { RevenueAnalyticsSettings } from '@shared/mock/adminMockData'
import { formatNaira } from '@shared/utils/currency'

export function formatPct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return `${n.toFixed(digits)}%`
}

/** Compact ₦ for KPIs and chart axes. */
export function formatCompactNaira(amount: number): string {
  if (!Number.isFinite(amount)) return '—'
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}₦${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1_000_000) return `${sign}₦${(abs / 1e6).toFixed(1)}M`
  if (abs >= 10_000) return `${sign}₦${Math.round(abs / 1e3)}k`
  return `${sign}${formatNaira(abs)}`
}

/**
 * LTV estimate: ARPU × horizon × retention factor.
 * Configurable so finance can tune without a deploy (View E spirit).
 */
export function estimateLtv(
  arpu: number | null,
  settings: RevenueAnalyticsSettings,
): number | null {
  if (arpu === null || arpu <= 0) return null
  const factor = Math.max(0, Math.min(100, settings.ltvRetentionFactorPct)) / 100
  const months = Math.max(1, settings.ltvHorizonMonths)
  return Math.round(arpu * months * factor)
}

export function splitShareableRevenue(
  shareableTotal: number,
  settings: RevenueAnalyticsSettings,
): { latila: number; emicraft: number } {
  const latila = Math.round((shareableTotal * settings.latilaSharePct) / 100)
  const emicraft = shareableTotal - latila
  return { latila, emicraft }
}

export function sharePartnersOk(settings: RevenueAnalyticsSettings): boolean {
  return Math.round(settings.latilaSharePct + settings.emicraftSharePct) === 100
}
