import { Center, Loader, Progress, Stack, Text } from '@mantine/core'
import { useLocation } from 'react-router-dom'

const AUTH_PATHS = [
  '/login',
  '/sign-up',
  '/create-password',
  '/reset-password',
  '/workbench',
] as const

function isFullViewportPath(pathname: string) {
  if (pathname === '/') return true
  return AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
}

export function RouteLoadingFallback() {
  const { pathname } = useLocation()
  const authRoute = isFullViewportPath(pathname)

  return (
    <Center
      w="100%"
      h={authRoute ? '100dvh' : 'calc(100dvh - 4.5rem)'}
      mih={authRoute ? '100dvh' : 'calc(100dvh - 4.5rem)'}
      bg="transparent"
      pos={authRoute ? 'fixed' : 'relative'}
      top={authRoute ? 0 : undefined}
      left={authRoute ? 0 : undefined}
      right={authRoute ? 0 : undefined}
      bottom={authRoute ? 0 : undefined}
      style={
        authRoute
          ? { zIndex: 100 }
          : {
              margin: 'calc(-1 * var(--mantine-spacing-lg))',
              width: 'calc(100% + 2 * var(--mantine-spacing-lg))',
            }
      }
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <Stack align="center" gap="xl" w={220}>
        <img
          src="/brand/kura-mark.png"
          alt=""
          width={48}
          height={48}
          className="rounded-[12px] bg-[#050b10] object-contain p-1.5"
          aria-hidden
        />

        <Stack align="center" gap="md" w="100%">
          <Progress
            value={100}
            animated
            striped
            color="brand"
            size="xs"
            radius="xl"
            w="100%"
            aria-hidden
          />
          <Loader color="brand" type="dots" size="sm" aria-label="Loading page" />
          <Text fz="xs" c="dimmed" ta="center">
            Loading…
          </Text>
        </Stack>
      </Stack>
    </Center>
  )
}
