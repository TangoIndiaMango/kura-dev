import type { FormEventHandler, ReactNode } from 'react'
import { Box, Group, Paper, Stack, Text, UnstyledButton } from '@mantine/core'
import { SidebarFormAside } from './SidebarFormAside'
import { SidebarTipsList } from './SidebarTipsList'
import { FormShellLayout } from './FormShellLayout'

export interface SidebarFormLayoutProps {
  sidebarTitle?: string
  sidebarDescription?: ReactNode
  sidebarTips?: string[]
  sidebar?: ReactNode
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
  sidebarDescription,
  sidebarTips,
  sidebar,
  onClose,
  headerActionLabel = 'Close',
  headerAction,
  children,
  footer,
  contentWidth = 800,
  onSubmit,
}: SidebarFormLayoutProps) {
  const resolvedSidebar =
    sidebar ??
    (sidebarTitle ? (
      <SidebarFormAside
        title={sidebarTitle}
        description={
          sidebarTips ? (
            <SidebarTipsList tips={sidebarTips} />
          ) : (
            sidebarDescription
          )
        }
      />
    ) : null)

  const header =
    headerAction ??
    (onClose ? (
      <UnstyledButton type="button" onClick={onClose}>
        <Text fz="md" c="gray.6">
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
        bg="white"
        className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
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
