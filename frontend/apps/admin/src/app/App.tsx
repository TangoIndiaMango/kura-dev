import React from 'react'
import { RouterProvider } from 'react-router-dom'
import { AppProviders } from '@shared/providers/AppProviders'
import { router } from '@lib/config/routes'
import { ErrorBoundary } from '@shared/components/error'

export default function App() {
  return (
    <AppProviders>
      <ErrorBoundary homeTo="/" homeLabel="Back to dashboard">
        <RouterProvider router={router} />
      </ErrorBoundary>
    </AppProviders>
  )
}
