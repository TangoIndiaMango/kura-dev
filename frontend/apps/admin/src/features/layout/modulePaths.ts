import type { AdminModuleId } from './navConfig'

/** Canonical path for each sidebar module. */
export const MODULE_PATHS: Record<AdminModuleId, string> = {
  dashboard: '/',
  hubs: '/hubs',
  batteries: '/batteries',
  operators: '/operators',
  vehicles: '/vehicles',
  agents: '/agents',
  swaps: '/swaps',
  payments: '/payments',
  alerts: '/alerts',
  incidents: '/cases',
  risk: '/risk',
  segments: '/segments',
  credit: '/credit',
  offers: '/offers',
  discounts: '/discounts',
  revenue: '/revenue',
  impact: '/impact',
  health: '/health',
  telemetry: '/telemetry',
  engines: '/engines',
  pricing: '/pricing',
  psp: '/psp',
  ussd: '/ussd',
  users: '/users',
  cooperative: '/cooperative',
  notifications: '/notifications',
  approvals: '/approvals',
  audit: '/audit',
  profile: '/profile',
}

const PATH_TO_MODULE = Object.entries(MODULE_PATHS).reduce(
  (acc, [id, path]) => {
    acc[path] = id as AdminModuleId
    return acc
  },
  {} as Record<string, AdminModuleId>,
)

export function pathForModule(id: AdminModuleId): string {
  return MODULE_PATHS[id]
}

export function moduleFromPath(pathname: string): AdminModuleId {
  if (pathname === '/' || pathname === '') return 'dashboard'
  const exact = PATH_TO_MODULE[pathname]
  if (exact) return exact
  const match = Object.entries(MODULE_PATHS).find(
    ([id, path]) => id !== 'dashboard' && pathname.startsWith(path),
  )
  return match ? (match[0] as AdminModuleId) : 'dashboard'
}

export interface ModuleMeta {
  title: string
  crumb: string
}

const MODULE_META: Record<AdminModuleId, ModuleMeta> = {
  dashboard: { title: 'Dashboard', crumb: 'Dashboard' },
  hubs: { title: 'Hubs', crumb: 'Hubs / Network' },
  batteries: { title: 'Batteries', crumb: 'Batteries / Inventory' },
  operators: { title: 'Operators', crumb: 'Operators / CRM' },
  vehicles: { title: 'Vehicles', crumb: 'Vehicles / Fleet' },
  agents: { title: 'Hub Operators', crumb: 'Hub Operators / Staff' },
  swaps: { title: 'Swaps', crumb: 'Swaps / Live Queue' },
  payments: { title: 'Payments', crumb: 'Payments / Collections' },
  alerts: { title: 'Alerts', crumb: 'Alerts / Triage' },
  incidents: { title: 'Support Cases', crumb: 'Support Cases / Tickets' },
  risk: { title: 'Risk', crumb: 'Risk / Review Queue' },
  segments: { title: 'Segments', crumb: 'Commercial / Segments' },
  credit: { title: 'Credit Scoring', crumb: 'Commercial / Credit' },
  offers: { title: 'Product Offers', crumb: 'Commercial / Offers' },
  discounts: { title: 'Discounts', crumb: 'Commercial / Discounts' },
  revenue: { title: 'Revenue Analytics', crumb: 'Commercial / Revenue' },
  impact: { title: 'Government Impact', crumb: 'Impact / Stories' },
  health: { title: 'Battery Health', crumb: 'Impact / Health' },
  telemetry: { title: 'Telemetry', crumb: 'Impact / Telemetry' },
  engines: { title: 'Retrofit & Engines', crumb: 'Retrofit & Engines' },
  pricing: { title: 'Pricing', crumb: 'Configuration / Tariffs' },
  psp: { title: 'PSP & Payments', crumb: 'Configuration / PSP' },
  ussd: { title: 'USSD & SMS', crumb: 'Configuration / USSD' },
  users: { title: 'User Management', crumb: 'Configuration / RBAC' },
  cooperative: { title: 'My Cooperative', crumb: 'Account / Cooperative' },
  notifications: { title: 'Notifications', crumb: 'System / Notifications' },
  approvals: { title: 'Approvals', crumb: 'System / Approvals' },
  audit: { title: 'Audit Trail', crumb: 'System / Audit' },
  profile: { title: 'My Profile Setting', crumb: 'Account / Profile' },
}

export function metaForModule(id: AdminModuleId): ModuleMeta {
  return MODULE_META[id]
}
