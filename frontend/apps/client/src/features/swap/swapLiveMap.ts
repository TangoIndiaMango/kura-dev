import type {
  DiscoverHubApi,
  LiveVehicleApi,
  ReservationApi,
} from './hooks/use-swap-live'
import type { SwapHub } from './components/FindHubStep'
import type { HubDetailData } from './components/HubDetailStep'
import type { SwapVehicle } from './components/SelectVehicleStep'
import type {
  BookingPaymentMode,
  OperatorActiveReservation,
  OperatorVehicle,
} from '../../shared/session'

export type BookableHub = SwapHub & {
  address: string
  eta: string
  chargingSlots: string
  agent: string
  acceptsCash: boolean
  batteries: HubDetailData['batteries']
}

export function apiPaymentMode(mode: BookingPaymentMode): string {
  if (mode === 'CASH_AT_HUB') return 'CASH'
  if (mode === 'PLAN') return 'PLAN'
  if (mode === 'CREDIT') return 'CREDIT'
  return 'WALLET'
}

export function uiPaymentMode(mode: string): BookingPaymentMode {
  const m = mode.toUpperCase()
  if (m === 'CASH' || m === 'CASH_AT_HUB') return 'CASH_AT_HUB'
  if (m === 'PLAN') return 'PLAN'
  if (m === 'CREDIT') return 'CREDIT'
  return 'WALLET'
}

export function mapLiveVehicles(rows: LiveVehicleApi[]): SwapVehicle[] {
  return rows.map((v) => ({
    id: v.id,
    name: `${v.make} ${v.model_name}`,
    short: v.model_name,
    reg: v.registration_plate,
    battery: v.current_battery_serial || 'No pack mounted',
    plan: 'None',
  }))
}

/** Home hero — live serial + charge + catalogue range. */
export function mapLiveVehiclesToHome(rows: LiveVehicleApi[]): OperatorVehicle[] {
  return rows.map((v) => {
    const charge = v.current_battery_charge
    const hasCharge =
      typeof charge === 'number' && !Number.isNaN(charge) && charge >= 0
    const range = v.estimated_range_km
    const hasRange =
      typeof range === 'number' && !Number.isNaN(range) && range >= 0
    return {
      id: v.id,
      name: `${v.make} ${v.model_name}`,
      short: v.model_name,
      reg: v.registration_plate,
      battery: v.current_battery_serial || 'No pack mounted',
      plan: 'None',
      socPercent: hasCharge ? charge : null,
      rangeKm: hasRange ? range : null,
      chargeObservedAt: v.current_battery_charge_at ?? null,
      chargeSource: v.current_battery_charge_source ?? null,
    }
  })
}

export function mapReservationHold(
  row: ReservationApi,
): OperatorActiveReservation {
  return {
    id: row.id,
    code: row.code,
    hubId: row.hub,
    hubName: row.hub_name,
    vehicleId: row.vehicle,
    vehicleLabel: row.vehicle_plate,
    expiresAt: new Date(row.expires_at).getTime(),
    createdAt: row.created_at
      ? new Date(row.created_at).getTime()
      : Date.now(),
    paymentMode: uiPaymentMode(row.payment_mode),
    ...(row.qr ? { qr: row.qr } : {}),
  }
}

export function mapDiscoverHubs(
  rows: DiscoverHubApi[],
  origin?: { lat: number; lng: number } | null,
): BookableHub[] {
  const withDist = rows.map((h) => {
    const tone =
      h.ui_status === 'ready' ? 'ready' : h.ui_status === 'low' ? 'low' : 'none'
    let distance = 'Distance unknown'
    let sortKm = Number.POSITIVE_INFINITY
    if (typeof h.distance_km === 'number' && Number.isFinite(h.distance_km)) {
      sortKm = h.distance_km
      distance = formatDistanceKm(h.distance_km)
    } else if (origin) {
      const km = haversineKm(origin, { lat: h.lat, lng: h.lng })
      sortKm = km
      distance = formatDistanceKm(km)
    }
    const etaMins =
      typeof h.duration_s === 'number' && h.duration_s > 0
        ? Math.max(1, Math.round(h.duration_s / 60))
        : origin && Number.isFinite(sortKm)
          ? Math.max(1, Math.round(sortKm * 4))
          : null
    return {
      id: h.id,
      name: h.name,
      distance,
      sortKm,
      hours: h.hours_label || 'Hours on request',
      ready: h.ready_count,
      status: h.ui_status,
      address: h.address,
      eta: etaMins != null ? `~${etaMins} min` : 'Enable location',
      chargingSlots: `${h.ready_count} ready packs`,
      agent: h.code,
      acceptsCash: true,
      lat: h.lat,
      lng: h.lng,
      batteries: [
        {
          label: 'Ready packs',
          ready: h.ready_count,
          tone: tone as 'none' | 'ready' | 'low',
        },
      ],
    }
  })
  withDist.sort((a, b) => a.sortKm - b.sortKm)
  return withDist.map(({ sortKm: _s, ...hub }) => hub)
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}
