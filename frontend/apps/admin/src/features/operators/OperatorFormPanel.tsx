import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notifications } from '@mantine/notifications'
import { Title } from '@mantine/core'
import {
  AdminFormSuccessModal,
  FormFooterActions,
  SidebarFormLayout,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import { OperatorFormExtraSteps } from './components/OperatorFormExtraSteps'
import {
  OperatorProfileFields,
  type OperatorIdType,
} from './components/OperatorProfileFields'
import {
  useCooperatives,
  useSetAccountCooperative,
} from './hooks/use-cooperatives'
import { useOperator } from './hooks/use-operators'
import { useOperatorRegistration } from './hooks/use-operator-registration'

const STEPS = [
  { label: 'Profile' },
  { label: 'Vehicle' },
  { label: 'Plan' },
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
  const registration = useOperatorRegistration()
  const [saved, setSaved] = useState(false)
  const [step, setStep] = useState(0)
  const [autoRenew, setAutoRenew] = useState(true)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [registeredKuraId, setRegisteredKuraId] = useState('')
  const [idFrontPhoto, setIdFrontPhoto] = useState<File | null>(null)
  const [idBackPhoto, setIdBackPhoto] = useState<File | null>(null)
  const [facePhoto, setFacePhoto] = useState<File | null>(null)
  const [kycSubmitted, setKycSubmitted] = useState(false)
  const [idType, setIdType] = useState<OperatorIdType>('NIN')
  const [cooperativeId, setCooperativeId] = useState<string | null>(null)
  const editing = Boolean(operatorId)
  const backTo = editing && operatorId ? `/operators/${operatorId}` : '/operators'
  const lastStep = STEPS.length - 1
  const stepLabel = STEPS[Math.min(step, lastStep)]?.label ?? 'Profile'
  const busy = setCoop.isPending || registration.busy
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
      if (!fullName.trim() || !phone.trim() || !email.trim() || !idNumber.trim()) {
        notifications.show({
          color: 'red',
          message: 'Full name, phone, email, and ID number are required.',
        })
        return
      }
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
    if (!editing) {
      if (!idFrontPhoto || !idBackPhoto || !facePhoto) return
      try {
        const result = await registration.registerWithIdentity(
          {
            full_name: fullName.trim(),
            phone: phone.trim(),
            email: email.trim(),
            id_type: idType,
            id_number: idNumber.trim(),
            cooperative_id: cooperativeId || null,
          },
          { face: facePhoto, front: idFrontPhoto, back: idBackPhoto },
        )
        setRegisteredKuraId(result.kuraId)
        setKycSubmitted(result.kycSubmitted)
        if (!result.kycSubmitted) {
          notifications.show({
            color: 'yellow',
            message:
              'Operator registered — ID photos failed. Retry from the operator KYC tab.',
          })
        }
      } catch (err) {
        notifications.show({
          color: 'red',
          message: apiErrorMessage(err, 'Could not register operator'),
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
          <OperatorProfileFields
            editing={editing}
            operator={operator}
            displayName={displayName}
            fullName={fullName}
            onFullName={setFullName}
            phone={phone}
            onPhone={setPhone}
            email={email}
            onEmail={setEmail}
            idType={idType}
            onIdType={setIdType}
            idNumber={idNumber}
            onIdNumber={setIdNumber}
            coopOptions={coopOptions}
            cooperativeId={cooperativeId}
            onCooperativeChange={setCooperativeId}
            idFrontPhoto={idFrontPhoto}
            idBackPhoto={idBackPhoto}
            facePhoto={facePhoto}
            onFrontChange={setIdFrontPhoto}
            onBackChange={setIdBackPhoto}
            onFaceChange={setFacePhoto}
          />
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
            : `${registeredKuraId ? `KURA ID ${registeredKuraId} · ` : ''}Wallet and virtual account created. An invite email was sent so they can set their password (expires in 72 hours). ${kycSubmitted ? 'ID photos submitted — identity is pending review. ' : ''}Add a vehicle and plan from the operator page.`
        }
        actionLabel={editing ? 'View operator' : 'View operators'}
      />
    </>
  )
}
