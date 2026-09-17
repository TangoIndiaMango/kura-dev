import { Navigate, useParams } from 'react-router-dom'
import { NotificationsPanel } from '@features/notifications'

/** Notifications have no detail page — tap opens a drawer on the inbox. */
export default function NotificationsPage() {
  const { id } = useParams<{ id?: string }>()
  if (id) return <Navigate to="/notifications" replace />
  return <NotificationsPanel />
}
