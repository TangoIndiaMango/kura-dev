/** Map live APIs → shapes the bay panel already understands. */
import type { BatteryRecord, ReservationRecord } from '@shared/mock/adminMockData'
import type { BatteryListApi } from '@features/batteries/types'
import type { ReservationApi, ReservationLookupApi } from './hooks/use-bay-swap'
import { nowMs } from '@shared/time/serverClock'

function expiresLabel(iso: string): string {
  const ms = new Date(iso).getTime() - nowMs()
  if (!Number.isFinite(ms)) return '—'
  if (ms <= 0) return 'Expired'
  const mins = Math.ceil(ms / 60_000)
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export function mapReservationApi(r: ReservationApi): ReservationRecord & {
  accountId: string
  vehicleId: string
  driverId: string
  hubId: string
  holdAmountKobo: number
} {
  const mode = r.payment_mode === 'CASH' ? 'CASH_AT_HUB' : r.payment_mode
  const uiStatus =
    r.status === 'EXPIRED' || r.status === 'CANCELLED'
      ? r.status
      : r.status === 'USED'
        ? 'CANCELLED'
        : 'ACTIVE'
  return {
    id: r.id,
    code: r.code,
    time: new Date(r.created_at).toLocaleTimeString(),
    operatorName: r.driver_name || 'Rider',
    hubName: r.hub_name,
    vehicleReg: r.vehicle_plate,
    expiresIn: expiresLabel(r.expires_at),
    status: uiStatus as ReservationRecord['status'],
    paymentMode: (['PLAN', 'WALLET', 'CREDIT', 'CASH_AT_HUB'].includes(mode)
      ? mode
      : 'WALLET') as ReservationRecord['paymentMode'],
    accountId: r.account,
    vehicleId: r.vehicle,
    driverId: r.driver,
    hubId: r.hub,
    holdAmountKobo: r.hold_amount_kobo,
    firstSwap: false,
  }
}

/** F4 lookup envelope → hold row + first_swap / photo hints. */
export function mapLookupApi(body: ReservationLookupApi) {
  const mapped = mapReservationApi(body.reservation)
  mapped.firstSwap = body.first_swap
  mapped.operatorName = body.driver.name || mapped.operatorName
  if (body.vehicle.registration) {
    mapped.vehicleReg = body.vehicle.registration
  }
  return {
    mapped,
    triage: body.triage,
    triageReason: body.triage_reason,
    riskFlags: body.risk_flags,
    photoUrl: body.driver.photo_url,
    skipReturn: body.first_swap,
    expectedReturnSerial: body.vehicle.current_battery_serial,
  }
}

export function mapBatteryApi(b: BatteryListApi): BatteryRecord {
  let status: BatteryRecord['status'] = 'AVAILABLE'
  if (b.status === 'CHARGING') status = 'CHARGING'
  else if (b.status === 'ISSUED') status = 'IN_FIELD'
  else if (b.status === 'RETIRED') status = 'RETIRED'
  else if (b.status === 'FAULTED' || b.status === 'UNAVAILABLE' || b.status === 'LOST') {
    status = 'MAINTENANCE'
  } else if (b.status === 'AVAILABLE' || b.status === 'RESERVED' || b.status === 'RETURNED') {
    status = 'AVAILABLE'
  }
  return {
    id: b.id,
    serial: b.serial,
    type: b.battery_type_name || 'Pack',
    location: b.hub_name || b.hub_code || 'Hub',
    chargePct: b.charge_pct,
    healthPct: b.health_pct,
    cycles: b.cycle_count,
    voltage: '—',
    status,
    lastFullCharge: '—',
  }
}

export function apiPaymentMode(
  ui: ReservationRecord['paymentMode'] | string,
): 'PLAN' | 'WALLET' | 'CREDIT' | 'CASH' {
  if (ui === 'CASH_AT_HUB' || ui === 'CASH') return 'CASH'
  if (ui === 'PLAN' || ui === 'CREDIT') return ui
  return 'WALLET'
}
