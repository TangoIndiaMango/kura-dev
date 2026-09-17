import type { ComponentType } from 'react'
import {
  DashboardSquare01Icon,
  Location01Icon,
  BatteryFullIcon,
  UserMultipleIcon,
  ScooterElectricIcon,
  UserCheck01Icon,
  ArrowDataTransferHorizontalIcon,
  Wallet01Icon,
  Alert02Icon,
  CustomerSupportIcon,
  ChartRingIcon,
  CreditCardIcon,
  SaleTag01Icon,
  PercentCircleIcon,
  ChartHistogramIcon,
  Leaf01Icon,
  Activity01Icon,
  Wifi01Icon,
  Wrench01Icon,
  DollarCircleIcon,
  Link01Icon,
  DialpadSquare01Icon,
  UserGroupIcon,
  Notification03Icon,
  CheckmarkCircle02Icon,
  Audit01Icon,
  UserCircleIcon,
  Shield01Icon,
} from 'hugeicons-react'
import type { AdminModuleId } from '@features/layout/AdminSidebar'

// Hugeicons components accept size/color; keep the map loosely typed for SVG attribute variance.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AdminNavIcon = ComponentType<any>

export const ADMIN_NAV_ICONS: Record<AdminModuleId, AdminNavIcon> = {
  dashboard: DashboardSquare01Icon,
  hubs: Location01Icon,
  batteries: BatteryFullIcon,
  operators: UserMultipleIcon,
  vehicles: ScooterElectricIcon,
  agents: UserCheck01Icon,
  swaps: ArrowDataTransferHorizontalIcon,
  payments: Wallet01Icon,
  alerts: Alert02Icon,
  incidents: CustomerSupportIcon,
  segments: ChartRingIcon,
  credit: CreditCardIcon,
  offers: SaleTag01Icon,
  discounts: PercentCircleIcon,
  revenue: ChartHistogramIcon,
  impact: Leaf01Icon,
  health: Activity01Icon,
  telemetry: Wifi01Icon,
  engines: Wrench01Icon,
  pricing: DollarCircleIcon,
  psp: Link01Icon,
  ussd: DialpadSquare01Icon,
  users: UserGroupIcon,
  notifications: Notification03Icon,
  approvals: CheckmarkCircle02Icon,
  audit: Audit01Icon,
  profile: UserCircleIcon,
  risk: Shield01Icon,
  cooperative: UserGroupIcon,
}

export function getAdminNavIcon(id: AdminModuleId): AdminNavIcon {
  return ADMIN_NAV_ICONS[id]
}
