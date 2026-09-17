import React from 'react'
import { MantineProvider, localStorageColorSchemeManager } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { theme } from '@lib/config/theme'
import { OperatorSessionProvider } from '@shared/session'
import { ColorSchemeSync } from './ColorSchemeSync'
import { AuthProvider } from '../../features/auth/AuthProvider'

const colorSchemeManager = localStorageColorSchemeManager({
  key: 'kura-operator-color-scheme',
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
})

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider
        theme={theme}
        defaultColorScheme="dark"
        colorSchemeManager={colorSchemeManager}
      >
        <ColorSchemeSync />
        <ModalsProvider>
          <Notifications position="top-center" limit={3} zIndex={9999} />
          <AuthProvider>
            <OperatorSessionProvider>{children}</OperatorSessionProvider>
          </AuthProvider>
        </ModalsProvider>
      </MantineProvider>
    </QueryClientProvider>
  )
}
