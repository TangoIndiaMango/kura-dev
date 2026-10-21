import { Select, TextInput } from '@mantine/core'
import type { OperatorRecord } from '../types'
import { OperatorIdPhotoFields } from './OperatorIdPhotoFields'

export const OPERATOR_ID_TYPES = [
  { value: 'NIN', label: 'NIN' },
  { value: 'BVN', label: 'BVN' },
  { value: 'VOTER', label: 'Voter card' },
  { value: 'DRIVERS_LICENCE', label: "Driver's licence" },
] as const

export type OperatorIdType = (typeof OPERATOR_ID_TYPES)[number]['value']

type Props = {
  editing: boolean
  operator?: OperatorRecord | null
  displayName: string
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
  coopOptions: { value: string; label: string }[]
  cooperativeId: string | null
  onCooperativeChange: (v: string | null) => void
  idFrontPhoto: File | null
  idBackPhoto: File | null
  facePhoto: File | null
  onFrontChange: (f: File | null) => void
  onBackChange: (f: File | null) => void
  onFaceChange: (f: File | null) => void
}

export function OperatorProfileFields(p: Props) {
  const idTypeLabel =
    OPERATOR_ID_TYPES.find((t) => t.value === p.idType)?.label ?? 'ID'
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <TextInput
        label="Full Name"
        value={p.editing ? p.displayName : p.fullName}
        onChange={
          p.editing ? undefined : (e) => p.onFullName(e.currentTarget.value)
        }
        readOnly={p.editing}
        disabled={p.editing}
        placeholder={p.editing ? undefined : 'Enter full name'}
        description={
          p.editing ? 'Rider updates this on Identity in the app.' : undefined
        }
        required={!p.editing}
      />
      <TextInput
        label="Phone Number"
        placeholder="+234"
        value={p.editing ? p.operator?.phone || '' : p.phone}
        onChange={p.editing ? undefined : (e) => p.onPhone(e.currentTarget.value)}
        readOnly={p.editing}
        disabled={p.editing}
        required={!p.editing}
      />
      <TextInput
        className="sm:col-span-2"
        label="Email"
        placeholder="name@email.com"
        description={
          p.editing
            ? 'Owned by the rider login — not editable here.'
            : 'Invite link to set app password is sent here after register.'
        }
        value={p.editing ? p.operator?.email || '' : p.email}
        onChange={p.editing ? undefined : (e) => p.onEmail(e.currentTarget.value)}
        readOnly={p.editing}
        disabled={p.editing}
        required={!p.editing}
      />
      {!p.editing ? (
        <>
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
        </>
      ) : (
        <TextInput
          className="sm:col-span-2"
          label="KYC"
          value={`${p.operator?.idType || '—'} · ${p.operator?.kycStatus || '—'}${
            p.operator?.idLast4 ? ` · ••••${p.operator.idLast4}` : ''
          }`}
          readOnly
          disabled
          description="Verify or reject from Take Action on the detail page."
        />
      )}
      <Select
        className="sm:col-span-2"
        label="Cooperative"
        placeholder="None / Independent"
        description="Optional. Links this operator to a cooperative for unreturned alerts."
        data={p.coopOptions}
        value={p.cooperativeId || null}
        onChange={(v) => p.onCooperativeChange(v)}
        searchable
        clearable
      />
      {!p.editing ? (
        <OperatorIdPhotoFields
          front={p.idFrontPhoto}
          back={p.idBackPhoto}
          face={p.facePhoto}
          onFrontChange={p.onFrontChange}
          onBackChange={p.onBackChange}
          onFaceChange={p.onFaceChange}
        />
      ) : null}
    </div>
  )
}
