import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { notifications } from '@mantine/notifications'
import {
  AdminConfirmModal,
  AdminDetailPage,
  DetailPageLoadingSkeleton,
  KuraIllustrationModal,
  type AdminDetailAction,
  type KuraIllustrationId,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import { downloadCsv } from '@shared/utils/downloadCsv'
import { PermissionsMatrix } from './components/PermissionsMatrix'
import { roleHasWriteAccess } from './rolesData'
import {
  useActivateRole,
  useDeactivateRole,
  useRole,
  useRoles,
} from './hooks/use-users'

type ActionId = 'edit' | 'duplicate' | 'deactivate' | 'activate' | 'export'

const ACTION_META: Record<
  ActionId,
  {
    confirmTitle: string
    confirmBody: string
    illustrationId: KuraIllustrationId
    confirmTone?: 'primary' | 'danger'
    reasonRequired?: boolean
    successTitle: string
  }
> = {
  edit: {
    confirmTitle: 'Edit this role?',
    confirmBody: 'Opens the role for permission and detail changes.',
    illustrationId: 'record-saved',
    successTitle: 'Ready to edit',
  },
  duplicate: {
    confirmTitle: 'Duplicate this role?',
    confirmBody: 'Creates a draft copy with the same permissions.',
    illustrationId: 'duplicated',
    successTitle: 'Role duplicated',
  },
  deactivate: {
    confirmTitle: 'Deactivate this role?',
    confirmBody:
      'Assigned users keep the role but lose capabilities until reactivation. System roles cannot be deactivated.',
    illustrationId: 'account-suspended',
    confirmTone: 'danger',
    reasonRequired: true,
    successTitle: 'Role deactivated',
  },
  activate: {
    confirmTitle: 'Activate this role?',
    confirmBody: 'Restores capabilities for users assigned to this role.',
    illustrationId: 'account-verified',
    successTitle: 'Role activated',
  },
  export: {
    confirmTitle: 'Export this role record?',
    confirmBody: 'Downloads a CSV snapshot of the role and its permissions.',
    illustrationId: 'record-exported',
    successTitle: 'Export ready',
  },
}

export function RoleDetailPanel() {
  const { code, id } = useParams<{ code?: string; id?: string }>()
  const navigate = useNavigate()
  const roleKey = id ?? code ?? ''
  const looksLikeUuid = /^[0-9a-f-]{36}$/i.test(roleKey)

  // Resolve code → id via lean list only when URL isn't already an id.
  const list = useRoles({
    page_size: 100,
    enabled: Boolean(roleKey) && !looksLikeUuid,
  })
  const resolvedId = useMemo(() => {
    if (looksLikeUuid) return roleKey
    return list.roles.find((r) => r.code === roleKey || r.id === roleKey)?.id
  }, [looksLikeUuid, roleKey, list.roles])

  const detail = useRole(resolvedId)
  const found = detail.role
  const isPending =
    (!looksLikeUuid && list.isPending) || (Boolean(resolvedId) && detail.isPending)

  const activate = useActivateRole(found?.id || '')
  const deactivate = useDeactivateRole(found?.id || '')

  const [pending, setPending] = useState<ActionId | null>(null)
  const [success, setSuccess] = useState<ActionId | null>(null)

  if (isPending) return <DetailPageLoadingSkeleton />

  if (!found) {
    return (
      <AdminDetailPage
        backLabel="Back to users"
        onBack={() => navigate('/users?tab=roles')}
        title="Role not found"
        summaryRows={[{ label: 'Code', value: roleKey || '—' }]}
      />
    )
  }

  const meta = pending ? ACTION_META[pending] : success ? ACTION_META[success] : null
  const writeAccess = roleHasWriteAccess(detail.permissionCodes)

  const actions: AdminDetailAction[] = [
    {
      id: 'edit',
      label: 'Edit',
      onClick: () => navigate(`/users/roles/${found.id}/edit`),
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      onClick: () =>
        navigate(`/users/roles/new?duplicate=${encodeURIComponent(found.id)}`),
    },
  ]

  if (found.status === 'ACTIVE') {
    if (!found.is_system) {
      actions.push({
        id: 'deactivate',
        label: 'Deactivate',
        tone: 'danger',
        onClick: () => setPending('deactivate'),
      })
    }
  } else {
    actions.push({
      id: 'activate',
      label: 'Activate',
      onClick: () => setPending('activate'),
    })
  }

  actions.push({
    id: 'export',
    label: 'Export Record',
    onClick: () => setPending('export'),
  })

  return (
    <>
      <AdminDetailPage
        backLabel="Back to users"
        onBack={() => navigate('/users?tab=roles')}
        breadcrumbs={[
          { label: 'Users', to: '/users' },
          { label: 'Roles', to: '/users?tab=roles' },
          { label: found.name },
        ]}
        title={found.name}
        subtitle={`Role · ${found.code}`}
        statusLabel={found.status === 'ACTIVE' ? 'Active' : 'Inactive'}
        statusTone={found.status === 'ACTIVE' ? 'success' : 'warning'}
        actions={actions}
        summaryRows={[
          { label: 'Role ID', value: found.id },
          { label: 'Code', value: found.code },
          { label: 'Type', value: found.is_system ? 'System' : 'Custom' },
          { label: 'Users assigned', value: String(found.usersAssigned) },
          { label: 'Description', value: found.description || '—' },
          { label: 'Updated', value: found.updatedAt },
          { label: 'Write access', value: writeAccess ? 'Yes' : 'No' },
        ]}
      >
        <PermissionsMatrix codes={detail.permissionCodes} />
      </AdminDetailPage>

      <AdminConfirmModal
        opened={!!pending}
        onClose={() => setPending(null)}
        title={meta?.confirmTitle ?? ''}
        body={meta?.confirmBody ?? ''}
        confirmLabel="Confirm"
        confirmTone={meta?.confirmTone ?? 'primary'}
        reasonRequired={meta?.reasonRequired}
        illustrationId={
          pending === 'deactivate' ? 'confirm-delete' : 'confirm-action'
        }
        onConfirm={() => {
          const action = pending
          setPending(null)
          if (!action) return
          if (action === 'edit') {
            navigate(`/users/roles/${found.id}/edit`)
            return
          }
          if (action === 'duplicate') {
            navigate(
              `/users/roles/new?duplicate=${encodeURIComponent(found.id)}`,
            )
            return
          }
          if (action === 'export') {
            downloadCsv(
              `${found.code}.csv`,
              ['id', 'code', 'name', 'type', 'status', 'users', 'permissions'],
              [
                [
                  found.id,
                  found.code,
                  found.name,
                  found.is_system ? 'System' : 'Custom',
                  found.status,
                  String(found.usersAssigned),
                  detail.permissionCodes.join('; '),
                ],
              ],
            )
            setSuccess(action)
            return
          }
          if (action === 'activate' || action === 'deactivate') {
            const mut = action === 'activate' ? activate : deactivate
            mut.mutate(
              {},
              {
                onSuccess: () => {
                  detail.refetch()
                  setSuccess(action)
                },
                onError: (err) =>
                  notifications.show({
                    color: 'red',
                    message: apiErrorMessage(err, 'Could not update role'),
                  }),
              },
            )
          }
        }}
      />

      <KuraIllustrationModal
        opened={!!success}
        onClose={() => setSuccess(null)}
        illustrationId={success ? ACTION_META[success].illustrationId : 'record-saved'}
        title={success ? ACTION_META[success].successTitle : undefined}
        description={found.name}
        primaryAction={{
          label: 'Done',
          onClick: () => setSuccess(null),
        }}
      />
    </>
  )
}
