import React, { Suspense, useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMantineColorScheme } from '@mantine/core'
import { AdminConfirmModal } from '@shared/components'
import { RouteLoadingFallback } from '@shared/components/loading'
import {
  AdminNotificationsDrawer,
  useNotificationStats,
} from '@features/notifications'
import { useAuth } from '../auth/AuthProvider'
import { AdminSidebar } from './AdminSidebar'
import { AdminTopNav } from './AdminTopNav'
import { isFullscreenFormRoute } from './isFullscreenFormRoute'
import { metaForModule, moduleFromPath } from './modulePaths'
import { canSeeModule } from './navConfig'
import { useCapabilities } from '../auth/useCapabilities'
import { staffHomePath } from '../auth/staffHomePath'

function NoModuleAccess({ title, home }: { title: string; home: string }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-6 text-center shadow-[var(--sh)]">
      <h2 className="text-[16px] font-bold text-[var(--tx)]">{title}</h2>
      <p className="mt-2 text-[13px] text-[var(--mu)]">
        Your role does not include this module. Ask a super admin if you need access.
      </p>
      <Link
        to={home}
        className="mt-4 inline-block text-[13px] font-semibold text-[var(--pr)] underline"
      >
        Go to your home page
      </Link>
    </div>
  )
}

/**
 * RR7 wraps navigations in startTransition. Nested lazy+Suspense per route then
 * keeps the previous page painted until refresh. One Suspense here, keyed by
 * location.key, forces a fresh boundary on every nav (sidebar / back / crumbs).
 */
export const AdminShell: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const { data: notifStats } = useNotificationStats()

  const theme = colorScheme === 'dark' ? 'dark' : 'light'
  const meta = metaForModule(moduleFromPath(location.pathname))
  const unreadCount = notifStats?.totals.unread ?? 0
  const fullscreenForm = isFullscreenFormRoute(location.pathname)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggleTheme = () => {
    setColorScheme(theme === 'light' ? 'dark' : 'light')
  }

  const confirmSignOut = async () => {
    setLogoutOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  // Same rule as the sidebar: a page the menu hides must not open by URL either.
  const { can, me } = useCapabilities()
  const moduleId = moduleFromPath(location.pathname)
  const allowed = !me || canSeeModule(moduleId, can)
  if (!allowed && moduleId === 'dashboard') {
    return <Navigate to={staffHomePath(me)} replace />
  }

  const outlet = allowed ? (
    <Suspense key={location.key} fallback={<RouteLoadingFallback />}>
      <Outlet />
    </Suspense>
  ) : (
    <NoModuleAccess title={meta.title} home={staffHomePath(me)} />
  )

  if (fullscreenForm) {
    return (
      <div className="h-dvh w-screen overflow-hidden bg-transparent text-[var(--tx)] font-sans transition-colors">
        <div className="h-full min-h-0 overflow-hidden">{outlet}</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg)] text-[var(--tx)] font-sans transition-colors">
      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <AdminTopNav
          title={meta.title}
          crumb={meta.crumb}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onToggleNotifications={() => setIsNotifOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
          unreadNotifications={unreadCount}
          onSignOut={() => setLogoutOpen(true)}
        />

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[var(--bg)] p-4 sm:p-[22px_24px_40px]">
          {outlet}
        </main>
      </div>

      <AdminNotificationsDrawer
        opened={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onNavigate={(path) => navigate(path)}
      />

      <AdminConfirmModal
        opened={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="Sign out?"
        body="You’ll need to sign in again to open the console."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        confirmTone="danger"
        illustrationId="confirm-delete"
        onConfirm={confirmSignOut}
      />
    </div>
  )
}
