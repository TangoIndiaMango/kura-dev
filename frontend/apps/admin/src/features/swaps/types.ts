import { formatNaira } from '@shared/utils/currency'
import { nowMs } from '@shared/time/serverClock'

export type CursorPaginated<T> = {
  results: T[]
  next: string | null
  previous: string | null
}

export type SwapStatus =
  | 'STARTED'
  | 'RETURN_RECORDED'
  | 'ISSUED'
  | 'COMPLETED'
  | 'FAILED'
  | 'REVERSED'

export type SwapPaymentMode = 'PLAN' | 'PAYSTACK' | 'WALLET' | 'CREDIT' | 'CASH'

export type SwapListApi = {
  id: string
  reservation: string | null
  account: string
  vehicle: string
  vehicle_plate: string | null
  driver: string
  driver_phone: string | null
  hub: string
  hub_name: string | null
  hub_code: string | null
  agent: string | null
  returned_serial: string | null
  returned_charge_pct: number
  issued_serial: string | null
  issued_charge_pct: number
  payment_mode: SwapPaymentMode | string
  amount_kobo: number
  display_amount_kobo?: number
  vat_kobo: number
  payment: string | null
  payment_id?: string | null
  subscription: string | null
  override_id: string | null
  mismatch_flag: boolean
  mismatch_reason: string
  status: SwapStatus | string
  ui_status?: string
  reservation_status?: string
  reservation_expires_at?: string | null
  client_event_id: string
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export type SwapDetailApi = SwapListApi

export type SwapReversePayload = {
  reason: string
}

export type SwapAbortPayload = {
  reason?: string
}

export type ReservationListApi = {
  id: string
  account: string
  vehicle: string
  vehicle_plate: string
  driver: string
  driver_name: string
  hub: string
  hub_name: string
  hub_code: string
  battery: string | null
  code: string
  status: string
  payment_mode: string
  hold_amount_kobo: number
  expires_at: string
  created_at: string
}

export function swapShortCode(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

export function formatSwapWhen(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function expiresInLabel(iso: string): string {
  const ms = new Date(iso).getTime() - nowMs()
  if (!Number.isFinite(ms)) return '—'
  if (ms <= 0) return 'Expired'
  const mins = Math.ceil(ms / 60_000)
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export function reservationUiStatus(
  status: string,
  expiresAt?: string | null,
): string {
  if (status === 'EXPIRED' || status === 'CANCELLED') return status
  if (status === 'USED') return 'USED'
  if (status === 'PENDING' || status === 'CONFIRMED') {
    if (expiresAt) {
      const ms = new Date(expiresAt).getTime() - nowMs()
      if (Number.isFinite(ms) && ms <= 0) return 'EXPIRED'
    }
    return 'ACTIVE'
  }
  return status
}

export function swapDisplayAmountKobo(s: {
  amount_kobo: number
  display_amount_kobo?: number
}): number {
  if (typeof s.display_amount_kobo === 'number') {
    return s.display_amount_kobo
  }
  return s.amount_kobo ?? 0
}

export function swapAmountLabel(s: {
  amount_kobo: number
  display_amount_kobo?: number
  payment_mode?: string
  status: string
  ui_status?: string
}): string {
  if ((s.payment_mode || '').toUpperCase() === 'PLAN') return 'Plan'
  const amount = swapDisplayAmountKobo(s)
  return formatNaira(amount, { fromKobo: true })
}

export function swapUiLabel(s: {
  status: string
  ui_status?: string
}): string {
  const ui = (s.ui_status || s.status || '').toUpperCase()
  if (ui === 'IN_PROGRESS') return 'In progress'
  if (ui === 'AT_HUB') return 'At hub'
  if (ui === 'INCOMPLETE') return 'Expired hold'
  if (ui === 'COMPLETED') return 'Completed'
  if (ui === 'FAILED') return 'Failed'
  if (ui === 'REVERSED') return 'Reversed'
  if (ui === 'STARTED') return 'Started'
  if (ui === 'RETURN_RECORDED') return 'Return recorded'
  if (ui === 'ISSUED') return 'Issued'
  return s.status
}

