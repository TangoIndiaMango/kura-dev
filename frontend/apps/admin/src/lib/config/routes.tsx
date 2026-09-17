import type { ReactNode } from 'react'
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RouteErrorBoundary } from '../../shared/components/error'
import { RouteLoadingFallback } from '../../shared/components/loading'
import {
  MODULE_PATHS,
  metaForModule,
  moduleFromPath,
  pathForModule,
} from '../../features/layout/modulePaths'
import type { AdminModuleId } from '../../features/layout/navConfig'
import { RequireAdminAuth } from '../../features/auth/RequireAdminAuth'

const LoginPage = lazy(() =>
  import('../../features/auth/LoginPage').then((m) => ({
    default: m.LoginPage,
  })),
)
const CreatePasswordPage = lazy(() =>
  import('../../features/auth/CreatePasswordPage').then((m) => ({
    default: m.CreatePasswordPage,
  })),
)
const ResetPasswordPage = lazy(() =>
  import('../../features/auth/ResetPasswordPage').then((m) => ({
    default: m.ResetPasswordPage,
  })),
)
const AdminShell = lazy(() =>
  import('../../features/layout/AdminShell').then((m) => ({
    default: m.AdminShell,
  })),
)
const AdminWorkbenchPage = lazy(() =>
  import('../../components/AdminWorkbenchPage').then((m) => ({
    default: m.AdminWorkbenchPage,
  })),
)

const DashboardPage = lazy(() => import('../../pages/DashboardPage'))
const HubsPage = lazy(() => import('../../pages/HubsPage'))
const BatteriesPage = lazy(() => import('../../pages/BatteriesPage'))
const OperatorsPage = lazy(() => import('../../pages/OperatorsPage'))
const VehiclesPage = lazy(() => import('../../pages/VehiclesPage'))
const AgentsPage = lazy(() => import('../../pages/AgentsPage'))
const SwapsPage = lazy(() => import('../../pages/SwapsPage'))
const PaymentsPage = lazy(() => import('../../pages/PaymentsPage'))
const AlertsPage = lazy(() => import('../../pages/AlertsPage'))
const CasesPage = lazy(() => import('../../pages/CasesPage'))
const RiskPage = lazy(() => import('../../pages/RiskPage'))
const SegmentsPage = lazy(() => import('../../pages/SegmentsPage'))
const CreditPage = lazy(() => import('../../pages/CreditPage'))
const OffersPage = lazy(() => import('../../pages/OffersPage'))
const DiscountsPage = lazy(() => import('../../pages/DiscountsPage'))
const RevenuePage = lazy(() => import('../../pages/RevenuePage'))
const ImpactPage = lazy(() => import('../../pages/ImpactPage'))
const HealthPage = lazy(() => import('../../pages/HealthPage'))
const TelemetryPage = lazy(() => import('../../pages/TelemetryPage'))
const EnginesPage = lazy(() => import('../../pages/EnginesPage'))
const PricingPage = lazy(() => import('../../pages/PricingPage'))
const PspPage = lazy(() => import('../../pages/PspPage'))
const UssdPage = lazy(() => import('../../pages/UssdPage'))
const UsersPage = lazy(() => import('../../pages/UsersPage'))
const CooperativePage = lazy(() => import('../../pages/CooperativePage'))
const NotificationsPage = lazy(() => import('../../pages/NotificationsPage'))
const ApprovalsPage = lazy(() => import('../../pages/ApprovalsPage'))
const AuditPage = lazy(() => import('../../pages/AuditPage'))
const ProfilePage = lazy(() => import('../../pages/ProfilePage'))

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<RouteLoadingFallback />}>{element}</Suspense>
}

export {
  MODULE_PATHS,
  metaForModule,
  moduleFromPath,
  pathForModule,
}
export type { AdminModuleId }

export const router = createBrowserRouter([
  {
    path: '/login',
    element: withSuspense(<LoginPage />),
    ErrorBoundary: RouteErrorBoundary,
  },
  {
    path: '/sign-up',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/create-password',
    element: withSuspense(<CreatePasswordPage />),
    ErrorBoundary: RouteErrorBoundary,
  },
  {
    path: '/reset-password',
    element: withSuspense(<ResetPasswordPage />),
    ErrorBoundary: RouteErrorBoundary,
  },
  {
    path: '/',
    element: withSuspense(
      <RequireAdminAuth>
        <AdminShell />
      </RequireAdminAuth>,
    ),
    ErrorBoundary: RouteErrorBoundary,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'hubs', element: <HubsPage /> },
      { path: 'hubs/:id/edit', element: <HubsPage /> },
      { path: 'hubs/:id/swap', element: <HubsPage /> },
      { path: 'hubs/:id', element: <HubsPage /> },
      { path: 'batteries/types', element: <BatteriesPage /> },
      { path: 'batteries/types/new', element: <BatteriesPage /> },
      { path: 'batteries/types/:typeId/edit', element: <BatteriesPage /> },
      { path: 'batteries', element: <BatteriesPage /> },
      { path: 'batteries/:id/edit', element: <BatteriesPage /> },
      { path: 'batteries/:id', element: <BatteriesPage /> },
      { path: 'operators', element: <OperatorsPage /> },
      { path: 'operators/:id/edit', element: <OperatorsPage /> },
      { path: 'operators/:id', element: <OperatorsPage /> },
      { path: 'vehicles/models', element: <VehiclesPage /> },
      { path: 'vehicles/models/new', element: <VehiclesPage /> },
      { path: 'vehicles/models/:modelId/edit', element: <VehiclesPage /> },
      { path: 'vehicles', element: <VehiclesPage /> },
      { path: 'vehicles/:id/edit', element: <VehiclesPage /> },
      { path: 'vehicles/:id', element: <VehiclesPage /> },
      { path: 'agents', element: <AgentsPage /> },
      { path: 'agents/:id/edit', element: <AgentsPage /> },
      { path: 'agents/:id', element: <AgentsPage /> },
      { path: 'swaps', element: <SwapsPage /> },
      { path: 'swaps/:id', element: <SwapsPage /> },
      { path: 'payments', element: <PaymentsPage /> },
      { path: 'payments/:id', element: <PaymentsPage /> },
      { path: 'alerts', element: <AlertsPage /> },
      { path: 'alerts/rules/new', element: <AlertsPage /> },
      {
        path: 'alerts/rules/:ruleId/edit',
        element: <AlertsPage />,
      },
      { path: 'alerts/:id', element: <AlertsPage /> },
      { path: 'cases', element: <CasesPage /> },
      { path: 'cases/:id', element: <CasesPage /> },
      { path: 'risk', element: <RiskPage /> },
      { path: 'risk/:id', element: <RiskPage /> },
      { path: 'segments', element: <SegmentsPage /> },
      { path: 'segments/new', element: <SegmentsPage /> },
      { path: 'segments/:id/edit', element: <SegmentsPage /> },
      { path: 'segments/:id', element: <SegmentsPage /> },
      { path: 'credit', element: <CreditPage /> },
      { path: 'credit/:id', element: <CreditPage /> },
      { path: 'offers', element: <OffersPage /> },
      { path: 'offers/new', element: <OffersPage /> },
      { path: 'offers/:id/edit', element: <OffersPage /> },
      { path: 'offers/:id', element: <OffersPage /> },
      { path: 'discounts', element: <DiscountsPage /> },
      { path: 'discounts/new', element: <DiscountsPage /> },
      { path: 'discounts/:id/edit', element: <DiscountsPage /> },
      {
        path: 'discounts/:id/people/:userId',
        element: <DiscountsPage />,
      },
      { path: 'discounts/:id', element: <DiscountsPage /> },
      { path: 'revenue', element: <RevenuePage /> },
      { path: 'revenue/:id', element: <RevenuePage /> },
      { path: 'impact', element: <ImpactPage /> },
      { path: 'impact/new', element: <ImpactPage /> },
      { path: 'impact/:id/edit', element: <ImpactPage /> },
      { path: 'impact/:id', element: <ImpactPage /> },
      { path: 'health', element: <HealthPage /> },
      { path: 'health/:id', element: <HealthPage /> },
      { path: 'telemetry', element: <TelemetryPage /> },
      { path: 'telemetry/:id', element: <TelemetryPage /> },
      { path: 'engines', element: <EnginesPage /> },
      { path: 'engines/new', element: <EnginesPage /> },
      { path: 'engines/eboarders', element: <EnginesPage /> },
      { path: 'engines/eboarders/new', element: <EnginesPage /> },
      { path: 'engines/eboarders/:eboarderId/edit', element: <EnginesPage /> },
      { path: 'engines/:id/edit', element: <EnginesPage /> },
      { path: 'engines/:id', element: <EnginesPage /> },
      { path: 'pricing', element: <PricingPage /> },
      { path: 'pricing/new', element: <PricingPage /> },
      { path: 'pricing/settings', element: <PricingPage /> },
      { path: 'pricing/plans', element: <PricingPage /> },
      { path: 'pricing/plans/new', element: <PricingPage /> },
      { path: 'pricing/plans/:id/edit', element: <PricingPage /> },
      { path: 'pricing/plans/:id', element: <PricingPage /> },
      { path: 'pricing/:id/edit', element: <PricingPage /> },
      { path: 'pricing/:id', element: <PricingPage /> },
      { path: 'psp', element: <PspPage /> },
      { path: 'psp/edit', element: <PspPage /> },
      { path: 'psp/:id', element: <PspPage /> },
      { path: 'ussd', element: <UssdPage /> },
      { path: 'ussd/new', element: <UssdPage /> },
      { path: 'ussd/:id', element: <UssdPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'users/new', element: <UsersPage /> },
      { path: 'users/roles/new', element: <UsersPage /> },
      { path: 'users/roles/:code/edit', element: <UsersPage /> },
      { path: 'users/roles/:code', element: <UsersPage /> },
      { path: 'users/:id/edit', element: <UsersPage /> },
      { path: 'users/:id', element: <UsersPage /> },
      { path: 'cooperative', element: <CooperativePage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'notifications/:id', element: <NotificationsPage /> },
      { path: 'approvals', element: <ApprovalsPage /> },
      { path: 'approvals/:id', element: <ApprovalsPage /> },
      { path: 'audit', element: <AuditPage /> },
      { path: 'audit/:id', element: <AuditPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'profile/edit', element: <ProfilePage /> },
    ],
  },
  {
    path: '/workbench',
    element: withSuspense(<AdminWorkbenchPage />),
    ErrorBoundary: RouteErrorBoundary,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
    ErrorBoundary: RouteErrorBoundary,
  },
])
