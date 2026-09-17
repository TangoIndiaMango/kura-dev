import React, { useState } from 'react'
import { Checkbox, Select, TextInput } from '@mantine/core'
import { ArrowLeft01Icon } from 'hugeicons-react'
import { OperatorPrimaryButton } from '../../shared/components/operator/OperatorPrimaryButton'
import { MediaDropzone } from '../../shared/components/media-upload/MediaDropzone'
import type { OperatorSession } from '../../shared/session/operatorTypes'

export type IdDocType = NonNullable<OperatorSession['idType']>

export interface IdentityFormValue {
  idType: IdDocType
  idNumber: string
  idPhoto: File | null
  facePhoto: File | null
  consentService: boolean
  consentDataSharing: boolean
}

interface ProfileIdentityScreenProps {
  value: IdentityFormValue
  onChange: (next: IdentityFormValue) => void
  onContinue: () => void
  onBack: () => void
}

const DOC_OPTIONS: Array<{ value: IdDocType; label: string }> = [
  { value: 'NIN', label: 'NIN' },
  { value: 'BVN', label: 'BVN' },
  { value: 'VOTER', label: 'Voter card' },
  { value: 'DRIVERS_LICENCE', label: "Driver's licence" },
]

const fieldStyles = {
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--kura-text)',
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderColor: 'var(--kura-border)',
    backgroundColor: 'var(--kura-bg-elevated)',
    color: 'var(--kura-text)',
    fontSize: 14,
    minHeight: 48,
  },
} as const

/** PRD F1 profile identity — ID + photos. Until IdentityPass/Dojah, ops verify MANUAL. */
export const ProfileIdentityScreen: React.FC<ProfileIdentityScreenProps> = ({
  value,
  onChange,
  onContinue,
  onBack,
}) => {
  const [touched, setTouched] = useState(false)
  const idOk = value.idNumber.replace(/\s/g, '').length >= 8
  const ready =
    idOk && Boolean(value.idPhoto) && Boolean(value.facePhoto) && value.consentService

  return (
    <div className="flex min-h-full flex-col px-5 pb-8 pt-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1 self-start text-sm text-[var(--kura-muted)]"
      >
        <ArrowLeft01Icon size={16} />
        Back
      </button>

      <h1 className="text-[26px] font-bold tracking-tight text-[var(--kura-text)]">
        Verify your identity
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--kura-muted)]">
        PSP KYC runs when available. Until then we review your ID and face photo manually
        (or at a hub) so agents can match you at swap.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <Select
          label="ID type"
          data={DOC_OPTIONS}
          value={value.idType}
          onChange={(v) => {
            if (v) onChange({ ...value, idType: v as IdDocType })
          }}
          allowDeselect={false}
          styles={fieldStyles}
          comboboxProps={{ withinPortal: true, zIndex: 500 }}
        />

        <TextInput
          label={`${value.idType} number`}
          value={value.idNumber}
          onChange={(e) => onChange({ ...value, idNumber: e.currentTarget.value })}
          placeholder="Enter ID number"
          styles={fieldStyles}
          error={touched && !idOk ? 'Enter a valid ID number' : undefined}
        />

        <div>
          <p className="mb-2 text-[12px] font-bold text-[var(--kura-text)]">ID document photo</p>
          <MediaDropzone
            value={value.idPhoto}
            onChange={(file) => onChange({ ...value, idPhoto: file })}
            label="Photo of your ID"
            description="Full card readable · PNG/JPG · max 5 MB"
            maxSizeMB={5}
            minHeight={140}
            compact
            error={touched && !value.idPhoto ? 'Required for review' : null}
          />
        </div>

        <div>
          <p className="mb-2 text-[12px] font-bold text-[var(--kura-text)]">Face photo</p>
          <MediaDropzone
            value={value.facePhoto}
            onChange={(file) => onChange({ ...value, facePhoto: file })}
            label="Clear face photo"
            description="Front-facing, good light · matched at the hub · max 5 MB"
            maxSizeMB={5}
            minHeight={140}
            compact
            error={touched && !value.facePhoto ? 'Required for hub match' : null}
          />
        </div>

        <Checkbox
          checked={value.consentService}
          onChange={(e) =>
            onChange({ ...value, consentService: e.currentTarget.checked })
          }
          label="I agree to KURA service terms (required)"
          styles={{
            label: { color: 'var(--kura-text)', fontSize: 13 },
          }}
        />
        <Checkbox
          checked={value.consentDataSharing}
          onChange={(e) =>
            onChange({ ...value, consentDataSharing: e.currentTarget.checked })
          }
          label="Optional: share anonymised usage for partners / programmes"
          styles={{
            label: { color: 'var(--kura-muted)', fontSize: 13 },
          }}
        />
      </div>

      <div className="mt-auto pt-8">
        <OperatorPrimaryButton
          onClick={() => {
            setTouched(true)
            if (!ready) return
            onContinue()
          }}
          disabled={touched && !ready}
        >
          Submit for review
        </OperatorPrimaryButton>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-[var(--kura-muted)]">
          Status stays Pending until PSP clears or ops marks Manual verified. Visit a hub
          if you need help.
        </p>
      </div>
    </div>
  )
}
