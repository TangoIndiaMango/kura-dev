import {
  Paper,
  Stack,
  Title,
  Text,
  Button,
  ThemeIcon,
  Center,
  Group,
  Code,
} from '@mantine/core'
import { Alert02Icon } from 'hugeicons-react'
import { Link } from 'react-router-dom'
import { getErrorDetails, getErrorMessage, getErrorTitle } from './error.utils'

export interface ErrorFallbackProps {
  error?: unknown
  title?: string
  message?: string
  homeTo?: string
  homeLabel?: string
  showReload?: boolean
  onReset?: () => void
}

export function ErrorFallback({
  error,
  title,
  message,
  homeTo = '/',
  homeLabel = 'Back to dashboard',
  showReload = true,
  onReset,
}: ErrorFallbackProps) {
  const resolvedTitle = title ?? getErrorTitle(error)
  const resolvedMessage = message ?? getErrorMessage(error)
  const details = import.meta.env.DEV ? getErrorDetails(error) : undefined

  const handleReload = () => {
    onReset?.()
    window.location.reload()
  }

  return (
    <Center mih="70dvh" p="xl">
      <Paper
        withBorder
        radius="lg"
        p="xl"
        maw={520}
        w="100%"
        bg="var(--mantine-color-body)"
        style={{ borderColor: 'var(--mantine-color-default-border)' }}
      >
        <Stack align="center" gap="md">
          <ThemeIcon size={72} radius="xl" color="red" variant="light">
            <Alert02Icon size={36} />
          </ThemeIcon>

          <Stack gap="xs" align="center">
            <Title order={3} ta="center">
              {resolvedTitle}
            </Title>
            <Text c="dimmed" fz="sm" ta="center" lh={1.6}>
              {resolvedMessage}
            </Text>
            <Text c="dimmed" fz="xs" ta="center">
              Your work is safe. Reload or return to the dashboard.
            </Text>
          </Stack>

          {details ? (
            <Code
              block
              w="100%"
              mah={140}
              style={{ overflow: 'auto', fontSize: 10 }}
            >
              {details}
            </Code>
          ) : null}

          <Group gap="sm" justify="center" wrap="wrap">
            {showReload ? (
              <Button variant="default" onClick={handleReload}>
                Reload page
              </Button>
            ) : null}
            {onReset && !showReload ? (
              <Button variant="default" onClick={onReset}>
                Try again
              </Button>
            ) : null}
            <Button
              component={Link}
              to={homeTo}
              color="brand"
              onClick={() => onReset?.()}
            >
              {homeLabel}
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Center>
  )
}
