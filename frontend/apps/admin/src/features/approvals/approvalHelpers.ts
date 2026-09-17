import type { ConfigVersionApi } from '@features/platform-config'
import { useCapabilities } from '../auth/useCapabilities'

export const APPROVAL_MODULE_PERMISSION = 'approvals:decide'

export type ApprovalTableRow = {
  id: string
  code: string
  type: string
  subject: string
  requestedBy: string
  submittedAt: string
  status: string
  namespace: string
  note: string
  value: Record<string, unknown>
}

export function namespaceCap(namespace: string): string {
  if (namespace === 'credit') return 'credit:approve'
  if (namespace === 'offers') return 'offers:manage'
  return APPROVAL_MODULE_PERMISSION
}

export function mapConfigVersion(row: ConfigVersionApi): ApprovalTableRow {
  const keys = Object.keys(row.value ?? {})
  const subject =
    row.note?.trim() ||
    (keys.length ? `Update ${keys.slice(0, 3).join(', ')}` : `${row.namespace}/${row.key}`)
  return {
    id: row.id,
    code: row.id.slice(0, 8).toUpperCase(),
    type: row.namespace,
    subject,
    requestedBy:
      row.created_by_label?.trim() ||
      (row.created_by_id ? row.created_by_id.slice(0, 8) : '—'),
    submittedAt: new Date(row.created_at).toLocaleString(),
    status: row.status,
    namespace: row.namespace,
    note: row.note ?? '',
    value: row.value ?? {},
  }
}

export function approvalTone(status: string) {
  if (status === 'ACTIVE' || status === 'APPROVED') return 'success' as const
  if (status === 'PENDING') return 'warning' as const
  return 'danger' as const
}

export function permissionLabel(code: string): string {
  if (code === APPROVAL_MODULE_PERMISSION) return 'Decide Approvals'
  if (code === 'credit:approve') return 'Approve Working Capital'
  if (code === 'offers:manage') return 'Manage Offers'
  return code
}

export function useCanApproveNamespace(namespace: string) {
  const { can } = useCapabilities()
  return can(namespaceCap(namespace)) || can(APPROVAL_MODULE_PERMISSION)
}

export function sourcePathForNamespace(namespace: string): string {
  if (namespace === 'credit') return '/credit?tab=settings'
  if (namespace === 'offers') return '/offers'
  return '/approvals'
}
