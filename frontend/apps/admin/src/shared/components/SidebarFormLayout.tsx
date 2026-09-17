import type { FormEventHandler, ReactNode } from 'react'
import { Box, Group, Paper, Stack, Text, UnstyledButton } from '@mantine/core'
import { useLocation } from 'react-router-dom'
import { isFullscreenFormRoute } from '../../features/layout/isFullscreenFormRoute'
import { SidebarFormAside } from './SidebarFormAside'
import { FormShellLayout } from './FormShellLayout'
import { FormStepper, type FormStepItem } from './FormStepper'

export interface SidebarFormLayoutProps {
  sidebarTitle?: string
  /** Short line under the sidebar title (e.g. Operator CRM). */
  sidebarSubtitle?: string
  sidebarDescription?: ReactNode
  sidebarTips?: string[]
  sidebar?: ReactNode
  /**
   * Multi-step forms: vertical stepper in the left panel;
   * horizontal scroll-x stepper when that panel is collapsed.
   */
  steps?: FormStepItem[]
  activeStep?: number
  onStepChange?: (index: number) => void
  /** Extra content under the stepper (e.g. audit trail on hub swap). */
  sidebarBelowSteps?: ReactNode
  onClose?: () => void
  headerActionLabel?: string
  headerAction?: ReactNode
  children: ReactNode
  footer?: ReactNode
  contentWidth?: number
  onSubmit?: FormEventHandler<HTMLFormElement>
}

export function SidebarFormLayout({
  sidebarTitle,
  sidebarSubtitle,
  sidebarDescription,
  sidebarTips,
  sidebar,
  steps,
  activeStep = 0,
  onStepChange,
  sidebarBelowSteps,
  onClose,
  headerActionLabel = 'Close',
  headerAction,
  children,
  footer,
  contentWidth = 800,
  onSubmit,
}: SidebarFormLayoutProps) {
  const { pathname } = useLocation()
  const fullscreen = isFullscreenFormRoute(pathname)
  // Match FormShellLayout aside breakpoints: fullscreen hides below md; embedded below lg.
  const mobileStepperClass = fullscreen ? 'md:hidden' : 'lg:hidden'

  const hasSteps = Boolean(steps && steps.length > 0)

  const resolvedSidebar =
    sidebar ??
    (sidebarTitle ? (
      <SidebarFormAside
        title={sidebarTitle}
        subtitle={sidebarSubtitle}
        showBrandMark={hasSteps}
        description={sidebarDescription}
        tips={sidebarTips}
        belowSteps={sidebarBelowSteps}
        stepsSlot={
          hasSteps ? (
            <FormStepper
              steps={steps!}
              activeStep={activeStep}
              onStepChange={onStepChange}
              orientation="vertical"
            />
          ) : undefined
        }
      />
    ) : null)

  const header =
    headerAction ??
    (onClose ? (
      <UnstyledButton type="button" onClick={onClose}>
        <Text fz="md" className="text-[var(--mu)] hover:text-[var(--tx)]">
          {headerActionLabel}
        </Text>
      </UnstyledButton>
    ) : null)

  const content = (
    <Box className="flex h-full min-h-0 flex-col">
      {header ? (
        <Group justify="flex-end" mb="md" className="shrink-0">
          {header}
        </Group>
      ) : null}

      <Box className="min-h-0 flex-1 overflow-y-auto pr-1 pb-6">
        <Stack
          gap="xl"
          className="mx-auto w-full min-w-0"
          style={{ maxWidth: contentWidth }}
        >
          {hasSteps ? (
            <div className={mobileStepperClass}>
              <FormStepper
                steps={steps!}
                activeStep={activeStep}
                onStepChange={onStepChange}
                orientation="horizontal"
              />
            </div>
          ) : null}
          {children}
        </Stack>
      </Box>

      {footer ? <Box className="shrink-0">{footer}</Box> : null}
    </Box>
  )

  return (
    <FormShellLayout sidebar={resolvedSidebar}>
      <Paper
        radius={0}
        p={{ base: 'md', sm: 'lg', xl: 'xl' }}
        bg="transparent"
        withBorder={false}
        className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden text-[var(--tx)]"
      >
        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex h-full min-h-0 flex-col">
            {content}
          </form>
        ) : (
          content
        )}
      </Paper>
    </FormShellLayout>
  )
}
