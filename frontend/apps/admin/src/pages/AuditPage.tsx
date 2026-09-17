import { Navigate, useParams } from 'react-router-dom'
import { AuditPanel } from '@features/audit'

/** Audit has no dedicated detail page — row opens a modal on the list. */
export default function AuditPage() {
  const { id } = useParams<{ id?: string }>()
  if (id) return <Navigate to="/audit" replace />
  return <AuditPanel />
}
