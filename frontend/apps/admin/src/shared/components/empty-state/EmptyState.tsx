import { Center, Stack, Text } from '@mantine/core'
import { InboxIcon } from 'hugeicons-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: ReactNode
}

export function EmptyState({
  title = 'No Records Found',
  description = 'No records found',
  icon,
}: EmptyStateProps) {
  return (
    <Center mih={280} py="xl" px="lg">
      <Stack align="center" gap="sm" maw={360}>
        <Center
          w={56}
          h={56}
          className="rounded-full bg-[var(--in)] text-[var(--mu)]"
        >
          {icon ?? <InboxIcon size={24} />}
        </Center>
        <Stack gap={4} align="center">
          <Text fw={600} fz="md" className="text-[var(--tx)]" ta="center">
            {title}
          </Text>
          <Text fz="sm" className="text-[var(--mu)]" ta="center" lh={1.6}>
            {description}
          </Text>
        </Stack>
      </Stack>
    </Center>
  )
}
