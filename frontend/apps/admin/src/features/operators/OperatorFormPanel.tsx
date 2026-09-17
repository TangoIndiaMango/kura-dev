import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notifications } from '@mantine/notifications'
import { Select, TextInput, Title } from '@mantine/core'
import {
  AdminFormSuccessModal,
  DocumentSidesUpload,
  FormFooterActions,
  MediaDropzone,
  SidebarFormLayout,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import { OperatorFormExtraSteps } from './components/OperatorFormExtraSteps'
import {
  useCooperatives,
  useSetAccountCooperative,
} from './hooks/use-cooperatives'
import { useOperator } from './hooks/use-operators'

const STEPS = [
  { label: 'Profile' },
  { label: 'Vehicle' },
  { label: 'Plan' },
] as const

const ID_TYPES = [
  { value: 'NIN', label: 'NIN' },
  { value: 'BVN', label: 'BVN' },
  { value: 'VOTER', label: 'Voter card' },
  { value: 'DRIVERS_LICENCE', label: "Driver's licence" },
] as const

const REGISTER_TIPS = [
  'Search before you create — duplicates block the operator at the hub.',
  'Fields marked * are required.',
]

export function OperatorFormPanel({ operatorId }: { operatorId?: string }) {
  const navigate = useNavigate()
  const { operator, account } = useOperator(operatorId)
  const { options: coopOptions } = useCooperatives()
  const setCoop = useSetAccountCooperative(operatorId || '')
  const [saved, setSaved] = useState(false)
  const [step, setStep] = useState(0)
  const [autoRenew, setAutoRenew] = useState(true)
  const [fullName, setFullName] = useState('')
  const [idType, setIdType] = useState<(typeof ID_TYPES)[number]['value']>('NIN')
  const [idFrontPhoto, setIdFrontPhoto] = useState<File | null>(null)
  const [idBackPhoto, setIdBackPhoto] = useState<File | null>(null)
  const [facePhoto, setFacePhoto] = useState<File | null>(null)
  const [cooperativeId, setCooperativeId] = useState<string | null>(null)
  const editing = Boolean(operatorId)
  const backTo = editing && operatorId ? `/operators/${operatorId}` : '/operators'
  const lastStep = STEPS.length - 1
  const stepLabel = STEPS[Math.min(step, lastStep)]?.label ?? 'Profile'
  const idTypeLabel = ID_TYPES.find((t) => t.value === idType)?.label ?? 'ID'
  const busy = setCoop.isPending
  const displayName = operator?.name || account?.display_name || '—'

  useEffect(() => {
    if (!account && !operator) return
    setCooperativeId(account?.cooperative_id ?? '')
  }, [account, operator])

  const handleBack = () => {
    if (!editing && step > 0) {
      setStep((s) => s - 1)
      return
    }
    navigate(backTo)
  }

  const handleContinue = async () => {
    if (!editing && step === 0) {
      if (!idFrontPhoto || !idBackPhoto || !facePhoto) {
        notifications.show({
          color: 'red',
          message: 'Add ID front, ID back, and a face photo before continuing.',
        })
        return
      }
    }
    if (!editing && step < lastStep) {
      setStep((s) => s + 1)
      return
    }
    if (editing && operatorId) {
      try {
        await setCoop.mutateAsync({
          cooperative_id: cooperativeId ? cooperativeId : null,
        })
      } catch (err) {
        notifications.show({
          color: 'red',
          message: apiErrorMessage(err, 'Could not update operator'),
        })
        return
      }
    }
    setSaved(true)
  }

  return (
    <>
      <SidebarFormLayout
        sidebarTitle={editing ? 'Edit operator' : 'Add New Operator'}
        sidebarSubtitle="Operator CRM"
        sidebarTips={
          editing
            ? [
                'Full name is owned by the rider on Identity — ask them to edit, or send an in-app note.',
                'ID photos live on Overview; verify via Take Action.',
              ]
            : REGISTER_TIPS
        }
        steps={editing ? [{ label: 'Details' }] : [...STEPS]}
        activeStep={editing ? 0 : step}
        onStepChange={editing ? undefined : setStep}
        onClose={() => navigate(backTo)}
        footer={
          <FormFooterActions
            onBack={handleBack}
            submitLabel={
              editing
                ? 'Save changes'
                : step < lastStep
                  ? 'Continue'
                  : 'Register & send invite'
            }
            submitType="button"
            disabled={busy}
            loading={busy}
            onSubmitClick={handleContinue}
          />
        }
      >
        <div>
          <Title order={3} className="text-[var(--tx)]">
            {editing ? 'Edit operator' : stepLabel}
          </Title>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--mu)]">
            {editing
              ? 'Update cooperative only. Name and ID are updated by the rider.'
              : `Fill in the ${stepLabel.toLowerCase()} below. Required fields are marked with an asterisk.`}
          </p>
        </div>

        {(editing || step === 0) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              label="Full Name"
              value={editing ? displayName : fullName}
              onChange={
                editing ? undefined : (e) => setFullName(e.currentTarget.value)
              }
              readOnly={editing}
              disabled={editing}
              placeholder={editing ? undefined : 'Enter full name'}
              description={
                editing
                  ? 'Rider updates this on Identity in the app.'
                  : undefined
              }
              required={!editing}
            />
            <TextInput
              label="Phone Number"
              placeholder="+234"
              value={operator?.phone || ''}
              readOnly={editing}
              disabled={editing}
              required={!editing}
            />
            <TextInput
              className="sm:col-span-2"
              label="Email"
              placeholder="name@email.com"
              description={
                editing
                  ? 'Owned by the rider login — not editable here.'
                  : 'Invite link to set app password is sent here after register.'
              }
              value={operator?.email || ''}
              readOnly={editing}
              disabled={editing}
              required={!editing}
            />
            {!editing ? (
              <>
                <Select
                  label="ID type"
                  data={[...ID_TYPES]}
                  value={idType}
                  onChange={(v) => {
                    if (v) setIdType(v as (typeof ID_TYPES)[number]['value'])
                  }}
                  allowDeselect={false}
                  required
                />
                <TextInput
                  label={`${idTypeLabel} number`}
                  placeholder={`Enter ${idTypeLabel.toLowerCase()} number`}
                  required
                />
              </>
            ) : (
              <TextInput
                className="sm:col-span-2"
                label="KYC"
                value={`${operator?.idType || '—'} · ${operator?.kycStatus || '—'}${
                  operator?.idLast4 ? ` · ••••${operator.idLast4}` : ''
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
              data={coopOptions}
              value={cooperativeId || null}
              onChange={(v) => setCooperativeId(v)}
              searchable
              clearable
            />
            {!editing ? (
              <>
                <div className="sm:col-span-2">
                  <DocumentSidesUpload
                    front={idFrontPhoto}
                    back={idBackPhoto}
                    onFrontChange={setIdFrontPhoto}
                    onBackChange={setIdBackPhoto}
                    label="ID document *"
                    description="Front and back of the card are required · PNG or JPG · max 1 MB each"
                  />
                </div>
                <div className="sm:col-span-2">
                  <MediaDropzone
                    value={facePhoto}
                    onChange={setFacePhoto}
                    label="Face photo for hub verification *"
                    description="Required · clear front-facing photo · PNG or JPG · max 5 MB."
                    accept={['image/png', 'image/jpeg']}
                    maxSizeMB={5}
                    minHeight={180}
                  />
                </div>
              </>
            ) : null}
          </div>
        )}

        <OperatorFormExtraSteps
          operator={operator}
          editing={editing}
          autoRenew={autoRenew}
          setAutoRenew={setAutoRenew}
          showVehicle={editing || step === 1}
          showPlan={editing || step === 2}
        />
      </SidebarFormLayout>

      <AdminFormSuccessModal
        opened={saved}
        onClose={() => {
          setSaved(false)
          navigate(backTo)
        }}
        title={editing ? 'Operator updated' : 'Operator registered'}
        description={
          editing
            ? 'Cooperative assignment saved.'
            : 'KURA ID and virtual account created. An invite email was sent so they can set their password (expires in 72 hours).'
        }
        actionLabel={editing ? 'View operator' : 'View operators'}
      />
    </>
  )
}
