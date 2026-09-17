import {
  AdminConfirmModal,
  KuraIllustrationModal,
  type KuraIllustrationId,
} from '@shared/components'
import { EngineInstallModal } from './components/EngineInstallModal'
import { EngineReleaseModal } from './components/EngineReleaseModal'
import type { EngineDetailSuccess } from './engineDetailHandlers'

type ActionKind = EngineDetailSuccess

type Props = {
  tag: string
  pending: ActionKind | null
  success: ActionKind | null
  busy: boolean
  safetyOk: boolean
  initialEboarderSerial?: string
  onClosePending: () => void
  onCloseSuccess: () => void
  onInstall: (payload: {
    eboarder_id?: string
    eboarder_serial: string
    photo_asset_ids: string[]
  }) => void | Promise<void>
  onChecklist: () => void | Promise<void>
  onActivate: () => void | Promise<void>
  onFail: (reason?: string) => void | Promise<void>
  onReleaseRequest: (reason?: string) => void | Promise<void>
  onRelease: (payload: {
    photo_asset_ids: string[]
    signature_asset_id: string
  }) => void | Promise<void>
  onOpenCases: () => void
}

export function EnginesDetailModals({
  tag,
  pending,
  success,
  busy,
  safetyOk,
  initialEboarderSerial = '',
  onClosePending,
  onCloseSuccess,
  onInstall,
  onChecklist,
  onActivate,
  onFail,
  onReleaseRequest,
  onRelease,
  onOpenCases,
}: Props) {
  return (
    <>
      <EngineInstallModal
        opened={pending === 'install'}
        busy={busy}
        initialSerial={initialEboarderSerial}
        onClose={onClosePending}
        onConfirm={onInstall}
      />
      <AdminConfirmModal
        opened={pending === 'checklist'}
        onClose={onClosePending}
        title="Submit safety checklist?"
        body={
          safetyOk
            ? 'All six checks pass. Job moves to ready to activate.'
            : 'Complete all six safety checks first.'
        }
        confirmLabel="Submit checklist"
        loading={busy}
        illustrationId={'confirm-action' satisfies KuraIllustrationId}
        onConfirm={onChecklist}
      />
      <AdminConfirmModal
        opened={pending === 'activate'}
        onClose={onClosePending}
        title="Activate this e-boarder?"
        body="Marks the retrofit live. Audited."
        confirmLabel="Activate"
        loading={busy}
        illustrationId={'confirm-action' satisfies KuraIllustrationId}
        onConfirm={onActivate}
      />
      <AdminConfirmModal
        opened={pending === 'fail'}
        onClose={onClosePending}
        title="Mark safety failed?"
        body="Holds activation until the checklist is cleared. Enter the fail reason."
        confirmLabel="Mark failed"
        loading={busy}
        reasonRequired
        illustrationId={'confirm-action' satisfies KuraIllustrationId}
        onConfirm={onFail}
      />
      <AdminConfirmModal
        opened={pending === 'release_request'}
        onClose={onClosePending}
        title="Request engine release?"
        body="Opens a support case and sets custody to release requested."
        confirmLabel="Request release"
        loading={busy}
        reasonRequired
        illustrationId={'confirm-action' satisfies KuraIllustrationId}
        onConfirm={onReleaseRequest}
      />
      <EngineReleaseModal
        opened={pending === 'release'}
        tag={tag}
        busy={busy}
        onClose={onClosePending}
        onConfirm={onRelease}
      />
      <KuraIllustrationModal
        opened={success === 'install'}
        onClose={onCloseSuccess}
        illustrationId="record-saved"
        title="Marked installed"
        description={`${tag} — run the safety checklist next.`}
        primaryAction={{ label: 'Done', onClick: onCloseSuccess }}
      />
      <KuraIllustrationModal
        opened={success === 'checklist'}
        onClose={onCloseSuccess}
        illustrationId="record-saved"
        title="Checklist submitted"
        description={`${tag} is ready to activate.`}
        primaryAction={{ label: 'Done', onClick: onCloseSuccess }}
      />
      <KuraIllustrationModal
        opened={success === 'activate'}
        onClose={onCloseSuccess}
        illustrationId="engine-released"
        title="E-boarder activated"
        description={`${tag} · live on the vehicle.`}
        primaryAction={{ label: 'Done', onClick: onCloseSuccess }}
      />
      <KuraIllustrationModal
        opened={success === 'fail'}
        onClose={onCloseSuccess}
        illustrationId="dispute-opened"
        title="Safety failed"
        description={`${tag} is on hold until the checklist clears.`}
        primaryAction={{ label: 'Done', onClick: onCloseSuccess }}
      />
      <KuraIllustrationModal
        opened={success === 'release_request'}
        onClose={onCloseSuccess}
        illustrationId="dispute-opened"
        title="Release requested"
        description={`${tag} — a support case was opened for ops.`}
        primaryAction={{ label: 'Open cases', onClick: onOpenCases }}
      />
      <KuraIllustrationModal
        opened={success === 'release'}
        onClose={onCloseSuccess}
        illustrationId="engine-released"
        title="Engine released"
        description={`${tag} custody closed.`}
        primaryAction={{ label: 'Done', onClick: onCloseSuccess }}
      />
    </>
  )
}
