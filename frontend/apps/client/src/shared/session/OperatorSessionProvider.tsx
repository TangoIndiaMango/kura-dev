import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import { useAtom } from 'jotai'
import { useAuth } from '../../features/auth/AuthProvider'
import { axiosInstance } from '@lib/api/client'
import { getOrCreateDeviceId } from '@lib/deviceId'
import { buildProfile } from './buildProfile'
import {
  clearEnteredApp,
  createPwaUpdateNotification,
  markEnteredApp,
  prefsAtom,
  pwaUpdateNotificationAtom,
} from './clientPrefs'
import {
  DEFAULT_OPERATOR_SETTINGS,
  type OperatorAccountSettings,
  type OperatorNotification,
  type OperatorProfile,
} from './operatorTypes'

interface OperatorSessionContextValue {
  /** Auth-derived profile; null until `/me` loads. */
  session: OperatorProfile | null
  onboarded: boolean
  markOnboarded: () => void
  updateSettings: (patch: Partial<OperatorAccountSettings>) => void
  setEmail: (email: string | null, verified?: boolean) => void
  queueAppUpdateNotification: () => void
  clearAppUpdateNotification: () => void
  pwaUpdateNotification: OperatorNotification | null
  logout: () => Promise<void>
}

const OperatorSessionContext = createContext<OperatorSessionContextValue | null>(
  null,
)

export function OperatorSessionProvider({ children }: { children: ReactNode }) {
  const { me, isAuthenticated, logout: logoutAuth } = useAuth()
  const [prefs, setPrefs] = useAtom(prefsAtom)
  const [pwaUpdate, setPwaUpdate] = useAtom(pwaUpdateNotificationAtom)

  const session = useMemo(() => buildProfile(me, prefs), [me, prefs])

  useEffect(() => {
    if (!isAuthenticated) return
    const deviceId = getOrCreateDeviceId()
    axiosInstance
      .post(
        '/auth/devices/heartbeat/',
        { device_id: deviceId },
        { silentError: true },
      )
      .catch(() => undefined)
  }, [isAuthenticated])

  const markOnboarded = useCallback(() => {
    markEnteredApp()
  }, [])

  const updateSettings = useCallback(
    (patch: Partial<OperatorAccountSettings>) => {
      setPrefs((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...patch },
      }))
    },
    [setPrefs],
  )

  const setEmail = useCallback(
    (email: string | null, verified = false) => {
      setPrefs((prev) => ({
        ...prev,
        email,
        emailVerified: Boolean(email) && verified,
        settings: {
          ...prev.settings,
          otpChannel:
            email && verified ? 'email' : prev.settings.otpChannel,
        },
      }))
    },
    [setPrefs],
  )

  const queueAppUpdateNotification = useCallback(() => {
    setPwaUpdate(createPwaUpdateNotification())
  }, [setPwaUpdate])

  const clearAppUpdateNotification = useCallback(() => {
    setPwaUpdate(null)
  }, [setPwaUpdate])

  const logout = useCallback(async () => {
    try {
      await logoutAuth()
    } finally {
      clearEnteredApp()
      setPrefs({
        settings: DEFAULT_OPERATOR_SETTINGS,
        email: null,
        emailVerified: false,
      })
      setPwaUpdate(null)
    }
  }, [logoutAuth, setPrefs, setPwaUpdate])

  const value = useMemo<OperatorSessionContextValue>(
    () => ({
      session,
      onboarded: isAuthenticated,
      markOnboarded,
      updateSettings,
      setEmail,
      queueAppUpdateNotification,
      clearAppUpdateNotification,
      pwaUpdateNotification: pwaUpdate,
      logout,
    }),
    [
      session,
      isAuthenticated,
      markOnboarded,
      updateSettings,
      setEmail,
      queueAppUpdateNotification,
      clearAppUpdateNotification,
      pwaUpdate,
      logout,
    ],
  )

  return (
    <OperatorSessionContext.Provider value={value}>
      {children}
    </OperatorSessionContext.Provider>
  )
}

export function useOperatorSession() {
  const ctx = useContext(OperatorSessionContext)
  if (!ctx) {
    throw new Error('useOperatorSession must be used within OperatorSessionProvider')
  }
  return ctx
}
