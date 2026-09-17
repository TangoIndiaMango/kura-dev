import { OperatorBackHeader } from '../../../shared/components/operator/OperatorBackHeader'
import { OperatorPrimaryButton } from '../../../shared/components/operator/OperatorPrimaryButton'
import { IdPhotosVault } from '../../../shared/components/media-upload/IdPhotosVault'
import type { OperatorSession } from '../../../shared/session/operatorTypes'

export function VerifyIdentityVerifiedView({
  current,
  onBack,
}: {
  current: OperatorSession
  onBack: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <OperatorBackHeader title="Identity" onBack={onBack} />
      <p className="rounded-2xl border border-[var(--kura-green)]/30 bg-[var(--kura-green)]/10 px-4 py-4 text-[13px] leading-relaxed text-[var(--kura-green)]">
        {current.verifiedLabel}
        {current.idType && current.idLast4
          ? ` · ${current.idType} ••••${current.idLast4}`
          : ''}
      </p>
      {current.name ? (
        <p className="text-[12px] text-[var(--kura-muted)]">Full name · {current.name}</p>
      ) : null}
      {current.profilePhotoUrl ? (
        <div className="overflow-hidden rounded-xl border border-[var(--kura-border)]">
          <img
            src={current.profilePhotoUrl}
            alt=""
            className="max-h-48 w-full object-cover"
          />
          <p className="border-t border-[var(--kura-border)] px-3 py-2 text-[11px] text-[var(--kura-muted)]">
            Face photo on file (hub match)
          </p>
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <p className="px-0.5 text-[12px] font-bold text-[var(--kura-text)]">
          ID card scans
        </p>
        <IdPhotosVault
          frontAttached={current.idFrontAttached}
          backAttached={current.idBackAttached}
          frontSrc={current.idFrontUrl}
          backSrc={current.idBackUrl}
          emptyHint="ID card scans are missing from this verified account. Re-open Identity to upload them."
        />
      </div>
    </div>
  )
}

export function VerifyIdentityWaitingView({
  current,
  onBack,
  onEdit,
  onWithdraw,
  withdrawing,
  error,
}: {
  current: OperatorSession
  onBack: () => void
  onEdit: () => void
  onWithdraw: () => void
  withdrawing?: boolean
  error?: string | null
}) {
  return (
    <div className="flex flex-col gap-4">
      <OperatorBackHeader title="Identity" onBack={onBack} />
      <p className="rounded-2xl border border-[var(--kura-amber)]/35 bg-[var(--kura-amber)]/10 px-4 py-4 text-[13px] leading-relaxed text-[var(--kura-text)]">
        Your ID is with ops for review. You can keep swapping — credit unlocks after
        approval. If they need changes, you’ll get a notification.
      </p>
      {current.name ? (
        <p className="text-[12px] text-[var(--kura-muted)]">Full name · {current.name}</p>
      ) : null}
      <p className="text-[12px] text-[var(--kura-muted)]">
        Submitted {current.idType ?? 'ID'}
        {current.idLast4 ? ` · ••••${current.idLast4}` : ''}
      </p>
      {current.profilePhotoUrl ? (
        <div className="overflow-hidden rounded-xl border border-[var(--kura-border)]">
          <img
            src={current.profilePhotoUrl}
            alt=""
            className="max-h-40 w-full object-cover"
          />
          <p className="px-3 py-2 text-[11px] text-[var(--kura-muted)]">
            Face photo on file — becomes your profile picture after approval.
          </p>
        </div>
      ) : null}
      {current.idFrontAttached || current.idBackAttached ? (
        <IdPhotosVault
          frontAttached={current.idFrontAttached}
          backAttached={current.idBackAttached}
          frontSrc={current.idFrontUrl}
          backSrc={current.idBackUrl}
        />
      ) : (
        <p className="text-[12px] text-[var(--kura-muted)]">
          No ID card photos attached yet.
        </p>
      )}
      {error ? (
        <p className="text-[12px] font-medium text-[var(--kura-coral)]">{error}</p>
      ) : null}
      <div className="flex flex-col gap-2 pt-1">
        <OperatorPrimaryButton onClick={onEdit}>Edit & resubmit</OperatorPrimaryButton>
        <button
          type="button"
          disabled={withdrawing}
          onClick={onWithdraw}
          className="rounded-xl border border-[var(--kura-border)] px-4 py-3 text-[13px] font-semibold text-[var(--kura-coral)] disabled:opacity-50"
        >
          {withdrawing ? 'Removing…' : 'Delete submission'}
        </button>
      </div>
    </div>
  )
}
