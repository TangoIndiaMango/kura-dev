import type { BatteryEventApi, BatteryStatus } from './types'

export function batteryStatusTone(status: BatteryStatus) {
  if (status === 'AVAILABLE') return 'success' as const
  if (status === 'FAULTED' || status === 'RETIRED' || status === 'LOST')
    return 'danger' as const
  if (status === 'CHARGING') return 'warning' as const
  if (status === 'ISSUED') return 'info' as const
  return 'default' as const
}

export function mapCustodyRows(events: BatteryEventApi[]) {
  return events.map((e) => ({
    id: e.id,
    at: new Date(e.occurred_at).toLocaleString(),
    event: e.event,
    fromTo: `${e.from_custodian_type || '—'} → ${e.to_custodian_type || '—'}`,
    hub: e.hub_code ?? '—',
    chargePct: e.charge_pct ?? 0,
    actor: e.actor_label,
  }))
}

export type CustodyEvent = ReturnType<typeof mapCustodyRows>[number]
