import type React from 'react'
import {
  DashboardSquare01Icon,
  Location01Icon,
  BatteryFullIcon,
  UserMultipleIcon,
  Car01Icon,
  UserGroupIcon,
  ArrowDataTransferHorizontalIcon,
  CreditCardIcon,
  Alert02Icon,
  CustomerSupportIcon,
  PieChart01Icon,
  AnalyticsUpIcon,
  Tag01Icon,
  PercentCircleIcon,
  ChartHistogramIcon,
  Globe02Icon,
  HealthIcon,
  Wifi01Icon,
  EngineIcon,
  DollarCircleIcon,
  Link01Icon,
  Message01Icon,
  UserIcon,
  Notification03Icon,
  TickDouble01Icon,
  Audit01Icon,
  ProfileIcon,
  Shield01Icon,
} from 'hugeicons-react'

export type AdminModuleId =
  | 'dashboard'
  | 'hubs'
  | 'batteries'
  | 'operators'
  | 'vehicles'
  | 'agents'
  | 'swaps'
  | 'payments'
  | 'alerts'
  | 'incidents'
  | 'risk'
  | 'segments'
  | 'credit'
  | 'offers'
  | 'discounts'
  | 'revenue'
  | 'impact'
  | 'health'
  | 'telemetry'
  | 'engines'
  | 'pricing'
  | 'psp'
  | 'ussd'
  | 'users'
  | 'cooperative'
  | 'notifications'
  | 'approvals'
  | 'audit'
  | 'profile'

export type NavIcon = React.ComponentType<{
  size?: number | string
  className?: string
}>

export type NavChild = { label: string; to: string }

export interface NavItem {
  id: AdminModuleId
  label: string
  icon: NavIcon
  count?: number
  children?: NavChild[]
}

/** Active when this child is the longest matching prefix among siblings. */
export function childIsActive(
  pathname: string,
  child: NavChild,
  siblings: NavChild[],
): boolean {
  const matches = (to: string) =>
    pathname === to || pathname.startsWith(`${to}/`)

  if (!matches(child.to)) return false

  const best = siblings
    .filter((sib) => matches(sib.to))
    .reduce((a, b) => (a.to.length >= b.to.length ? a : b))

  return best.to === child.to
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export const SECTIONS: NavSection[] = [
  {
    label: 'MAIN MENU',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: DashboardSquare01Icon },
      { id: 'hubs', label: 'Hubs', icon: Location01Icon },
      {
        id: 'batteries',
        label: 'Batteries',
        icon: BatteryFullIcon,
        children: [
          { label: 'Inventory', to: '/batteries' },
          { label: 'Battery types', to: '/batteries/types' },
        ],
      },
      { id: 'operators', label: 'Operators', icon: UserMultipleIcon },
      {
        id: 'vehicles',
        label: 'Vehicles',
        icon: Car01Icon,
        children: [
          { label: 'Fleet', to: '/vehicles' },
          { label: 'Vehicle models', to: '/vehicles/models' },
        ],
      },
      { id: 'agents', label: 'Hub Operators', icon: UserGroupIcon },
      { id: 'swaps', label: 'Swaps', icon: ArrowDataTransferHorizontalIcon },
      { id: 'payments', label: 'Payments', icon: CreditCardIcon },
      { id: 'alerts', label: 'Alerts', icon: Alert02Icon },
      { id: 'incidents', label: 'Support Cases', icon: CustomerSupportIcon },
      { id: 'risk', label: 'Risk', icon: Shield01Icon },
    ],
  },
  {
    label: 'COMMERCIAL',
    items: [
      { id: 'segments', label: 'Segments', icon: PieChart01Icon },
      { id: 'credit', label: 'Credit Scoring', icon: AnalyticsUpIcon },
      { id: 'offers', label: 'Product Offers', icon: Tag01Icon },
      { id: 'discounts', label: 'Discounts', icon: PercentCircleIcon },
      { id: 'revenue', label: 'Revenue Analytics', icon: ChartHistogramIcon },
    ],
  },
  {
    label: 'IMPACT & PARTNERS',
    items: [
      { id: 'impact', label: 'Government Impact', icon: Globe02Icon },
      { id: 'health', label: 'Battery Health', icon: HealthIcon },
      { id: 'telemetry', label: 'Telemetry', icon: Wifi01Icon },
      {
        id: 'engines',
        label: 'Retrofit & Engines',
        icon: EngineIcon,
        children: [
          { label: 'Retrofits', to: '/engines' },
          { label: 'E-boarders', to: '/engines/eboarders' },
        ],
      },
    ],
  },
  {
    label: 'CONFIGURATION',
    items: [
      {
        id: 'pricing',
        label: 'Pricing',
        icon: DollarCircleIcon,
        children: [
          { label: 'Tariffs', to: '/pricing' },
          { label: 'Plans', to: '/pricing/plans' },
          { label: 'Settings', to: '/pricing/settings' },
        ],
      },
      { id: 'psp', label: 'PSP & Payments', icon: Link01Icon },
      { id: 'ussd', label: 'USSD & SMS', icon: Message01Icon },
      { id: 'users', label: 'User Management', icon: UserIcon },
    ],
  },
  {
    label: 'OTHERS',
    items: [
      { id: 'notifications', label: 'Notifications', icon: Notification03Icon },
      { id: 'approvals', label: 'Approvals', icon: TickDouble01Icon },
      { id: 'audit', label: 'Audit Trail', icon: Audit01Icon },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { id: 'cooperative', label: 'My Cooperative', icon: UserGroupIcon },
      { id: 'profile', label: 'My Profile', icon: ProfileIcon },
    ],
  },
]

export const NAV_CAPABILITY: Partial<Record<AdminModuleId, string>> = {
  hubs: 'hubs:read',
  batteries: 'batteries:read',
  vehicles: 'vehicles:read',
  operators: 'accounts:read',
  agents: 'users:read',
  swaps: 'swaps:read',
  payments: 'finance:read',
  alerts: 'alerts:read',
  incidents: 'cases:read',
  risk: 'risk:read',
  segments: 'segments:manage',
  credit: 'credit:approve',
  offers: 'offers:manage',
  discounts: 'tariffs:manage',
  revenue: 'finance:read',
  impact: 'analytics:impact',
  health: 'batteries:read',
  telemetry: 'telemetry:read',
  engines: 'engines:manage',
  pricing: 'tariffs:manage',
  psp: 'tariffs:manage',
  ussd: 'tariffs:manage',
  users: 'users:read',
  cooperative: 'analytics:cooperative',
  audit: 'audit:read',
}

