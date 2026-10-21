import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import { useAtom } from 'jotai'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../features/auth/AuthProvider'
import { axiosInstance } from '@lib/api/client'
import {
  AUTH_ME_QUERY_KEY,
  apiErrorMessage,
  updateNotificationPrefs,
  type MePayload,
  type NotificationPrefs,
} from '@lib/api/auth'
import { notify } from '../utils/notify'
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
  SERVER_ALERT_SETTING_KEYS,
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
  const queryClient = useQueryClient()

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

  const saveServerAlerts = useCallback(
    async (patch: Partial<NotificationPrefs>) => {
      const previous = queryClient.getQueryData<MePayload>(AUTH_ME_QUERY_KEY)
      queryClient.setQueryData<MePayload>(AUTH_ME_QUERY_KEY, (old) =>
        old
          ? {
              ...old,
              notification_prefs: { ...old.notification_prefs, ...patch },
            }
          : old,
      )
      try {
        const next = await updateNotificationPrefs(patch)
        queryClient.setQueryData(AUTH_ME_QUERY_KEY, next)
      } catch (err) {
        queryClient.setQueryData(AUTH_ME_QUERY_KEY, previous)
        notify({
          title: 'Could not save alert setting',
          message: apiErrorMessage(err, 'Check your connection and try again.'),
          tone: 'error',
        })
      }
    },
    [queryClient],
  )

  const updateSettings = useCallback(
    (patch: Partial<OperatorAccountSettings>) => {
      const local: Partial<OperatorAccountSettings> = { ...patch }
      const server: Partial<NotificationPrefs> = {}
      for (const [key, serverKey] of Object.entries(SERVER_ALERT_SETTING_KEYS)) {
        const value = patch[key as keyof typeof SERVER_ALERT_SETTING_KEYS]
        if (typeof value !== 'boolean') continue
        server[serverKey] = value
        delete local[key as keyof typeof SERVER_ALERT_SETTING_KEYS]
      }
      if (Object.keys(local).length > 0) {
        setPrefs((prev) => ({
          ...prev,
          settings: { ...prev.settings, ...local },
        }))
      }
      if (Object.keys(server).length > 0) void saveServerAlerts(server)
    },
    [setPrefs, saveServerAlerts],
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
