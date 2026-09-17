import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TextInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  FormFooterActions,
  KuraIllustrationModal,
  SidebarFormLayout,
} from '@shared/components'
import { apiErrorMessage, updateAdminProfile } from '@lib/api/auth'
import { useAuth } from '../auth/AuthProvider'

function roleLabel(role?: string) {
  if (!role) return 'Staff'
  return role.replace(/_/g, ' ')
}

export function ProfileEditPanel() {
  const navigate = useNavigate()
  const { me, refreshProfile } = useAuth()
  const user = me?.user
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [phone, setPhone] = useState(user?.phone || '')

  const onSave = async () => {
    if (busy) return
    setBusy(true)
    try {
      await updateAdminProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      })
      await refreshProfile()
      setSaved(true)
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not save profile'),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <SidebarFormLayout
        sidebarTitle="Edit Profile Information"
        sidebarTips={[
          'Keep your work email current — it is used for invites and security alerts.',
          'Phone is used for SMS OTP on sensitive console actions.',
          'Role and access are managed by Super Admin in User Management.',
          'Set your security PIN under My Profile → Security for bay overrides.',
        ]}
        steps={[{ label: 'Details' }]}
        activeStep={0}
        onClose={() => navigate('/profile')}
        footer={
          <FormFooterActions
            onBack={() => navigate('/profile')}
            submitLabel="Save Changes"
            submitType="button"
            disabled={busy}
            loading={busy}
            onSubmitClick={() => {
              void onSave()
            }}
          />
        }
      >
        <Title order={3} className="text-[var(--tx)]">
          Edit Profile Information
        </Title>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextInput
            label="First Name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.currentTarget.value)}
          />
          <TextInput
            label="Last Name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.currentTarget.value)}
          />
          <TextInput label="Email Address" value={user?.email || ''} disabled />
          <TextInput
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.currentTarget.value)}
          />
        </div>
        <TextInput label="Role" value={roleLabel(user?.role)} disabled />
      </SidebarFormLayout>

      <KuraIllustrationModal
        opened={saved}
        onClose={() => {
          setSaved(false)
          navigate('/profile')
        }}
        illustrationId="record-saved"
        title="Profile saved"
        description="Your personal details were updated."
        primaryAction={{
          label: 'Back to profile',
          onClick: () => {
            setSaved(false)
            navigate('/profile')
          },
        }}
      />
    </>
  )
}
