import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { AuthShellSkeleton } from './AuthShell'

export function RequireAdminAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { status, isAuthenticated } = useAuth()

  if (status === 'loading') {
    return <AuthShellSkeleton />
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search)
    const fromApp = location.pathname !== '/' || Boolean(location.search)
    const reason = fromApp ? 'session_expired' : ''
    const qs = reason
      ? `?reason=${reason}&next=${next}`
      : next && next !== '%2F'
        ? `?next=${next}`
        : ''
    return <Navigate to={`/login${qs}`} replace />
  }

  return <>{children}</>
}
