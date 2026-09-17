import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Drawer,
  Group,
  Stack,
  Text,
} from '@mantine/core'
import { ArrowRight01Icon, Cancel01Icon } from 'hugeicons-react'

export interface DetailsDrawerRow {
  label: string
  value: ReactNode
}

export interface DetailsDrawerViewMore {
  /** Full entity detail route — peek stays light; this opens the real page. */
  to: string
  label?: string
}

export interface DetailsDrawerProps {
  opened: boolean
  onClose: () => void
  title: string
  /** Keep short — identity + a few facts. Full story lives on the detail page. */
  rows?: DetailsDrawerRow[]
  size?: number | string
  children?: ReactNode
  headerExtra?: ReactNode
  /** Mutations / filter apply. Prefer `viewMore` for navigation. */
  footer?: ReactNode
  /**
   * Sticky footer CTA to the module detail page.
   * Chosen over header so it never fights the close control and stays visible.
   */
  viewMore?: DetailsDrawerViewMore
}

export function DetailsDrawer({
  opened,
  onClose,
  title,
  rows = [],
  size = 420,
  children,
  headerExtra,
  footer,
  viewMore,
}: DetailsDrawerProps) {
  const resolvedFooter = footer ?? (
    viewMore ? (
      <Button
        component={Link}
        to={viewMore.to}
        onClick={onClose}
        fullWidth
        variant="light"
        rightSection={<ArrowRight01Icon size={16} />}
        className="text-[var(--pr)]"
      >
        {viewMore.label ?? 'View more'}
      </Button>
    ) : null
  )

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={size}
      padding={0}
      withCloseButton={false}
      overlayProps={{ backgroundOpacity: 0.35 }}
      styles={{
        inner: {
          padding: 16,
          justifyContent: 'flex-end',
          alignItems: 'stretch',
        },
        content: {
          borderRadius: 16,
          height: 'calc(100% - 32px)',
          marginBlock: 'auto',
          boxShadow: '0 12px 40px rgba(16, 24, 40, 0.12)',
        },
        body: {
          height: '100%',
          padding: 0,
        },
      }}
    >
      <Stack gap="lg" p="xl" className="h-full">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="sm" wrap="wrap" className="min-w-0">
            <Text fw={700} fz="lg" className="text-[var(--tx)]">
              {title}
            </Text>
            {headerExtra}
          </Group>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0"
          >
            <Cancel01Icon size={18} />
          </ActionIcon>
        </Group>

        <Stack gap="lg" className="min-h-0 flex-1 overflow-y-auto">
          {rows.map((row, index) => (
            <Stack key={`${row.label}-${index}`} gap={0}>
              <Stack gap={6} py="md">
                <Text fz="xs" fw={600} className="uppercase tracking-wide text-[var(--su)]">
                  {row.label}
                </Text>
                {typeof row.value === 'string' || typeof row.value === 'number' ? (
                  <Text fz="sm" fw={600} className="text-[var(--tx)]">
                    {row.value}
                  </Text>
                ) : (
                  <div className="min-w-0 text-[var(--tx)]">{row.value}</div>
                )}
              </Stack>
              {index < rows.length - 1 ? (
                <Divider color="var(--bd)" />
              ) : null}
            </Stack>
          ))}
          {children}
        </Stack>

        {resolvedFooter ? (
          <Box
            pt="md"
            style={{ borderTop: '1px solid var(--bd)' }}
            className="shrink-0"
          >
            {resolvedFooter}
          </Box>
        ) : null}
      </Stack>
    </Drawer>
  )
}
