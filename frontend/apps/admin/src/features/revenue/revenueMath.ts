import type {
  RevenueAnalyticsSettings,
  RevenueArpuMonth,
  RevenueChannelRow,
  RevenueCollectionsSnapshot,
  RevenueMonthPoint,
  RevenueStreamRow,
  RevenueVehicleRow,
} from '@shared/mock/adminMockData'
import { formatNaira } from '@shared/utils/currency'
import type { DateRangeOutput } from '@shared/components'

export function parsePct(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const trimmed = raw.trim()
  if (!trimmed || trimmed === '—' || trimmed === '-') return null
  const n = Number(trimmed.replace(/%/g, ''))
  return Number.isFinite(n) ? n : null
}

export function formatPct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return `${n.toFixed(digits)}%`
}

/** Compact ₦ for KPIs and chart axes (mock analytics). */
export function formatCompactNaira(amount: number): string {
  if (!Number.isFinite(amount)) return '—'
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}₦${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1_000_000) return `${sign}₦${(abs / 1e6).toFixed(1)}M`
  if (abs >= 10_000) return `${sign}₦${Math.round(abs / 1e3)}k`
  return `${sign}${formatNaira(abs)}`
}

export function rangeDayCount(range: DateRangeOutput): number {
  if (!range.start_date || !range.end_date) return 30
  const days =
    (new Date(range.end_date).getTime() - new Date(range.start_date).getTime()) /
      86_400_000 +
    1
  return Math.max(1, Math.round(days))
}

/** Scale period totals by selected range length (mock stand-in for ledger query). */
export function scaleForRange(amount: number, range: DateRangeOutput, baseDays = 30): number {
  return Math.round((amount * rangeDayCount(range)) / baseDays)
}

export function sumStreams(streams: RevenueStreamRow[], onlyShareable?: boolean): number {
  return streams.reduce((n, s) => {
    if (onlyShareable && !s.shareable) return n
    return n + s.amountNaira
  }, 0)
}

export function streamSharePct(amount: number, total: number): number | null {
  if (total <= 0) return null
  return (amount / total) * 100
}

export function computeArpu(numeratorNaira: number, operators: number): number | null {
  if (operators <= 0) return null
  if (!Number.isFinite(numeratorNaira) || numeratorNaira < 0) return null
  return Math.round(numeratorNaira / operators)
}

export function arpuBasisLabel(basis: RevenueAnalyticsSettings['arpuBasis']): string {
  return basis === 'energy'
    ? 'Energy (plans + pay-per-swap) ÷ active operators'
    : 'MRR ÷ active operators'
}

export function arpuBasisShort(basis: RevenueAnalyticsSettings['arpuBasis']): string {
  return basis === 'energy' ? 'Energy ÷ operators' : 'MRR ÷ operators'
}

/** True monthly ARPU series — never gross (Finance/Data) ÷ operators. */
export function buildArpuTrend(
  months: RevenueArpuMonth[],
  basis: RevenueAnalyticsSettings['arpuBasis'],
): Array<{ label: string; arpu: number }> {
  return months.map((m) => {
    const numerator = basis === 'energy' ? m.energyNaira : m.mrrNaira
    return {
      label: m.label,
      arpu: computeArpu(numerator, m.activeOperators) ?? 0,
    }
  })
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

export function contributionMarginPct(mrr: number, cogs: number): number | null {
  if (mrr <= 0) return null
  return ((mrr - cogs) / mrr) * 100
}

export function splitShareableRevenue(
  shareableTotal: number,
  settings: RevenueAnalyticsSettings,
): { latila: number; emicraft: number } {
  const latila = Math.round((shareableTotal * settings.latilaSharePct) / 100)
  const emicraft = shareableTotal - latila
  return { latila, emicraft }
}

export function vatOnAmount(amount: number, settings: RevenueAnalyticsSettings): number {
  return Math.round((amount * settings.vatPct) / 100)
}

export function sharePartnersOk(settings: RevenueAnalyticsSettings): boolean {
  return Math.round(settings.latilaSharePct + settings.emicraftSharePct) === 100
}

export function scaleStreams(
  streams: RevenueStreamRow[],
  range: DateRangeOutput,
): RevenueStreamRow[] {
  return streams.map((s) => ({
    ...s,
    amountNaira: scaleForRange(s.amountNaira, range),
  }))
}

export function scaleChannels(
  channels: RevenueChannelRow[],
  range: DateRangeOutput,
): RevenueChannelRow[] {
  return channels.map((c) => ({
    ...c,
    amountNaira: scaleForRange(c.amountNaira, range),
    txCount: Math.max(0, Math.round(scaleForRange(c.txCount, range))),
  }))
}

export function scaleCollections(
  snap: RevenueCollectionsSnapshot,
  range: DateRangeOutput,
): RevenueCollectionsSnapshot {
  return {
    ...snap,
    outstandingNaira: scaleForRange(snap.outstandingNaira, range),
    agentCashUnreconciledNaira: scaleForRange(snap.agentCashUnreconciledNaira, range),
    mrrNaira: scaleForRange(snap.mrrNaira, range),
  }
}

/**
 * Trend charts need enough points to paint — never collapse to 2 months
 * just because the KPI date range is “this month”.
 */
export function monthsForRange(
  months: RevenueMonthPoint[],
  range: DateRangeOutput,
  options?: { minPoints?: number },
): RevenueMonthPoint[] {
  const minPoints = options?.minPoints ?? 6
  const days = rangeDayCount(range)
  let slice = months
  if (days <= 45) slice = months.slice(-2)
  else if (days <= 120) slice = months.slice(-4)
  else if (days <= 200) slice = months.slice(-6)

  if (slice.length < minPoints && months.length >= minPoints) {
    return months.slice(-minPoints)
  }
  return slice.length > 0 ? slice : months
}

export function vehicleRowsWithEconomics(
  rows: RevenueVehicleRow[],
): Array<
  RevenueVehicleRow & {
    contributionPct: number | null
    contributionNaira: number
  }
> {
  return rows.map((r) => ({
    ...r,
    contributionNaira: r.mrr - r.cogsNaira,
    contributionPct: contributionMarginPct(r.mrr, r.cogsNaira),
  }))
}
