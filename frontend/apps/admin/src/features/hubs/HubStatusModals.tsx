import { notifications } from '@mantine/notifications'
import {
  AdminConfirmModal,
  KuraIllustrationModal,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import {
  HUB_ACTION_META,
  type HubAction,
} from './hubDetailHelpers'
import type { HubStatusPayload } from './types'

type StatusMutation = {
  isPending: boolean
  mutateAsync: (payload: HubStatusPayload) => Promise<unknown>
}

export function HubStatusModals({
  hubName,
  pending,
  success,
  setPending,
  setSuccess,
  setStatus,
}: {
  hubName: string
  pending: HubAction | null
  success: HubAction | null
  setPending: (a: HubAction | null) => void
  setSuccess: (a: HubAction | null) => void
  setStatus: StatusMutation
}) {
  const meta = pending
    ? HUB_ACTION_META[pending]
    : success
      ? HUB_ACTION_META[success]
      : null

  return (
    <>
      {pending && meta ? (
        <AdminConfirmModal
          opened
          onClose={() => setPending(null)}
          title={meta.confirmTitle}
          body={meta.confirmBody}
          confirmTone={meta.confirmTone}
          confirmLabel={
            pending === 'deactivate'
              ? 'Deactivate'
              : pending === 'activate'
                ? 'Set online'
                : 'Confirm'
          }
          reasonRequired={pending === 'deactivate'}
          illustrationId={
            pending === 'deactivate' ? 'confirm-delete' : 'confirm-action'
          }
          loading={setStatus.isPending}
          onConfirm={async (reason) => {
            const action = pending
            try {
              await setStatus.mutateAsync({
                status: meta.nextStatus,
                ...(reason ? { note: reason } : {}),
              })
              setPending(null)
              setSuccess(action)
            } catch (err) {
              notifications.show({
                color: 'red',
                message: apiErrorMessage(err, 'Could not update hub status'),
              })
            }
          }}
        />
      ) : null}

      {success && meta ? (
        <KuraIllustrationModal
          opened
          onClose={() => setSuccess(null)}
          illustrationId={meta.illustrationId}
          title={meta.successTitle}
          description={meta.successBody(hubName)}
          primaryAction={{
            label: 'Done',
            onClick: () => setSuccess(null),
          }}
        />
      ) : null}
    </>
  )
}
