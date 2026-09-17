import type { TableHeader, TablePaginationConfig } from '@shared/components'
import { ADMIN_CHART_COLORS } from '@shared/components/charts'
import type { BatteryStats, BatteryStatus } from './types'

export const BATTERY_HEADERS: TableHeader[] = [
  { key: 'serial', label: 'SERIAL NUMBER' },
  { key: 'type', label: 'BATTERY MODEL' },
  { key: 'location', label: 'CURRENT LOCATION' },
  { key: 'charge', label: 'CHARGE LEVEL' },
  { key: 'health', label: 'STATE OF HEALTH' },
  { key: 'cycles', label: 'CYCLE COUNT' },
  { key: 'status', label: 'STATUS' },
]

export const TYPE_HEADERS: TableHeader[] = [
  { key: 'model', label: 'MODEL' },
  { key: 'count', label: 'IN FLEET' },
  { key: 'ready', label: 'READY' },
]

export const STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'CHARGING', label: 'Charging' },
  { value: 'ISSUED', label: 'In field' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'FAULTED', label: 'Faulty' },
  { value: 'RETIRED', label: 'Retired' },
]

export function batteryTone(status: BatteryStatus) {
  if (status === 'AVAILABLE') return 'success' as const
  if (status === 'CHARGING') return 'info' as const
  if (status === 'ISSUED') return 'neutral' as const
  if (status === 'RETIRED' || status === 'FAULTED') return 'danger' as const
  return 'warning' as const
}

export function serverPagination(
  page: number,
  totalPages: number,
  pageSize: number,
  setPage: (p: number) => void,
): TablePaginationConfig {
  return {
    page,
    totalPages: Math.max(1, totalPages),
    onPageChange: setPage,
    variant: 'controls',
    pageSize: String(pageSize).padStart(2, '0'),
  }
}

export function fleetDonutFromStats(totals: BatteryStats['totals'] | undefined) {
  return [
    {
      name: 'Ready',
      value: totals?.available ?? 0,
      color: ADMIN_CHART_COLORS.green,
    },
    {
      name: 'Charging',
      value: totals?.charging ?? 0,
      color: ADMIN_CHART_COLORS.sky,
    },
    {
      name: 'In field',
      value: totals?.issued ?? 0,
      color: ADMIN_CHART_COLORS.teal,
    },
    {
      name: 'Faulty',
      value: totals?.faulted ?? 0,
      color: ADMIN_CHART_COLORS.amber,
    },
  ]
}
