import {
  Paper,
  Stack,
  Title,
  Text,
  Button,
  ThemeIcon,
  Center,
  Group,
} from '@mantine/core'
import { Alert02Icon } from 'hugeicons-react'
import { Link } from 'react-router-dom'
import { getErrorMessage, getErrorTitle } from './error.utils'

export interface ErrorFallbackProps {
  error?: unknown
  title?: string
  message?: string
  homeTo?: string
  homeLabel?: string
  showReload?: boolean
}

export function ErrorFallback({
  error,
  title,
  message,
  homeTo = '/',
  homeLabel = 'Back to Home',
  showReload = true,
}: ErrorFallbackProps) {
  const resolvedTitle = title ?? getErrorTitle(error)
  const resolvedMessage = message ?? getErrorMessage(error)

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <Paper withBorder radius="md" bg="white" w="100%">
      <Center mih={420} p="xl">
        <Stack align="center" gap="md" maw={520}>
          <ThemeIcon size={72} radius="xl" color="red.0" c="red.7" variant="light">
            <Alert02Icon size={36} />
          </ThemeIcon>

          <Stack gap="xs" align="center">
            <Title order={3} c="brand.9" ta="center">
              {resolvedTitle}
            </Title>
            <Text c="gray.6" fz="sm" ta="center" lh={1.6}>
              {resolvedMessage}
            </Text>
            <Text c="gray.5" fz="xs" ta="center">
              Return to a safe page while we recover.
            </Text>
          </Stack>

          <Group gap="sm" justify="center">
            {showReload ? (
              <Button variant="default" onClick={handleReload}>
                Reload page
              </Button>
            ) : null}

            <Button component={Link} to={homeTo} color="brand">
              {homeLabel}
            </Button>
          </Group>
        </Stack>
      </Center>
    </Paper>
  )
}
