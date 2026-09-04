import { Group, Paper, Skeleton, Stack } from '@mantine/core'
import { LoadingState } from '../table/LoadingState'

export function DetailPageLoadingSkeleton() {
  return (
    <Stack gap="lg" w="100%" aria-live="polite" aria-busy="true" role="status">
      <Paper withBorder radius="lg" p="lg" bg="white">
        <Stack gap="lg">
          <Group justify="space-between" wrap="wrap">
            <Group gap="sm">
              <Skeleton height={36} width={280} radius="sm" />
              <Skeleton height={24} width={80} radius="xl" />
            </Group>
            <Skeleton height={36} width={120} radius="md" />
          </Group>
          <Group gap="md">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} height={32} width={100} radius="sm" />
            ))}
          </Group>
        </Stack>
      </Paper>
      <LoadingState cols={4} rows={4} variant="inline" />
    </Stack>
  )
}
