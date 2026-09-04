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
          className="rounded-full bg-[#F9FAFB] text-[#667085]"
        >
          {icon ?? <InboxIcon size={24} />}
        </Center>
        <Stack gap={4} align="center">
          <Text fw={600} fz="md" c="#101828" ta="center">
            {title}
          </Text>
          <Text fz="sm" c="#667085" ta="center" lh={1.6}>
            {description}
          </Text>
        </Stack>
      </Stack>
    </Center>
  )
}
