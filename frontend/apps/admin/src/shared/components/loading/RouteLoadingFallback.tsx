import { Center, Loader, Progress, Stack, Text } from '@mantine/core'
import { useLocation } from 'react-router-dom'
import { ZapIcon } from 'hugeicons-react'

const AUTH_PATHS = ['/login', '/sign-up', '/create-password', '/reset-password'] as const

function isFullViewportPath(pathname: string) {
  if (pathname === '/') return true
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
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
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0D7C8F] to-[#2FBECF] flex items-center justify-center shadow-lg shadow-cyan-950/40 animate-pulse">
          <ZapIcon size={28} color="#ffffff" />
        </div>

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
            Connecting to KURA Network...
          </Text>
        </Stack>
      </Stack>
    </Center>
  )
}
