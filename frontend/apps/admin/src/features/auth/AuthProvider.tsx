import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { setUnauthorizedHandler } from '@lib/api/client'
import { fetchAdminMe, logoutRemote, type AdminMePayload } from '@lib/api/auth'
import { clearTokens, hasStoredSession } from '@lib/api/token-storage'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

type AuthContextValue = {
  status: AuthStatus
  me: AdminMePayload | null
  isAuthenticated: boolean
  refreshProfile: () => Promise<AdminMePayload | null>
  clearSession: () => void
  logout: () => Promise<void>
  setAuthenticatedFromTokens: () => Promise<AdminMePayload | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthStatus>(() =>
    hasStoredSession() ? 'loading' : 'unauthenticated',
  )
  const [me, setMe] = useState<AdminMePayload | null>(null)

  const clearSession = useCallback(() => {
    clearTokens()
    queryClient.clear()
    setMe(null)
    setStatus('unauthenticated')
  }, [queryClient])

  const logout = useCallback(async () => {
    try {
      await logoutRemote()
    } catch {
      return
    } finally {
      clearSession()
    }
  }, [clearSession])

  const refreshProfile = useCallback(async () => {
    const profile = await fetchAdminMe()
    setMe(profile)
    setStatus('authenticated')
    return profile
  }, [])

  const setAuthenticatedFromTokens = useCallback(async () => {
    try {
      return await refreshProfile()
    } catch {
      clearSession()
      return null
    }
  }, [clearSession, refreshProfile])

  useEffect(() => {
    setUnauthorizedHandler(clearSession)
    return () => setUnauthorizedHandler(null)
  }, [clearSession])

  useEffect(() => {
    if (!hasStoredSession()) {
      setStatus('unauthenticated')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const profile = await fetchAdminMe()
        if (!cancelled) {
          setMe(profile)
          setStatus('authenticated')
        }
      } catch {
        if (!cancelled) clearSession()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [clearSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      me,
      isAuthenticated: status === 'authenticated',
      refreshProfile,
      clearSession,
      logout,
      setAuthenticatedFromTokens,
    }),
    [status, me, refreshProfile, clearSession, logout, setAuthenticatedFromTokens],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
