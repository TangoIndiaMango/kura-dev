import { useParams } from 'react-router-dom'
import { ApprovalsPanel } from '@features/approvals/ApprovalsPanel'
import { ApprovalsDetailPanel } from '@features/approvals/ApprovalsDetailPanel'

export default function ApprovalsPage() {
  const { id } = useParams<{ id?: string }>()
  if (id) return <ApprovalsDetailPanel />
  return <ApprovalsPanel />
}
