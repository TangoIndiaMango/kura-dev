import React from 'react'
import { RouterProvider } from 'react-router-dom'
import { AppProviders } from '@shared/providers/AppProviders'
import { router } from '@lib/config/routes'

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
