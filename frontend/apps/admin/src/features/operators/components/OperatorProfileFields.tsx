import { Checkbox, Select, TextInput } from '@mantine/core'
import { OperatorIdPhotoFields } from './OperatorIdPhotoFields'

export const OPERATOR_ID_TYPES = [
  { value: 'NIN', label: 'NIN' },
  { value: 'BVN', label: 'BVN' },
  { value: 'VOTER', label: 'Voter card' },
  { value: 'DRIVERS_LICENCE', label: "Driver's licence" },
] as const

export type OperatorIdType = (typeof OPERATOR_ID_TYPES)[number]['value']

type Props = {
  fullName: string
  onFullName: (v: string) => void
  phone: string
  onPhone: (v: string) => void
  email: string
  onEmail: (v: string) => void
  idType: OperatorIdType
  onIdType: (v: OperatorIdType) => void
  idNumber: string
  onIdNumber: (v: string) => void
  idFrontPhoto: File | null
  idBackPhoto: File | null
  facePhoto: File | null
  onFrontChange: (f: File | null) => void
  onBackChange: (f: File | null) => void
  onFaceChange: (f: File | null) => void
  /** NDPA: agent confirms the rider agreed — SERVICE is required to submit ID. */
  consentService: boolean
  onConsentService: (v: boolean) => void
  consentDataSharing: boolean
  onConsentDataSharing: (v: boolean) => void
}

export function OperatorProfileFields(p: Props) {
  const idTypeLabel =
    OPERATOR_ID_TYPES.find((t) => t.value === p.idType)?.label ?? 'ID'
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <TextInput
        label="Full Name"
        value={p.fullName}
        onChange={(e) => p.onFullName(e.currentTarget.value)}
        placeholder="Enter full name"
        required
      />
      <TextInput
        label="Phone Number"
        placeholder="+234"
        value={p.phone}
        onChange={(e) => p.onPhone(e.currentTarget.value)}
        required
      />
      <TextInput
        className="sm:col-span-2"
        label="Email"
        placeholder="name@email.com"
        description="Invite link to set app password is sent here after register."
        value={p.email}
        onChange={(e) => p.onEmail(e.currentTarget.value)}
        required
      />
      <Select
        label="ID type"
        data={[...OPERATOR_ID_TYPES]}
        value={p.idType}
        onChange={(v) => {
          if (v) p.onIdType(v as OperatorIdType)
        }}
        allowDeselect={false}
        required
      />
      <TextInput
        label={`${idTypeLabel} number`}
        placeholder={`Enter ${idTypeLabel.toLowerCase()} number`}
        value={p.idNumber}
        onChange={(e) => p.onIdNumber(e.currentTarget.value)}
        required
      />
      <OperatorIdPhotoFields
        front={p.idFrontPhoto}
        back={p.idBackPhoto}
        face={p.facePhoto}
        onFrontChange={p.onFrontChange}
        onBackChange={p.onBackChange}
        onFaceChange={p.onFaceChange}
      />
      <div className="flex flex-col gap-2 rounded-[10px] border border-[var(--bd)] bg-[var(--in)] p-3">
        <p className="text-[12px] font-semibold text-[var(--tx)]">Rider consent (read to the rider)</p>
        <Checkbox
          checked={p.consentService}
          onChange={(e) => p.onConsentService(e.currentTarget.checked)}
          label="Rider agrees to the Kura service terms and to Kura holding their ID for verification (required)"
        />
        <Checkbox
          checked={p.consentDataSharing}
          onChange={(e) => p.onConsentDataSharing(e.currentTarget.checked)}
          label="Rider agrees to anonymised data sharing with partners and government (optional)"
        />
      </div>
    </div>
  )
}
