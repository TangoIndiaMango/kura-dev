import type { ReactNode } from 'react'
import { Image, Paper, Stack, Text } from '@mantine/core'
import { themeColors } from '@/lib/config/theme'
import { SIDEBAR_FORM_ASIDE_PANEL_CLASS } from './sidebar-form-layout.classes'
import { SidebarTipsList } from './SidebarTipsList'

export interface SidebarFormAsideProps {
  title: string
  description?: ReactNode
  tips?: string[]
  logoSrc?: string
  logoWidth?: number
}

export function SidebarFormAside({
  title,
  description,
  tips,
  logoSrc,
  logoWidth = 48,
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
      className={SIDEBAR_FORM_ASIDE_PANEL_CLASS}
      radius="md"
      p="lg"
      bg={themeColors.lightGreenBg}
      withBorder
    >
      <Stack gap="md">
        {logoSrc && (
          <Image src={logoSrc} alt="" w={logoWidth} fit="contain" aria-hidden />
        )}
        <Text fw={700} size="md" c={themeColors.primaryGreen}>
          {title}
        </Text>
        {body}
      </Stack>
    </Paper>
  )
}
