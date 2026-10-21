import type { BatteryListApi } from '@features/batteries'

export function degradationHistogram(batteries: BatteryListApi[]) {
  const buckets = [
    { label: '95–100%', min: 95, max: 101, count: 0 },
    { label: '90–94%', min: 90, max: 95, count: 0 },
    { label: '80–89%', min: 80, max: 90, count: 0 },
    { label: '70–79%', min: 70, max: 80, count: 0 },
    { label: '<60%', min: 0, max: 60, count: 0 },
  ]
  for (const b of batteries) {
    const bucket = buckets.find(
      (x) => b.health_pct >= x.min && b.health_pct < x.max,
    )
    if (bucket) bucket.count += 1
  }
  return buckets.map(({ label, count }) => ({ label, count }))
}

export function byTypeRows(batteries: BatteryListApi[]) {
  const map = new Map<
    string,
    { model: string; count: number; sohSum: number; below60: number }
  >()
  for (const b of batteries) {
    const model = b.battery_type_name || 'Unknown'
    const row = map.get(model) ?? {
      model,
      count: 0,
      sohSum: 0,
      below60: 0,
    }
    row.count += 1
    row.sohSum += b.health_pct
    if (b.health_pct < 60) row.below60 += 1
    map.set(model, row)
  }
  return [...map.values()].map((r, i) => ({
    id: `t-${i}`,
    model: r.model,
    count: r.count,
    avgSoh: `${Math.round(r.sohSum / r.count)}%`,
    below60: r.below60,
  }))
}

export function batteryTone(status: string) {
  if (status === 'AVAILABLE') return 'success' as const
  if (status === 'CHARGING') return 'info' as const
  if (status === 'ISSUED') return 'neutral' as const
  if (status === 'FAULTED' || status === 'RETIRED' || status === 'LOST')
    return 'danger' as const
  return 'warning' as const
}
