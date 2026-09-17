import type { ReactNode } from 'react'
import { Paper, Stack, Text } from '@mantine/core'
import { SIDEBAR_FORM_ASIDE_PANEL_CLASS } from './sidebar-form-layout.classes'
import { SidebarTipsList } from './SidebarTipsList'
import { KuraLogo } from './KuraLogo'

export interface SidebarFormAsideProps {
  title: string
  /** Line under the title (e.g. Operator CRM). */
  subtitle?: string
  description?: ReactNode
  tips?: string[]
  /** Vertical stepper or other mid-aside content. */
  stepsSlot?: ReactNode
  /** Extra block under steps (e.g. hub swap audit trail). */
  belowSteps?: ReactNode
  /** Show K mark above the title (wizard / create flows). */
  showBrandMark?: boolean
  logoSrc?: string
  logoWidth?: number
}

export function SidebarFormAside({
  title,
  subtitle,
  description,
  tips,
  stepsSlot,
  belowSteps,
  showBrandMark = false,
  logoSrc,
  logoWidth = 40,
}: SidebarFormAsideProps) {
  const body = tips ? (
    <SidebarTipsList tips={tips} />
  ) : typeof description === 'string' ? (
    <Text size="sm" c="dimmed" lh={1.6}>
      {description}
    </Text>
  ) : (
    description
  )

  return (
    <Paper
      className={`${SIDEBAR_FORM_ASIDE_PANEL_CLASS} rounded-none border-0 border-r border-[var(--bd)] md:rounded-none`}
      radius={0}
      p="lg"
      bg="var(--prs)"
      withBorder={false}
      style={{ borderColor: 'var(--bd)' }}
    >
      <Stack gap="lg" className="h-full min-h-0">
        {showBrandMark ? <KuraLogo size="sm" iconOnly /> : null}
        {logoSrc && !showBrandMark ? (
          <img src={logoSrc} alt="" width={logoWidth} className="object-contain" aria-hidden />
        ) : null}

        <div>
          <Text fw={700} size="md" className="text-[var(--tx)]">
            {title}
          </Text>
          {subtitle ? (
            <Text size="sm" c="dimmed" mt={4}>
              {subtitle}
            </Text>
          ) : null}
        </div>

        {stepsSlot}

        {belowSteps ? (
          <div className="min-h-0 flex-1 overflow-y-auto">{belowSteps}</div>
        ) : null}

        {description && !tips ? body : null}
        {tips ? <div className="mt-auto shrink-0">{body}</div> : null}
      </Stack>
    </Paper>
  )
}
