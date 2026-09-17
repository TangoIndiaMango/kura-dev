import type { TableHeader } from '@shared/components'
import type { PlanRecord, PriceRecord } from '@shared/mock/adminMockData'

export const PRICE_HEADERS: TableHeader[] = [
  { key: 'vtype', label: 'VEHICLE TYPE' },
  { key: 'daily', label: 'DAILY' },
  { key: 'weekly', label: 'WEEKLY' },
  { key: 'monthly', label: 'MONTHLY' },
  { key: 'pps', label: 'PAY-PER-SWAP' },
  { key: 'eff', label: 'EFFECTIVE' },
  { key: 'status', label: 'STATUS' },
]

export const PLAN_HEADERS: TableHeader[] = [
  { key: 'name', label: 'PLAN NAME' },
  { key: 'vt', label: 'VEHICLE' },
  { key: 'price', label: 'PRICE' },
  { key: 'duration', label: 'DURATION' },
  { key: 'created', label: 'DATE CREATED' },
  { key: 'status', label: 'STATUS' },
]

export const PRICE_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING', label: 'Pending sign-off' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'SUPERSEDED', label: 'Superseded' },
  { value: 'REJECTED', label: 'Rejected' },
]

export const PLAN_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DEACTIVATED', label: 'Deactivated' },
  { value: 'PENDING', label: 'Pending sign-off' },
]

export function priceTone(status: PriceRecord['status']) {
  if (status === 'ACTIVE' || status === 'APPROVED') return 'success' as const
  if (status === 'PENDING' || status === 'SCHEDULED') return 'warning' as const
  if (status === 'SUPERSEDED') return 'neutral' as const
  return 'danger' as const
}

export function planTone(status: PlanRecord['status']) {
  if (status === 'ACTIVE') return 'success' as const
  if (status === 'PENDING') return 'warning' as const
  return 'danger' as const
}

export function priceStatusLabel(status: PriceRecord['status']) {
  if (status === 'PENDING') return 'Pending sign-off'
  if (status === 'SUPERSEDED') return 'Superseded'
  return status
}

export function planStatusLabel(status: PlanRecord['status']) {
  if (status === 'DEACTIVATED') return 'Deactivated'
  if (status === 'PENDING') return 'Pending sign-off'
  return 'Active'
}

export function periodSuffix(period: PlanRecord['period']) {
  if (period === 'swap') return ' / swap'
  if (period === 'day') return ' / day'
  if (period === 'week') return ' / week'
  return ' / month'
}
