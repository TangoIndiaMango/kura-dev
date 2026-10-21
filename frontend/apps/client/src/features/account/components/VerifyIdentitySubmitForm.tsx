import { Select, TextInput } from '@mantine/core'
import { OperatorBackHeader } from '../../../shared/components/operator/OperatorBackHeader'
import { OperatorPrimaryButton } from '../../../shared/components/operator/OperatorPrimaryButton'
import { IdPhotoField } from '../../../shared/components/media-upload/IdPhotoField'
import { IdentityPhotoPair, identityFieldStyles } from './IdentityFormFields'
import { ID_OPTIONS } from './verifyIdentityLive'
import { ConsentCheckboxes } from './ConsentCheckboxes'

export function VerifyIdentitySubmitForm({
  title,
  banner,
  bannerTone = 'danger',
  helpText,
  fullName,
  onFullName,
  idType,
  onIdType,
  idNumber,
  onIdNumber,
  idLen,
  idLast4,
  face,
  onFace,
  faceUrl,
  front,
  onFront,
  frontUrl,
  back,
  onBack,
  backUrl,
  highlightPhotos = false,
  consent,
  error,
  formReady,
  busy,
  onBackNav,
  onSubmit,
}: {
  title: string
  banner?: string | null
  bannerTone?: 'danger' | 'amber'
  helpText?: string
  fullName: string
  onFullName: (v: string) => void
  idType: string
  onIdType: (v: string) => void
  idNumber: string
  onIdNumber: (v: string) => void
  idLen: number
  idLast4?: string | null
  face: File | null
  onFace: (f: File | null) => void
  faceUrl?: string | null
  front: File | null
  onFront: (f: File | null) => void
  frontUrl?: string | null
  back: File | null
  onBack: (f: File | null) => void
  backUrl?: string | null
  highlightPhotos?: boolean
  /** Shown until SERVICE consent is on file; omit to hide. */
  consent?: {
    service: boolean
    onService: (v: boolean) => void
    dataSharing: boolean
    onDataSharing: (v: boolean) => void
  } | null
  error: string | null
  formReady: boolean
  busy: boolean
  onBackNav: () => void
  onSubmit: () => void
}) {
  const keepIdHint = idLast4
    ? `On file · ••••${idLast4}. Leave blank to keep, or type a new ${idLen}-digit number.`
    : `${idNumber.length}/${idLen} digits`
  const bannerClass =
    bannerTone === 'amber'
      ? 'rounded-xl border border-[var(--kura-amber)]/40 bg-[var(--kura-amber)]/10 px-3 py-2.5 text-[12px] font-medium text-[var(--kura-text)]'
      : 'rounded-xl border border-[var(--kura-coral)]/35 bg-[var(--kura-coral)]/10 px-3 py-2.5 text-[12px] font-medium text-[var(--kura-coral)]'
  const photoBlock = (
    <>
      <IdPhotoField
        label="Face photo"
        hint="Clear face — used as your profile picture after ID approval"
        value={face}
        onChange={onFace}
        capture="user"
        existingUrl={faceUrl}
      />
      <IdentityPhotoPair
        front={front}
        back={back}
        onFront={onFront}
        onBackFile={onBack}
        frontUrl={frontUrl}
        backUrl={backUrl}
      />
    </>
  )

  return (
    <div className="flex flex-col gap-4">
      <OperatorBackHeader title={title} onBack={onBackNav} />
      <p className="text-[12px] leading-relaxed text-[var(--kura-muted)]">
        {helpText ??
          'Submit your full name, ID number, face photo, and clear front and back card scans. After approval, that face photo becomes your profile picture.'}
      </p>

      {banner ? <p className={bannerClass}>{banner}</p> : null}

      <TextInput
        label="Full name"
        value={fullName}
        onChange={(e) => onFullName(e.currentTarget.value)}
        placeholder="Name as on your ID"
        styles={identityFieldStyles}
      />

      <Select
        label="ID type"
        data={ID_OPTIONS}
        value={idType}
        onChange={(v) => {
          if (!v) return
          onIdType(v)
        }}
        allowDeselect={false}
        comboboxProps={{ withinPortal: true, zIndex: 500 }}
        styles={{
          ...identityFieldStyles,
          dropdown: {
            backgroundColor: 'var(--kura-bg-elevated)',
            borderColor: 'var(--kura-border)',
          },
        }}
      />

      <TextInput
        label="ID number"
        value={idNumber}
        onChange={(e) =>
          onIdNumber(e.currentTarget.value.replace(/\D/g, '').slice(0, idLen))
        }
        placeholder={
          idLast4
            ? `Keep ••••${idLast4} or enter new`
            : idType === 'NIN' || idType === 'BVN'
              ? `${idLen} digits`
              : `Up to ${idLen} digits`
        }
        description={keepIdHint}
        inputMode="numeric"
        maxLength={idLen}
        styles={identityFieldStyles}
      />

      {highlightPhotos ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--kura-amber)]/45 bg-[var(--kura-amber)]/5 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--kura-amber)]">
            Photos to update
          </p>
          {photoBlock}
        </div>
      ) : (
        photoBlock
      )}

      {consent ? <ConsentCheckboxes {...consent} /> : null}

      {error ? (
        <p className="text-[12px] font-medium text-[var(--kura-coral)]">{error}</p>
      ) : null}

      <OperatorPrimaryButton disabled={!formReady || busy} loading={busy} onClick={onSubmit}>
        Submit for review
      </OperatorPrimaryButton>
    </div>
  )
}
