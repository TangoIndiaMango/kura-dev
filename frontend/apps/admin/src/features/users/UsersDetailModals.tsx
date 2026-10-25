import { Button, Select, useMantineColorScheme } from '@mantine/core'
import {
  AdminConfirmModal,
  DetailsDrawer,
  IllustratedFormModal,
  KuraIllustrationModal,
} from '@shared/components'
import { illustrationSrc } from '@shared/illustrations/catalog'
import type { AuditLogRecord } from '@shared/mock/adminMockData'
import { USER_ACTION_META } from './userDetailHelpers'
import type { useUserDetailActions } from './hooks/use-user-detail-actions'
import type { RoleItem } from './rolesData'

type ActionsApi = ReturnType<typeof useUserDetailActions>

type Props = {
  recordName: string
  roles: RoleItem[]
  rolePickerOpen: boolean
  setRolePickerOpen: (v: boolean) => void
  draftRole: string
  setDraftRole: (v: string) => void
  peek: AuditLogRecord | null
  setPeek: (v: AuditLogRecord | null) => void
  actionsApi: ActionsApi
  onEdit: () => void
}

export function UsersDetailModals({
  recordName,
  roles,
  rolePickerOpen,
  setRolePickerOpen,
  draftRole,
  setDraftRole,
  peek,
  setPeek,
  actionsApi,
  onEdit,
}: Props) {
  const { colorScheme } = useMantineColorScheme()
  const themeKey = colorScheme === 'light' ? 'light' : 'dark'
  const meta = actionsApi.pending
    ? USER_ACTION_META[actionsApi.pending]
    : actionsApi.success
      ? USER_ACTION_META[actionsApi.success]
      : null

  return (
    <>
      <DetailsDrawer
        opened={Boolean(peek)}
        onClose={() => setPeek(null)}
        title={peek?.action ?? 'Audit event'}
        rows={
          peek
            ? [
                { label: 'When', value: peek.at },
                { label: 'Actor', value: peek.actor },
                { label: 'Target', value: peek.target },
                { label: 'IP', value: peek.ip },
                { label: 'Detail', value: peek.detail },
              ]
            : []
        }
        viewMore={{ to: '/audit', label: 'Open audit trail' }}
      />

      <IllustratedFormModal
        opened={rolePickerOpen}
        onClose={() => setRolePickerOpen(false)}
        illustration={illustrationSrc('record-saved', themeKey)}
        title="Change role"
        description="Permissions update on their next session."
      >
        <Select
          label="New role"
          value={draftRole}
          onChange={(v) => setDraftRole(v ?? draftRole)}
          data={roles.map((r) => ({ value: r.code, label: r.name }))}
        />
        <Button
          mt="md"
          color="brand"
          loading={actionsApi.isPending}
          onClick={async () => {
            try {
              await actionsApi.changeRole(draftRole)
              setRolePickerOpen(false)
            } catch {
              /* toast already shown */
            }
          }}
        >
          Save role
        </Button>
      </IllustratedFormModal>

      {actionsApi.pending && meta ? (
        <AdminConfirmModal
          opened
          onClose={() => actionsApi.setPending(null)}
          title={meta.confirmTitle}
          body={meta.confirmBody}
          confirmLabel="Confirm"
          confirmTone={meta.confirmTone ?? 'primary'}
          reasonRequired={meta.reasonRequired}
          loading={actionsApi.isPending}
          illustrationId={
            actionsApi.pending === 'revoke' || actionsApi.pending === 'suspend'
              ? 'operator-suspended'
              : 'confirm-action'
          }
          onConfirm={async (reason) => {
            if (actionsApi.pending === 'edit') {
              actionsApi.setPending(null)
              onEdit()
              return
            }
            await actionsApi.runConfirm(reason)
          }}
        />
      ) : null}

      {actionsApi.success && meta ? (
        <KuraIllustrationModal
          opened
          onClose={() => actionsApi.setSuccess(null)}
          illustrationId={meta.illustrationId}
          title={meta.successTitle}
          description={meta.successBody(recordName)}
          primaryAction={{
            label: 'Done',
            onClick: () => actionsApi.setSuccess(null),
          }}
        />
      ) : null}
    </>
  )
}
