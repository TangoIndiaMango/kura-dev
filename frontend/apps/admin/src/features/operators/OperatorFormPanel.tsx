import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notifications } from '@mantine/notifications'
import { Title } from '@mantine/core'
import {
  AdminFormSuccessModal,
  FormFooterActions,
  SidebarFormLayout,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import {
  OperatorProfileFields,
  type OperatorIdType,
} from './components/OperatorProfileFields'
import { useOperatorRegistration } from './hooks/use-operator-registration'

// Registers a rider. Vehicles (and the chairman who owns them) are added on
// the Vehicles form right after; plans are bought by the rider with their PIN.
const REGISTER_TIPS = [
  'Search before you create — duplicates block the operator at the hub.',
  'Fields marked * are required.',
  'The chairman is set on the vehicle, not on the rider.',
]

export function OperatorFormPanel() {
  const navigate = useNavigate()
  const registration = useOperatorRegistration()
  const [saved, setSaved] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [registeredKuraId, setRegisteredKuraId] = useState('')
  const [registeredAccountId, setRegisteredAccountId] = useState('')
  const leavingTo = useRef<string | null>(null)
  const [idFrontPhoto, setIdFrontPhoto] = useState<File | null>(null)
  const [idBackPhoto, setIdBackPhoto] = useState<File | null>(null)
  const [facePhoto, setFacePhoto] = useState<File | null>(null)
  const [consentService, setConsentService] = useState(false)
  const [consentDataSharing, setConsentDataSharing] = useState(false)
  const [kycSubmitted, setKycSubmitted] = useState(false)
  const [idType, setIdType] = useState<OperatorIdType>('NIN')
  const busy = registration.busy

  const handleRegister = async () => {
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
    if (!consentService) {
      notifications.show({
        color: 'red',
        message: 'Confirm the rider agreed to the service terms before continuing.',
      })
      return
    }
    try {
      const result = await registration.registerWithIdentity(
        {
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          id_type: idType,
          id_number: idNumber.trim(),
        },
        { face: facePhoto, front: idFrontPhoto, back: idBackPhoto },
        { service: consentService, dataSharing: consentDataSharing },
      )
      setRegisteredKuraId(result.kuraId)
      setRegisteredAccountId(result.accountId)
      setKycSubmitted(result.kycSubmitted)
      if (!result.kycSubmitted) {
        notifications.show({
          color: 'yellow',
          message: `Operator registered — ID not submitted (${result.kycError ?? 'unknown error'}). Retry from the operator KYC tab.`,
        })
      }
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not register operator'),
      })
      return
    }
    setSaved(true)
  }

  return (
    <>
      <SidebarFormLayout
        sidebarTitle="Add New Operator"
        sidebarSubtitle="Operator CRM"
        sidebarTips={REGISTER_TIPS}
        steps={[{ label: 'Profile' }]}
        activeStep={0}
        onClose={() => navigate('/operators')}
        footer={
          <FormFooterActions
            onBack={() => navigate('/operators')}
            submitLabel="Register & send invite"
            submitType="button"
            disabled={busy}
            loading={busy}
            onSubmitClick={handleRegister}
          />
        }
      >
        <div>
          <Title order={3} className="text-[var(--tx)]">
            Profile
          </Title>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--mu)]">
            Rider details, ID and consent. You can add their vehicle right after.
          </p>
        </div>

        <OperatorProfileFields
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
          idFrontPhoto={idFrontPhoto}
          idBackPhoto={idBackPhoto}
          facePhoto={facePhoto}
          onFrontChange={setIdFrontPhoto}
          onBackChange={setIdBackPhoto}
          onFaceChange={setFacePhoto}
          consentService={consentService}
          onConsentService={setConsentService}
          consentDataSharing={consentDataSharing}
          onConsentDataSharing={setConsentDataSharing}
        />
      </SidebarFormLayout>

      <AdminFormSuccessModal
        opened={saved}
        onClose={() => {
          setSaved(false)
          navigate(leavingTo.current ?? '/operators')
          leavingTo.current = null
        }}
        title="Operator registered"
        description={`${registeredKuraId ? `KURA ID ${registeredKuraId} · ` : ''}Wallet created and transfer account requested. An invite email was sent (expires in 72 hours). ${kycSubmitted ? 'ID photos submitted — identity is pending review. ' : ''}Next, add their vehicle. The rider picks a plan in the app.`}
        actionLabel="Add vehicle"
        onAction={
          registeredAccountId
            ? () => {
                const owner = `${fullName.trim()}${registeredKuraId ? ` · ${registeredKuraId}` : ''}`
                leavingTo.current = `/vehicles/new?account=${registeredAccountId}&owner=${encodeURIComponent(owner)}`
              }
            : undefined
        }
      />
    </>
  )
}
