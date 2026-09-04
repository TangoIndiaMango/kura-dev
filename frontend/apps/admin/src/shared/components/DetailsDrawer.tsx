import type { ReactNode } from 'react'
import {
  ActionIcon,
  Box,
  Divider,
  Drawer,
  Group,
  Stack,
  Text,
} from '@mantine/core'
import { Cancel01Icon } from 'hugeicons-react'

export interface DetailsDrawerRow {
  label: string
  value: ReactNode
}

export interface DetailsDrawerProps {
  opened: boolean
  onClose: () => void
  title: string
  rows?: DetailsDrawerRow[]
  size?: number | string
  children?: ReactNode
  headerExtra?: ReactNode
  footer?: ReactNode
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
}: DetailsDrawerProps) {
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
            <Text fw={700} fz="lg" c="dark.8">
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
              <Group
                justify="space-between"
                align="flex-start"
                wrap="nowrap"
                gap="md"
                py="md"
              >
                <Text fz="sm" c="gray.6" className="shrink-0">
                  {row.label}
                </Text>
                {typeof row.value === 'string' || typeof row.value === 'number' ? (
                  <Text fz="sm" fw={600} c="dark.8" ta="right" className="min-w-0">
                    {row.value}
                  </Text>
                ) : (
                  <div className="min-w-0 text-right">{row.value}</div>
                )}
              </Group>
              {index < rows.length - 1 ? <Divider color="gray.2" /> : null}
            </Stack>
          ))}
          {children}
        </Stack>

        {footer ? (
          <Box
            pt="md"
            style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}
            className="shrink-0"
          >
            {footer}
          </Box>
        ) : null}
      </Stack>
    </Drawer>
  )
}
