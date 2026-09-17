import type { PriceRecord } from '@shared/mock/adminMockData'
import type { PriceMatrixApi } from './types'

const VT_LABEL: Record<string, string> = {
  MOTORCYCLE: 'Motorcycle',
  TRICYCLE: 'Tricycle',
  BOAT: 'Boat',
}

const VT_API: Record<string, string> = {
  Motorcycle: 'MOTORCYCLE',
  Tricycle: 'TRICYCLE',
  Boat: 'BOAT',
  MOTORCYCLE: 'MOTORCYCLE',
  TRICYCLE: 'TRICYCLE',
  BOAT: 'BOAT',
}

export function vehicleTypeApi(label: string): string {
  return VT_API[label] ?? label.toUpperCase()
}

export function vehicleTypeLabel(api: string): string {
  return VT_LABEL[api] ?? api
}

function statusOf(status: string): PriceRecord['status'] {
  if (
    status === 'ACTIVE' ||
    status === 'PENDING' ||
    status === 'SCHEDULED' ||
    status === 'REJECTED' ||
    status === 'APPROVED' ||
    status === 'SUPERSEDED'
  ) {
    return status
  }
  return 'PENDING'
}

export function matrixApiToRecord(m: PriceMatrixApi): PriceRecord {
  return {
    id: m.id,
    vehicleType: vehicleTypeLabel(m.vehicle_type),
    daily: Math.round(m.daily_kobo / 100),
    weekly: Math.round(m.weekly_kobo / 100),
    monthly: Math.round(m.monthly_kobo / 100),
    payPerSwap: Math.round(m.pay_per_swap_kobo / 100),
    effectiveDate: new Date(m.effective_from).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    status: statusOf(m.status),
  }
}

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100)
}
