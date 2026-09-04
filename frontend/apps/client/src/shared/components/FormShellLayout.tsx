import type { ReactNode } from 'react'
import { Box } from '@mantine/core'
import {
  SIDEBAR_FORM_ASIDE_SHELL_CLASS,
  SIDEBAR_FORM_WIZARD_ASIDE_SHELL_CLASS,
} from './sidebar-form-layout.classes'

export type FormShellBleed = 'full' | 'x-bottom' | 'none'
export type FormShellSidebarWidth = 'default' | 'wide'

export interface FormShellLayoutProps {
  sidebar?: ReactNode
  children: ReactNode
  sidebarWidth?: FormShellSidebarWidth
  bleed?: FormShellBleed
}

const OUTER_CLASS =
  'flex min-h-0 min-w-0 flex-col bg-white lg:min-h-[calc(100dvh-120px)] lg:flex-row lg:items-stretch'

const BLEED_CLASS: Record<FormShellBleed, string> = {
  full: '-m-lg',
  'x-bottom': '-mx-lg -mb-lg',
  none: '',
}

export function FormShellLayout({
  sidebar,
  children,
  sidebarWidth = 'default',
  bleed = 'full',
}: FormShellLayoutProps) {
  const shellClass =
    sidebarWidth === 'wide'
      ? SIDEBAR_FORM_WIZARD_ASIDE_SHELL_CLASS
      : SIDEBAR_FORM_ASIDE_SHELL_CLASS

  const bleedClass = BLEED_CLASS[bleed]

  return (
    <Box className={[bleedClass, OUTER_CLASS].filter(Boolean).join(' ')}>
      {sidebar ? <Box className={shellClass}>{sidebar}</Box> : null}
      <Box className="min-w-0 flex-1 self-stretch">{children}</Box>
    </Box>
  )
}
