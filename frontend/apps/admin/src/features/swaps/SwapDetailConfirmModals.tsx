import {
  AdminConfirmModal,
  KuraIllustrationModal,
} from '@shared/components'

type ConfirmKind = 'reverse' | 'abort'

export function SwapDetailConfirmModals({
  code,
  confirmKind,
  doneKind,
  loading,
  onCloseConfirm,
  onCloseDone,
  onConfirm,
}: {
  code: string
  confirmKind: ConfirmKind | null
  doneKind: ConfirmKind | null
  loading: boolean
  onCloseConfirm: () => void
  onCloseDone: () => void
  onConfirm: (reason: string | undefined) => Promise<void>
}) {
  return (
    <>
      <AdminConfirmModal
        opened={confirmKind !== null}
        onClose={onCloseConfirm}
        title={
          confirmKind === 'abort' ? 'Abort this session?' : 'Reverse this swap?'
        }
        body={
          confirmKind === 'abort'
            ? 'Closes the open bay session, releases any wallet hold, and rolls back an issued pack if needed. No receipt is created.'
            : 'Rolls back inventory and settlement for a completed session. Reason is required for audit.'
        }
        confirmTone="danger"
        confirmLabel={confirmKind === 'abort' ? 'Abort' : 'Reverse'}
        reasonRequired
        reasonLabel="Reason"
        reasonPlaceholder={
          confirmKind === 'abort'
            ? 'Why abort this session?'
            : 'Why reverse this session?'
        }
        illustrationId="confirm-action"
        loading={loading}
        onConfirm={onConfirm}
      />
      <KuraIllustrationModal
        opened={doneKind !== null}
        onClose={onCloseDone}
        illustrationId="record-saved"
        title={doneKind === 'abort' ? 'Session aborted' : 'Swap reversed'}
        description={
          doneKind === 'abort'
            ? `${code} is now FAILED. The rider can book a fresh hold.`
            : `${code} was reversed. Status is now REVERSED.`
        }
        primaryAction={{
          label: 'Done',
          onClick: onCloseDone,
        }}
      />
    </>
  )
}
