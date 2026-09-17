import type { KuraIllustrationId } from '@shared/illustrations/catalog'
import type { HubDetailApi } from './types'
import {
  MOCK_AGENTS,
  MOCK_ALERTS,
  MOCK_BATTERIES,
  MOCK_CASH_RECON,
  MOCK_RESERVATIONS,
  MOCK_SWAPS,
  type AgentRecord,
  type AlertRecord,
  type BatteryRecord,
  type CashReconRecord,
  type HubRecord,
  type ReservationRecord,
  type SwapRecord,
} from '@shared/mock/adminMockData'
import { ADMIN_CHART_COLORS } from '@shared/components'

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

/** Station config + live telemetry not on the list row. */
export type HubStationExtras = {
  lat: number
  lng: number
  hours: string
  batteryTypes: string[]
  solarCapacityKw: number
  solarOutputKw: number
  cashOnHand: number
  swapsForecast: number
  uptime30d: string
  healthLabel: string
  faultBays: number
}

const HUB_STATION_EXTRAS: Record<string, HubStationExtras> = {
  'HUB-YBA-01': {
    lat: 6.5095,
    lng: 3.3715,
    hours: '05:00 – 23:00',
    batteryTypes: ['Spiro Moto 48V', 'Max 60V'],
    solarCapacityKw: 12.5,
    solarOutputKw: 9.8,
    cashOnHand: 84500,
    swapsForecast: 128,
    uptime30d: '99.2%',
    healthLabel: 'Healthy',
    faultBays: 1,
  },
  'HUB-IKJ-02': {
    lat: 6.6018,
    lng: 3.3515,
    hours: '05:30 – 22:30',
    batteryTypes: ['Spiro Moto 48V'],
    solarCapacityKw: 10,
    solarOutputKw: 7.4,
    cashOnHand: 61200,
    swapsForecast: 96,
    uptime30d: '98.7%',
    healthLabel: 'Healthy',
    faultBays: 0,
  },
  'HUB-OSH-03': {
    lat: 6.5536,
    lng: 3.3431,
    hours: '24 hours',
    batteryTypes: ['Spiro Moto 48V', 'Max 60V', 'Boat 72V'],
    solarCapacityKw: 18,
    solarOutputKw: 14.2,
    cashOnHand: 102400,
    swapsForecast: 160,
    uptime30d: '97.4%',
    healthLabel: 'Watch',
    faultBays: 2,
  },
  'HUB-IGB-01': {
    lat: 6.35,
    lng: 4.8,
    hours: '06:00 – 20:00',
    batteryTypes: ['Boat 72V', 'Spiro Moto 48V'],
    solarCapacityKw: 15,
    solarOutputKw: 0,
    cashOnHand: 12400,
    swapsForecast: 40,
    uptime30d: '91.0%',
    healthLabel: 'Maintenance',
    faultBays: 3,
  },
  'HUB-AJH-04': {
    lat: 6.4667,
    lng: 3.5667,
    hours: '05:00 – 22:00',
    batteryTypes: ['Spiro Moto 48V'],
    solarCapacityKw: 8.5,
    solarOutputKw: 6.1,
    cashOnHand: 38800,
    swapsForecast: 72,
    uptime30d: '99.6%',
    healthLabel: 'Healthy',
    faultBays: 0,
  },
  'HUB-M12-05': {
    lat: 6.609,
    lng: 3.395,
    hours: '05:00 – 21:00',
    batteryTypes: ['Spiro Moto 48V', 'Max 60V'],
    solarCapacityKw: 10.5,
    solarOutputKw: 0,
    cashOnHand: 0,
    swapsForecast: 80,
    uptime30d: '88.1%',
    healthLabel: 'Offline',
    faultBays: 4,
  },
}

export function stationExtrasFor(hub: HubRecord): HubStationExtras {
  return (
    HUB_STATION_EXTRAS[hub.id] ?? {
      lat: 6.5244,
      lng: 3.3792,
      hours: '05:00 – 22:00',
      batteryTypes: ['Spiro Moto 48V'],
      solarCapacityKw: Number.parseFloat(hub.solarCapacity) || 10,
      solarOutputKw: hub.status === 'ONLINE' ? 6 : 0,
      cashOnHand: 0,
      swapsForecast: Math.round(hub.swapsToday * 1.15),
      uptime30d: '—',
      healthLabel: hub.status === 'ONLINE' ? 'Healthy' : hub.status,
      faultBays: 0,
    }
  )
}

export function stationExtrasForDetail(hub: HubDetailApi): HubStationExtras {
  const code = hub.code
  return (
    HUB_STATION_EXTRAS[code] ??
    HUB_STATION_EXTRAS[hub.id] ?? {
      lat: hub.lat || 6.5244,
      lng: hub.lng || 3.3792,
      hours: '05:00 – 22:00',
      batteryTypes: ['Spiro Moto 48V', 'Max 60V'],
      solarCapacityKw: Number.parseFloat(String(hub.solar_capacity_kw)) || 10,
      solarOutputKw: hub.status === 'ONLINE' ? 7.8 : 0,
      cashOnHand: 52000,
      swapsForecast: 104,
      uptime30d: '99.2%',
      healthLabel: hub.status === 'ONLINE' ? 'Healthy' : hub.status,
      faultBays: hub.fault_count || 0,
    }
  )
}

export type HubLiveBayCounts = {
  ready: number
  charging: number
  empty: number
  fault: number
  inField: number
}

export function liveBayCounts(
  hub: HubRecord,
  batteries: BatteryRecord[],
  extras: HubStationExtras,
): HubLiveBayCounts {
  const charging = batteries.filter((b) => b.status === 'CHARGING').length
  const ready = batteries.filter((b) => b.status === 'AVAILABLE').length
  const fault = Math.max(
    extras.faultBays,
    batteries.filter((b) => b.status === 'MAINTENANCE').length,
  )
  const inField = batteries.filter((b) => b.status === 'IN_FIELD').length
  const occupied = ready + charging + fault
  const empty = Math.max(0, hub.slots - occupied)
  return {
    ready: ready || hub.readyBatteries,
    charging,
    empty,
    fault,
    inField,
  }
}

/** Real packs + synthetic bay fill. Leaves empty slots — never dump all 150 as occupied. */
export function bayFleetForHub(
  hubName: string,
  slots: number,
  ready: number,
  types: string[] = ['Spiro Moto 48V'],
): BatteryRecord[] {
  const real = MOCK_BATTERIES.filter((b) => b.location === hubName)
  const spare = Math.max(0, slots - ready)
  const chargingCap = Math.floor(spare * 0.4)
  const faultCap = Math.min(2, Math.floor(spare * 0.25))
  const occupied = Math.min(slots, Math.max(real.length, ready + chargingCap + faultCap))
  const extras: BatteryRecord[] = []
  for (let i = real.length; i < occupied; i++) {
    const available = i < ready
    const fault = !available && i >= ready + chargingCap
    const type = types[i % types.length] ?? types[0]
    extras.push({
      id: `SYN-${hubName.slice(0, 8)}-${i + 1}`,
      serial: `BAY-${String(i + 1).padStart(2, '0')}`,
      type,
      location: hubName,
      chargePct: available ? 92 + (i % 8) : fault ? 12 + (i % 20) : 20 + (i % 40),
      healthPct: fault ? 54 + (i % 10) : 88 + (i % 10),
      cycles: 40 + i * 3,
      voltage: available ? '51.0 V' : '47.2 V',
      status: available ? 'AVAILABLE' : fault ? 'MAINTENANCE' : 'CHARGING',
      lastFullCharge: available ? 'Today · 05:40' : 'Today · 04:10',
    })
  }
  return [...real, ...extras].slice(0, occupied)
}

export function swapFeedForHub(hubName: string, count: number): SwapRecord[] {
  const real = MOCK_SWAPS.filter((s) => s.hubName === hubName)
  const extras: SwapRecord[] = []
  const target = Math.min(Math.max(count, real.length), 120)
  for (let i = real.length; i < target; i++) {
    extras.push({
      id: `SYN-SW-${i}`,
      code: `KB-${4800 + i}`,
      time: `${String(6 + (i % 12)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}`,
      operatorName: real[0]?.operatorName ?? 'Operator',
      operatorPhone: real[0]?.operatorPhone ?? '',
      hubName,
      batteryIn: `KUR-BAT-${1000 + i}`,
      batteryOut: `KUR-BAT-${2000 + i}`,
      chargeIn: 12 + (i % 40),
      chargeOut: 100,
      planCovered: i % 3 !== 0,
      paymentMethod: i % 3 === 0 ? 'Wallet Debit' : 'Plan Allowance',
      amount: i % 3 === 0 ? 1200 : 0,
      status: i % 17 === 0 ? 'OVERRIDE' : 'COMPLETED',
    })
  }
  return [...real, ...extras]
}

export function agentsForHub(hubName: string, primary: string): AgentRecord[] {
  const assigned = MOCK_AGENTS.filter((a) => a.hub === hubName)
  const lead =
    assigned.find((a) => a.name === primary) ??
    assigned[0] ??
    MOCK_AGENTS.find((a) => a.name === primary)

  if (!lead) return []

  // Relief cover so overview can show +N; full roster is Agents tab.
  const relief: AgentRecord = {
    id: `AGT-RELIEF-${lead.id}`,
    name: 'Relief desk',
    phone: lead.phone,
    email: lead.email,
    hub: hubName,
    deviceId: `PAD-RELIEF-${lead.deviceId.slice(-2)}`,
    onDuty: false,
    overridesToday: 0,
    status: 'ACTIVE',
    hiredDate: lead.hiredDate,
    lastSeen: lead.lastSeen,
    inviteStatus: 'ACTIVE',
  }

  const others = assigned.filter((a) => a.id !== lead.id)
  return [lead, ...others, ...(others.length === 0 ? [relief] : [])]
}

export function reservationsForHub(hubName: string): ReservationRecord[] {
  const real = MOCK_RESERVATIONS.filter((r) => r.hubName === hubName)
  if (real.length > 0) return real
  return MOCK_RESERVATIONS.slice(0, 3).map((r, i) => ({
    ...r,
    id: `SYN-RSV-${hubName.slice(0, 6)}-${i}`,
    hubName,
  }))
}

export function cashForHub(hubName: string): CashReconRecord[] {
  return MOCK_CASH_RECON.filter((c) => c.hubName === hubName)
}

export function alertsForHub(hub: HubRecord): AlertRecord[] {
  const matched = MOCK_ALERTS.filter(
    (a) =>
      a.subject.includes(hub.id) ||
      a.title.toLowerCase().includes(hub.name.split(' ')[0].toLowerCase()) ||
      a.subject.toLowerCase().includes(hub.name.split(' ')[0].toLowerCase()),
  )
  if (matched.length > 0) return matched
  if (hub.status === 'OFFLINE') {
    return [
      {
        id: `SYN-ALT-${hub.id}`,
        raisedTime: hub.lastSync,
        title: `Hub offline — ${hub.name}`,
        subject: hub.id,
        severity: 'CRITICAL',
        delivery: 'SMS to Ops Lead',
        age: hub.lastSync,
        status: 'OPEN',
      },
    ]
  }
  return []
}

export function bayMixSlices(batteries: BatteryRecord[]) {
  const counts: Record<string, number> = { AVAILABLE: 0, CHARGING: 0, MAINTENANCE: 0, IN_FIELD: 0, RETIRED: 0 }
  for (const b of batteries) {
    if (b.status in counts) counts[b.status] = (counts[b.status] ?? 0) + 1
  }
  return [
    { name: 'Ready', value: counts.AVAILABLE ?? 0, color: ADMIN_CHART_COLORS.green },
    { name: 'Charging', value: counts.CHARGING ?? 0, color: ADMIN_CHART_COLORS.sky },
    { name: 'Service', value: counts.MAINTENANCE ?? 0, color: ADMIN_CHART_COLORS.amber },
    { name: 'In field', value: counts.IN_FIELD ?? 0, color: ADMIN_CHART_COLORS.muted },
  ].filter((s) => s.value > 0)
}

export function inventoryByType(batteries: BatteryRecord[]) {
  const map = new Map<string, { ready: number; charging: number; empty: number }>()
  for (const b of batteries) {
    const row = map.get(b.type) ?? { ready: 0, charging: 0, empty: 0 }
    if (b.status === 'AVAILABLE') row.ready += 1
    else if (b.status === 'CHARGING') row.charging += 1
    else row.empty += 1
    map.set(b.type, row)
  }
  return [...map.entries()].map(([label, v]) => ({
    label: label.replace(/ Moto| Battery/g, '').slice(0, 14),
    ready: v.ready,
    charging: v.charging,
    empty: v.empty,
  }))
}

export function swapTrendSeries(
  swapsToday: number,
  forecast: number,
  periodFactor: number,
) {
  return Array.from({ length: 7 }, (_, i) => {
    const base = swapsToday * periodFactor * (0.55 + (i % 5) * 0.12)
    return {
      label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      swaps: Math.max(4, Math.round(base)),
      forecast: Math.max(4, Math.round((forecast / 7) * periodFactor * (0.9 + (i % 3) * 0.08))),
    }
  })
}

export type BaySlotTone = 'ready' | 'charging' | 'empty' | 'fault' | 'field'

export function baySlotsFromFleet(
  batteries: BatteryRecord[],
  slots: number,
  counts: HubLiveBayCounts,
): { id: string; label: string; tone: BaySlotTone }[] {
  const list = batteries.slice(0, slots)
  while (list.length < slots) {
    list.push({
      id: `EMPTY-${list.length}`,
      serial: `—`,
      type: '',
      location: '',
      chargePct: 0,
      healthPct: 0,
      cycles: 0,
      voltage: '',
      status: 'AVAILABLE',
      lastFullCharge: '',
    })
  }
  return list.map((b, i) => {
    if (b.id.startsWith('EMPTY') || (!b.serial && !b.type)) {
      return { id: `slot-${i}`, label: String(i + 1).padStart(2, '0'), tone: 'empty' as const }
    }
    let tone: BaySlotTone = 'ready'
    if (b.status === 'CHARGING') tone = 'charging'
    else if (b.status === 'MAINTENANCE') tone = 'fault'
    else if (b.status === 'IN_FIELD') tone = 'field'
    else if (b.status === 'AVAILABLE') tone = 'ready'
    // Prefer empty count for trailing slots when fleet overstates occupancy
    if (i >= slots - counts.empty && b.status !== 'AVAILABLE' && b.status !== 'CHARGING') {
      /* keep */
    }
    return {
      id: b.id,
      label: String(i + 1).padStart(2, '0'),
      tone,
    }
  })
}
