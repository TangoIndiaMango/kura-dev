import type { ReactNode } from 'react'
import { Box } from '@mantine/core'
import { useLocation } from 'react-router-dom'
import {
  SIDEBAR_FORM_ASIDE_SHELL_CLASS,
  SIDEBAR_FORM_ASIDE_SHELL_EMBEDDED_CLASS,
  SIDEBAR_FORM_WIZARD_ASIDE_SHELL_CLASS,
  SIDEBAR_FORM_WIZARD_ASIDE_SHELL_EMBEDDED_CLASS,
} from './sidebar-form-layout.classes'

export type FormShellBleed = 'full' | 'x-bottom' | 'none'
export type FormShellSidebarWidth = 'default' | 'wide'

export interface FormShellLayoutProps {
  sidebar?: ReactNode
  children: ReactNode
  sidebarWidth?: FormShellSidebarWidth
  bleed?: FormShellBleed
}

const OUTER_FULLSCREEN_CLASS =
  'flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white md:flex-row md:items-stretch'

const OUTER_EMBEDDED_CLASS =
  'flex min-h-0 min-w-0 flex-col gap-6 md:flex-row md:items-start'

export function FormShellLayout({
  sidebar,
  children,
  sidebarWidth = 'default',
  bleed = 'full',
}: FormShellLayoutProps) {
  const { pathname } = useLocation()
  const isFullscreen = pathname.includes('/new') || pathname.includes('/create')

  const asideClass = isFullscreen
    ? sidebarWidth === 'wide'
      ? SIDEBAR_FORM_WIZARD_ASIDE_SHELL_CLASS
      : SIDEBAR_FORM_ASIDE_SHELL_CLASS
    : sidebarWidth === 'wide'
      ? SIDEBAR_FORM_WIZARD_ASIDE_SHELL_EMBEDDED_CLASS
      : SIDEBAR_FORM_ASIDE_SHELL_EMBEDDED_CLASS

  return (
    <div className={isFullscreen ? OUTER_FULLSCREEN_CLASS : OUTER_EMBEDDED_CLASS}>
      {sidebar && <aside className={asideClass}>{sidebar}</aside>}
      <Box className="min-w-0 flex-1">{children}</Box>
    </div>
  )
}
