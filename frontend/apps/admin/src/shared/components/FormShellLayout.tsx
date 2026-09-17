import type { ReactNode } from 'react'
import { Box } from '@mantine/core'
import { useLocation } from 'react-router-dom'
import { isFullscreenFormRoute } from '../../features/layout/isFullscreenFormRoute'
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

/** Single surface fill — content column Paper must stay transparent (no nested --sf). */
const OUTER_FULLSCREEN_CLASS =
  'flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--sf)] md:flex-row md:items-stretch'

const OUTER_EMBEDDED_CLASS =
  'flex min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--sf)] lg:min-h-[calc(100dvh-120px)] lg:flex-row lg:items-stretch'

const BLEED_CLASS: Record<FormShellBleed, string> = {
  full: '-m-4 sm:-mx-6 sm:-mb-10 sm:-mt-0',
  'x-bottom': '-mx-4 sm:-mx-6 -mb-10',
  none: '',
}

export function FormShellLayout({
  sidebar,
  children,
  sidebarWidth = 'default',
  bleed,
}: FormShellLayoutProps) {
  const { pathname } = useLocation()
  const fullscreen = isFullscreenFormRoute(pathname)
  const resolvedBleed = bleed ?? (fullscreen ? 'none' : 'full')

  const shellClass =
    sidebarWidth === 'wide'
      ? fullscreen
        ? SIDEBAR_FORM_WIZARD_ASIDE_SHELL_CLASS
        : SIDEBAR_FORM_WIZARD_ASIDE_SHELL_EMBEDDED_CLASS
      : fullscreen
        ? SIDEBAR_FORM_ASIDE_SHELL_CLASS
        : SIDEBAR_FORM_ASIDE_SHELL_EMBEDDED_CLASS

  const outerClass = fullscreen ? OUTER_FULLSCREEN_CLASS : OUTER_EMBEDDED_CLASS
  const bleedClass = BLEED_CLASS[resolvedBleed]

  return (
    <Box className={[bleedClass, outerClass].filter(Boolean).join(' ')}>
      {sidebar ? <Box className={shellClass}>{sidebar}</Box> : null}
      <Box className="flex min-h-0 min-w-0 flex-1 flex-col self-stretch overflow-hidden">
        {children}
      </Box>
    </Box>
  )
}
