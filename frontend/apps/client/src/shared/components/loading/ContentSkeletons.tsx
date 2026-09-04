import {
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
} from '@mantine/core'

export function CardGridSkeleton({
  count = 6,
  cols = { base: 1, sm: 2, lg: 3 },
  withMedia = true,
}: {
  count?: number
  cols?: { base?: number; sm?: number; md?: number; lg?: number }
  withMedia?: boolean
}) {
  return (
    <SimpleGrid cols={cols} spacing="md">
      {Array.from({ length: count }).map((_, index) => (
        <Paper key={index} withBorder radius="md" p="md" bg="white">
          <Stack gap="md">
            {withMedia ? <Skeleton height={120} radius="md" /> : null}
            <Skeleton height={16} width="75%" radius="sm" />
            <Skeleton height={12} width="40%" radius="sm" />
            <Skeleton height={8} radius="xl" />
            <Group justify="space-between" mt={4}>
              <Skeleton height={12} width={72} radius="sm" />
              <Skeleton height={32} width={88} radius="sm" />
            </Group>
          </Stack>
        </Paper>
      ))}
    </SimpleGrid>
  )
}

export function ProfileSummarySkeleton() {
  return (
    <Paper withBorder radius="lg" p="lg" bg="white">
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <Group gap="md" wrap="nowrap">
          <Skeleton height={72} width={72} circle />
          <Stack gap={8}>
            <Skeleton height={18} width={160} radius="sm" />
            <Skeleton height={12} width={110} radius="sm" />
          </Stack>
        </Group>
        <Skeleton height={36} width={120} radius="sm" />
      </Group>
    </Paper>
  )
}

export function DetailPageSkeleton({
  sections = 2,
  fieldsPerSection = 6,
  withHero = false,
}: {
  sections?: number
  fieldsPerSection?: number
  withHero?: boolean
}) {
  return (
    <Stack gap="lg">
      <Stack gap={8}>
        <Skeleton height={12} width={180} radius="sm" />
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Skeleton height={28} width={220} radius="sm" />
          <Group gap="sm">
            <Skeleton height={36} width={120} radius="sm" />
            <Skeleton height={36} width={130} radius="sm" />
          </Group>
        </Group>
      </Stack>

      {withHero ? <Skeleton height={200} radius="md" /> : null}

      {Array.from({ length: sections }).map((_, sectionIndex) => (
        <Paper key={sectionIndex} withBorder radius="md" p="lg" bg="white">
          <Skeleton height={16} width={160} mb="lg" radius="sm" />
          {sectionIndex === 0 ? (
            <Group gap="md" mb="xl">
              <Skeleton height={88} width={88} circle />
              <Stack gap={8}>
                <Skeleton height={18} width={180} radius="sm" />
                <Skeleton height={12} width={100} radius="sm" />
              </Stack>
            </Group>
          ) : null}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            {Array.from({ length: fieldsPerSection }).map((_, fieldIndex) => (
              <Stack key={fieldIndex} gap={6}>
                <Skeleton height={10} width={90} radius="sm" />
                <Skeleton height={14} width="70%" radius="sm" />
              </Stack>
            ))}
          </SimpleGrid>
        </Paper>
      ))}
    </Stack>
  )
}

export function SplitPanelSkeleton() {
  return (
    <Paper withBorder radius="lg" bg="white" className="overflow-hidden">
      <Group align="stretch" gap={0} wrap="nowrap" className="flex-col lg:flex-row">
        <Stack gap="lg" p="xl" className="flex-1 min-w-0">
          <Stack gap={8}>
            <Skeleton height={24} width="70%" radius="sm" />
            <Skeleton height={12} width="45%" radius="sm" />
          </Stack>
          {Array.from({ length: 3 }).map((_, index) => (
            <Group key={index} justify="space-between" wrap="nowrap">
              <Stack gap={6} className="flex-1">
                <Skeleton height={14} width="55%" radius="sm" />
                <Skeleton height={10} width="35%" radius="sm" />
              </Stack>
              <Skeleton height={32} width={88} radius="sm" />
            </Group>
          ))}
        </Stack>
        <Stack
          gap="md"
          p="xl"
          className="w-full lg:w-[320px] border-t lg:border-t-0 lg:border-l border-gray-100"
        >
          <Skeleton height={16} width={120} radius="sm" />
          <Skeleton height={12} width="100%" radius="sm" />
          <Skeleton height={12} width="80%" radius="sm" />
          <Skeleton height={40} radius="sm" mt="md" />
        </Stack>
      </Group>
    </Paper>
  )
}

export function NotificationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Stack gap="md">
      {Array.from({ length: count }).map((_, index) => (
        <Paper key={index} withBorder radius="md" p="md" bg="white">
          <Group align="flex-start" wrap="nowrap" gap="md">
            <Skeleton height={40} width={40} radius="md" />
            <Stack gap={8} className="flex-1 min-w-0">
              <Skeleton height={14} width="55%" radius="sm" />
              <Skeleton height={10} width="90%" radius="sm" />
              <Skeleton height={10} width="35%" radius="sm" />
            </Stack>
          </Group>
        </Paper>
      ))}
    </Stack>
  )
}

export function DrawerContentSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Stack gap="lg" py="sm">
      <Stack gap={8}>
        <Skeleton height={14} width="70%" radius="sm" />
        <Skeleton height={22} width={100} radius="sm" />
      </Stack>
      {Array.from({ length: rows }).map((_, index) => (
        <Stack key={index} gap={6}>
          <Skeleton height={10} width={80} radius="sm" />
          <Skeleton height={14} width="60%" radius="sm" />
        </Stack>
      ))}
      <Skeleton height={72} radius="md" />
      <Skeleton height={48} radius="md" />
    </Stack>
  )
}

export function FormPageSkeleton() {
  return (
    <Group align="flex-start" gap="xl" wrap="wrap">
      <Stack gap="lg" className="flex-1 min-w-[280px]">
        <Paper withBorder radius="md" p="lg" bg="white">
          <Skeleton height={16} width={140} mb="lg" radius="sm" />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            {Array.from({ length: 8 }).map((_, index) => (
              <Stack key={index} gap={6}>
                <Skeleton height={10} width={90} radius="sm" />
                <Skeleton height={36} radius="sm" />
              </Stack>
            ))}
          </SimpleGrid>
        </Paper>
        <Group justify="flex-end" gap="sm">
          <Skeleton height={36} width={90} radius="sm" />
          <Skeleton height={36} width={120} radius="sm" />
        </Group>
      </Stack>
      <Paper withBorder radius="md" p="lg" bg="white" className="w-full max-w-sm">
        <Skeleton height={16} width={100} mb="md" radius="sm" />
        <Stack gap="sm">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} height={12} radius="sm" />
          ))}
        </Stack>
      </Paper>
    </Group>
  )
}
