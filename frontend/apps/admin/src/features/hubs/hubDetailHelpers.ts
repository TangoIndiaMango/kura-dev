import type { KuraIllustrationId } from '@shared/illustrations/catalog'
import type { HubDetailApi, HubOperatingHours } from './types'

export type HubAction = 'maintenance' | 'deactivate' | 'activate'

export const HUB_ACTION_META: Record<
  HubAction,
  {
    confirmTitle: string
    confirmBody: string
    confirmTone: 'primary' | 'danger'
    illustrationId: KuraIllustrationId
    successTitle: string
    successBody: (name: string) => string
    nextStatus: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE'
  }
> = {
  maintenance: {
    confirmTitle: 'Set hub to maintenance?',
    confirmBody: 'Operators will be rerouted. Bay telemetry stays visible to agents.',
    confirmTone: 'primary',
    illustrationId: 'hub-maintenance',
    successTitle: 'Set to maintenance',
    successBody: (name) => `${name} is hidden from operators until it is set back online.`,
    nextStatus: 'MAINTENANCE',
  },
  deactivate: {
    confirmTitle: 'Deactivate this hub?',
    confirmBody: 'The station goes offline. Map booking and swaps stop until reactivated.',
    confirmTone: 'danger',
    illustrationId: 'hub-deactivated',
    successTitle: 'Deactivated',
    successBody: (name) => `${name} is offline.`,
    nextStatus: 'OFFLINE',
  },
  activate: {
    confirmTitle: 'Bring hub online?',
    confirmBody: 'Station becomes bookable again for operators with ready inventory.',
    confirmTone: 'primary',
    illustrationId: 'confirm-action',
    successTitle: 'Online',
    successBody: (name) => `${name} is online and accepting swaps.`,
    nextStatus: 'ONLINE',
  },
}

/**
 * Station facts for the detail page — only what the backend actually knows.
 * Live inverter output and uptime need hub telemetry (parked), so they are
 * not shown rather than estimated.
 */
export type HubStationExtras = {
  lat: number
  lng: number
  hours: string
  batteryTypes: string[]
  solarCapacityKw: number
  lastSyncAt: string | null
  healthLabel: string
}

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const DAY_LABEL: Record<(typeof DAY_ORDER)[number], string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
}

/** `{"mon":[["08:00","20:00"]], …}` → "Mon–Fri 08:00–20:00 · Sat 09:00–14:00". */
export function formatOperatingHours(hours: HubOperatingHours | null | undefined): string {
  if (!hours || Object.keys(hours).length === 0) return 'Open whenever online'
  const perDay = DAY_ORDER.map((d) => {
    const spans = hours[d] ?? []
    return spans.length ? spans.map(([a, b]) => `${a}–${b}`).join(', ') : 'Closed'
  })
  if (perDay.every((v) => v === perDay[0])) return `Daily ${perDay[0]}`
  const groups: string[] = []
  let start = 0
  for (let i = 1; i <= DAY_ORDER.length; i++) {
    if (i === DAY_ORDER.length || perDay[i] !== perDay[start]) {
      const from = DAY_LABEL[DAY_ORDER[start]]
      const to = DAY_LABEL[DAY_ORDER[i - 1]]
      groups.push(`${from === to ? from : `${from}–${to}`} ${perDay[start]}`)
      start = i
    }
  }
  return groups.join(' · ')
}

const STATUS_LABEL: Record<string, string> = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  MAINTENANCE: 'Maintenance',
  CLOSED: 'Closed',
}

export function stationExtrasForDetail(hub: HubDetailApi): HubStationExtras {
  return {
    lat: hub.lat,
    lng: hub.lng,
    hours: formatOperatingHours(hub.operating_hours),
    batteryTypes: hub.battery_types ?? [],
    solarCapacityKw: Number.parseFloat(String(hub.solar_capacity_kw)) || 0,
    lastSyncAt: hub.last_sync_at ?? null,
    healthLabel: STATUS_LABEL[hub.status] ?? hub.status,
  }
}
