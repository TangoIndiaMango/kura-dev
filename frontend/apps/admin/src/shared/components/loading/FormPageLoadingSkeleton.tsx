import { Grid, Paper, Skeleton, Stack } from '@mantine/core'

export function FormPageLoadingSkeleton() {
  return (
    <Grid gutter="lg" aria-live="polite" aria-busy="true" role="status">
      <Grid.Col span={{ base: 12, md: 4 }}>
        <Paper withBorder radius="lg" p="lg" bg="white">
          <Stack gap="md">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} height={48} radius="md" />
            ))}
          </Stack>
        </Paper>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 8 }}>
        <Paper withBorder radius="lg" p="lg" bg="white">
          <Stack gap="md">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} height={index === 2 ? 120 : 40} radius="md" />
            ))}
          </Stack>
        </Paper>
      </Grid.Col>
    </Grid>
  )
}
