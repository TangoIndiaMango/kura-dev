import type { NotificationApi, NotificationSeverity } from '../hooks/use-notifications'

export type CategoryId = 'all' | 'system' | 'alerts' | 'ops' | 'payments' | 'others'

const PAYMENT_SOURCES = new Set(['payments', 'psp', 'pricing', 'cash', 'billing'])
const SYSTEM_SOURCES = new Set(['system', 'approvals', 'users', 'iam'])
const OPS_SOURCES = new Set([
  'hubs',
  'agents',
  'swaps',
  'batteries',
  'vehicles',
])

export function normalizeSeverity(value: string): NotificationSeverity {
  const upper = value.toUpperCase()
  if (upper === 'CRITICAL') return 'CRITICAL'
  if (upper === 'WARNING') return 'WARNING'
  return 'INFO'
}

export function formatReceivedAt(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function sourceKey(n: NotificationApi): string {
  return (n.source || '').trim().toLowerCase()
}

export const CATEGORIES: {
  id: CategoryId
  label: string
  short: string
  match: (n: NotificationApi) => boolean
}[] = [
  { id: 'all', label: 'All', short: 'All', match: () => true },
  {
    id: 'system',
    label: 'System',
    short: 'System',
    match: (n) => SYSTEM_SOURCES.has(sourceKey(n)),
  },
  {
    id: 'alerts',
    label: 'Alerts',
    short: 'Alerts',
    match: (n) =>
      sourceKey(n) === 'alerts' || normalizeSeverity(n.severity) === 'CRITICAL',
  },
  {
    id: 'ops',
    label: 'Ops & Hubs',
    short: 'Ops',
    match: (n) => OPS_SOURCES.has(sourceKey(n)),
  },
  {
    id: 'payments',
    label: 'Payments & PSP',
    short: 'Payments',
    match: (n) => PAYMENT_SOURCES.has(sourceKey(n)),
  },
  {
    id: 'others',
    label: 'Others',
    short: 'Others',
    match: (n) => {
      const key = sourceKey(n)
      return (
        !SYSTEM_SOURCES.has(key) &&
        key !== 'alerts' &&
        !OPS_SOURCES.has(key) &&
        !PAYMENT_SOURCES.has(key) &&
        normalizeSeverity(n.severity) !== 'CRITICAL'
      )
    },
  },
]

export function countByCategory(
  items: NotificationApi[],
  predicate?: (n: NotificationApi) => boolean,
): Record<CategoryId, number> {
  const counts = {} as Record<CategoryId, number>
  for (const cat of CATEGORIES) {
    counts[cat.id] = items.filter(
      (n) => cat.match(n) && (predicate ? predicate(n) : true),
    ).length
  }
  return counts
}
