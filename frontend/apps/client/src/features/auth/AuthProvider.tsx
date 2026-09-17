import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { setUnauthorizedHandler } from '@lib/api/client'
import {
  fetchMe,
  logoutRemote,
  AUTH_ME_QUERY_KEY,
  type MePayload,
} from '@lib/api/auth'
import { clearTokens, hasStoredSession } from '@lib/api/token-storage'

export { AUTH_ME_QUERY_KEY }

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

type AuthContextValue = {
  status: AuthStatus
  me: MePayload | null
  isAuthenticated: boolean
  refreshProfile: () => Promise<MePayload | null>
  clearSession: () => void
  logout: () => Promise<void>
  setAuthenticatedFromTokens: () => Promise<MePayload | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function isUnauthorizedError(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status
  return status === 401 || status === 403
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  /** Gate for the me query — flipped on login / boot when JWTs exist. */
  const [meEnabled, setMeEnabled] = useState(() => hasStoredSession())

  const meQuery = useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: fetchMe,
    enabled: meEnabled && hasStoredSession(),
    staleTime: 0,
    gcTime: 5 * 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (count, err) => !isUnauthorizedError(err) && count < 1,
  })

  const clearSession = useCallback(() => {
    clearTokens()
    setMeEnabled(false)
    queryClient.clear()
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
    if (!hasStoredSession()) {
      clearSession()
      return null
    }
    setMeEnabled(true)
    const profile = await queryClient.fetchQuery({
      queryKey: AUTH_ME_QUERY_KEY,
      queryFn: fetchMe,
    })
    return profile
  }, [clearSession, queryClient])

  const setAuthenticatedFromTokens = useCallback(async () => {
    try {
      return await refreshProfile()
    } catch (err) {
      // Only wipe JWT on auth failure — keep tokens on transient /me errors.
      if (isUnauthorizedError(err)) clearSession()
      return null
    }
  }, [clearSession, refreshProfile])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearTokens()
      setMeEnabled(false)
      queryClient.clear()
    })
    return () => setUnauthorizedHandler(null)
  }, [queryClient])

  useEffect(() => {
    if (meQuery.isError && isUnauthorizedError(meQuery.error)) {
      clearSession()
    }
  }, [meQuery.isError, meQuery.error, clearSession])

  const hasToken = meEnabled && hasStoredSession()
  const status: AuthStatus = !hasToken
    ? 'unauthenticated'
    : meQuery.isError && isUnauthorizedError(meQuery.error)
      ? 'unauthenticated'
      : meQuery.isSuccess || Boolean(meQuery.data)
        ? 'authenticated'
        : meQuery.isPending || meQuery.isFetching
          ? 'loading'
          : 'authenticated'

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      me: meQuery.data ?? null,
      isAuthenticated: status === 'authenticated',
      refreshProfile,
      clearSession,
      logout,
      setAuthenticatedFromTokens,
    }),
    [
      status,
      meQuery.data,
      refreshProfile,
      clearSession,
      logout,
      setAuthenticatedFromTokens,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
