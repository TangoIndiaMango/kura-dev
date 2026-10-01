import { Navigate } from 'react-router-dom'
import { Skeleton } from '@mantine/core'
import { AdminDashboardView } from '@features/dashboard/AdminDashboardView'
import { useAuth, useCapabilities } from '@features/auth'

export default function DashboardPage() {
  const { status } = useAuth()
  const { can } = useCapabilities()

  if (status === 'loading') {
    return <Skeleton height={280} radius="md" />
  }

  if (!can('hubs:manage')) {
    return <Navigate to="/hubs" replace />
  }

  return <AdminDashboardView />
}
