import { Group, Paper, SimpleGrid, Skeleton, Stack } from '@mantine/core'
import { LoadingState } from '../table/LoadingState'

export function PageLoadingSkeleton() {
  return (
    <Stack gap="lg" w="100%" aria-live="polite" aria-busy="true" role="status">
      <Paper withBorder radius="lg" p="lg" bg="white">
        <Stack gap="md">
          <Group justify="space-between" wrap="wrap">
            <Skeleton height={20} width={180} radius="sm" />
            <Skeleton height={36} width={200} radius="md" />
          </Group>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} height={72} radius="md" />
            ))}
          </SimpleGrid>
        </Stack>
      </Paper>

      <Paper withBorder radius="lg" p="lg" bg="white">
        <Stack gap="lg">
          <Group justify="space-between" wrap="wrap">
            <Skeleton height={36} width={280} radius="md" />
            <Group gap="sm">
              <Skeleton height={36} width={120} radius="md" />
              <Skeleton height={36} width={100} radius="md" />
            </Group>
          </Group>
          <LoadingState cols={5} rows={5} variant="inline" />
        </Stack>
      </Paper>
    </Stack>
  )
}
