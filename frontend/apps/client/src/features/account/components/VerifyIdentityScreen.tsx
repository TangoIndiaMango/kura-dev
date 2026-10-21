import React from 'react'
import { Skeleton } from '@mantine/core'
import { OperatorBackHeader } from '../../../shared/components/operator/OperatorBackHeader'
import { KuraIllustrationModal, UploadProgressLoader } from '../../../shared/components'
import type { OperatorSession } from '../../../shared/session/operatorTypes'
import { VerifyIdentityProvisionalNote } from './VerifyIdentityProvisionalNote'
import { VerifyIdentitySubmitForm } from './VerifyIdentitySubmitForm'
import {
  VerifyIdentityVerifiedView,
  VerifyIdentityWaitingView,
} from './VerifyIdentityStatusViews'
import { useVerifyIdentityController } from './useVerifyIdentityController'

interface VerifyIdentityScreenProps {
  onBack: () => void
  current: OperatorSession
  onSubmit: () => void | Promise<void>
}

export const VerifyIdentityScreen: React.FC<VerifyIdentityScreenProps> = ({
  onBack,
  current,
  onSubmit,
}) => {
  const c = useVerifyIdentityController(current)
  const { view, route } = c

  if (
    c.syncing &&
    !route.hasSubmission &&
    view.kycStatus !== 'REJECTED' &&
    !route.photosRequested &&
    !c.forceEdit
  ) {
    return (
      <div className="flex flex-col gap-4">
        <OperatorBackHeader title="Identity" onBack={onBack} />
        <Skeleton height={28} radius="md" />
        <Skeleton height={120} radius="md" />
        <Skeleton height={180} radius="md" />
      </div>
    )
  }

  if (
    view.kycStatus === 'VERIFIED' &&
    !route.photosRequested &&
    !c.forceEdit
  ) {
    return <VerifyIdentityVerifiedView current={view} onBack={onBack} />
  }

  if (route.waitingQuiet && !c.forceEdit) {
    return (
      <VerifyIdentityWaitingView
        current={view}
        onBack={onBack}
        withdrawing={c.withdrawing}
        error={c.error}
        onEdit={c.beginEdit}
        onWithdraw={c.withdraw}
      />
    )
  }

  if (!c.forceEdit && !route.needsForm && view.kycStatus === 'PROVISIONAL') {
    return <VerifyIdentityProvisionalNote onBack={onBack} />
  }

  const opsNote = view.kycRequestNote?.trim() || null
  const rejectBanner =
    view.kycStatus === 'REJECTED'
      ? view.verifiedLabel?.startsWith('ID rejected')
        ? view.verifiedLabel
        : 'Previous submission was rejected. Check the number and try again.'
      : null
  const banner = rejectBanner
    ? rejectBanner
    : route.photosRequested
      ? opsNote ||
        'Ops asked you to update your ID photos. Replace the ones that need fixing — the rest stay on file.'
      : null

  return (
    <>
      <VerifyIdentitySubmitForm
        title={
          route.photosRequested
            ? 'Update identity'
            : c.editingPack
              ? 'Resubmit ID'
              : 'Verify identity'
        }
        banner={banner}
        bannerTone={rejectBanner ? 'danger' : 'amber'}
        helpText={
          c.editingPack || route.photosRequested
            ? 'Change only what needs fixing. Name, ID number, and photos already on file stay unless you replace them.'
            : undefined
        }
        fullName={c.fullName}
        onFullName={c.setFullName}
        idType={c.idType}
        onIdType={(v) => {
          c.setIdType(v)
          c.setIdNumber('')
        }}
        idNumber={c.idNumber}
        onIdNumber={c.setIdNumber}
        idLen={c.idLen}
        idLast4={c.keepLast4}
        face={c.face}
        onFace={c.setFace}
        faceUrl={view.profilePhotoUrl}
        front={c.front}
        onFront={c.setFront}
        frontUrl={view.idFrontUrl}
        back={c.back}
        onBack={c.setBack}
        backUrl={view.idBackUrl}
        highlightPhotos={route.photosRequested}
        consent={
          c.needsConsent
            ? {
                service: c.consentService,
                onService: c.setConsentService,
                dataSharing: c.consentDataSharing,
                onDataSharing: c.setConsentDataSharing,
              }
            : null
        }
        error={c.error}
        formReady={c.formReady}
        busy={c.busy}
        onBackNav={onBack}
        onSubmit={() => {
          c.submit(onSubmit)
        }}
      />

      <UploadProgressLoader
        open={c.busy && c.isAuthenticated}
        progress={c.mediaUpload.progress}
        step={
          c.mediaUpload.step === 'idle' && c.submitting
            ? 'submitting'
            : c.mediaUpload.step
        }
      />

      <KuraIllustrationModal
        opened={c.doneOpen}
        onClose={() => {
          c.setDoneOpen(false)
          onBack()
        }}
        illustrationId="account-verified"
        title="Submitted"
        description="Ops will review your ID. Your face photo becomes your profile picture after approval."
        primaryAction={{
          label: 'Back to account',
          onClick: () => {
            c.setDoneOpen(false)
            onBack()
          },
        }}
      />
    </>
  )
}
