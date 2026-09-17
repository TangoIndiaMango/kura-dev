import type { ReactNode } from 'react'
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider'
import { RouteErrorBoundary } from '../../shared/components/error'
import { RouteLoadingFallback } from '../../shared/components/loading'

const OnboardingFlow = lazy(() =>
  import('../../features/onboarding/OnboardingFlow').then((m) => ({
    default: m.OnboardingFlow,
  })),
)

const OperatorShell = lazy(() =>
  import('../../features/layout/OperatorShell').then((m) => ({
    default: m.OperatorShell,
  })),
)

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<RouteLoadingFallback />}>{element}</Suspense>
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return <RouteLoadingFallback />
  if (status === 'unauthenticated') return <Navigate to="/onboarding" replace />
  return children
}

export const router = createBrowserRouter([
  {
    path: '/onboarding',
    element: withSuspense(<OnboardingFlow />),
    ErrorBoundary: RouteErrorBoundary,
  },
  {
    path: '/',
    element: withSuspense(
      <RequireAuth>
        <OperatorShell />
      </RequireAuth>,
    ),
    ErrorBoundary: RouteErrorBoundary,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
    ErrorBoundary: RouteErrorBoundary,
  },
])
