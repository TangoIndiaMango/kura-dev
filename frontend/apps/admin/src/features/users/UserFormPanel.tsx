import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MultiSelect, Select, TextInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminFormSuccessModal,
  FormFooterActions,
  SidebarFormLayout,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import { useHubs } from '@features/hubs'
import { useCapabilities } from '../auth/useCapabilities'
import {
  useInviteStaff,
  useAssignableStaffRoles,
  useStaffUser,
  useUpdateStaff,
} from './hooks/use-users'

interface UserFormPanelProps {
  userId?: string
}

export function UserFormPanel({ userId }: UserFormPanelProps) {
  const navigate = useNavigate()
  const isEdit = Boolean(userId)
  const { user: existing, raw } = useStaffUser(userId)
  const { options: roleOptions } = useAssignableStaffRoles()
  const invite = useInviteStaff()
  const update = useUpdateStaff(userId || '')

  const { can } = useCapabilities()
  const { hubs } = useHubs(
    { page_size: 100, status: 'ACTIVE' },
    { enabled: can('hubs:read') },
  )
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string | null>('OPS_MANAGER')
  const [phone, setPhone] = useState('')
  const [hubIds, setHubIds] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [inviteMeta, setInviteMeta] = useState<{
    invite_email_sent?: boolean
    expires_hours?: number
  } | null>(null)

  const hubOptions = useMemo(
    () =>
      (hubs ?? []).map((h) => ({
        value: h.id,
        label: `${h.code} · ${h.name}`,
      })),
    [hubs],
  )

  useEffect(() => {
    if (!raw) return
    setFirstName(raw.first_name || '')
    setLastName(raw.last_name || '')
    setEmail(raw.email || '')
    setRole(raw.role || 'OPS_MANAGER')
    setPhone(raw.phone || '')
    setHubIds(raw.hub_ids ?? [])
  }, [raw])

  const canSubmit =
    Boolean(email.trim()) &&
    Boolean(role) &&
    (isEdit || firstName.trim().length > 0 || lastName.trim().length > 0 || email.trim())

  const handleSubmit = async () => {
    if (!role) return
    try {
      if (isEdit && userId) {
        await update.mutateAsync({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          role,
          ...(role === 'HUB_AGENT' ? { hub_ids: hubIds } : {}),
        })
        setInviteMeta(null)
      } else {
        const created = await invite.mutateAsync({
          email: email.trim(),
          role,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || undefined,
          ...(role === 'HUB_AGENT' && hubIds.length
            ? { hub_ids: hubIds }
            : {}),
        })
        setInviteMeta({
          invite_email_sent: created.invite_email_sent,
          expires_hours: created.expires_hours,
        })
      }
      setSaved(true)
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, isEdit ? 'Could not update user' : 'Could not invite user'),
      })
    }
  }

  return (
    <>
      <SidebarFormLayout
        sidebarTitle={isEdit ? 'Edit User' : 'Add New User'}
        sidebarTips={
          isEdit
            ? [
                'Update name, role, or phone for this console user.',
                'Role changes apply on their next session.',
                'Email is the sign-in identifier — change carefully.',
              ]
            : [
                'Invite staff to the admin console with a role.',
                'Use the work email they will sign in with.',
                'They get an email with a link to create their password (72 hours).',
                'Assign the least-privilege role that still fits the job.',
              ]
        }
        steps={[{ label: 'Details' }]}
        activeStep={0}
        onClose={() => navigate(isEdit && userId ? `/users/${userId}` : '/users')}
        footer={
          <FormFooterActions
            onBack={() => navigate(isEdit && userId ? `/users/${userId}` : '/users')}
            submitLabel={isEdit ? 'Save changes' : 'Send invite'}
            submitType="button"
            disabled={!canSubmit || invite.isPending || update.isPending}
            onSubmitClick={handleSubmit}
          />
        }
      >
        <Title order={3} className="text-[var(--tx)]">
          {isEdit ? 'Edit User' : 'Add New User'}
        </Title>
        <TextInput
          label="First name"
          placeholder="e.g. Amaka"
          value={firstName}
          onChange={(e) => setFirstName(e.currentTarget.value)}
        />
        <TextInput
          label="Last name"
          placeholder="e.g. Nwosu"
          value={lastName}
          onChange={(e) => setLastName(e.currentTarget.value)}
        />
        <TextInput
          label="Email"
          placeholder="name@yopmail.com"
          required
          disabled={isEdit}
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
        />
        <Select
          label="Role"
          placeholder="Select an option"
          data={roleOptions}
          value={role}
          onChange={setRole}
          required
        />
        <TextInput
          label="Phone (optional)"
          placeholder="+234 …"
          value={phone}
          onChange={(e) => setPhone(e.currentTarget.value)}
        />
        {role === 'HUB_AGENT' ? (
          <MultiSelect
            label="Assigned hubs (optional)"
            description="Limits this agent to these hubs and their batteries."
            placeholder={can('hubs:read') ? 'Select hubs' : 'Need hubs:read'}
            data={hubOptions}
            value={hubIds}
            onChange={setHubIds}
            searchable
            clearable
            disabled={!can('hubs:read')}
          />
        ) : null}
        {existing ? (
          <p className="text-xs text-[var(--mu)]">Editing {existing.name}</p>
        ) : null}
      </SidebarFormLayout>

      <AdminFormSuccessModal
        opened={saved}
        onClose={() => {
          setSaved(false)
          navigate(isEdit && userId ? `/users/${userId}` : '/users')
        }}
        title={isEdit ? 'User updated' : 'Invite emailed'}
        description={
          isEdit
            ? 'Profile and access changes are ready. They apply on the user’s next session.'
            : inviteMeta?.invite_email_sent
              ? `We sent a setup link to ${email.trim()}. It expires in ${inviteMeta.expires_hours ?? 72} hours.`
              : 'Staff user created. Ask them to check email for the password link.'
        }
        actionLabel={isEdit ? 'View user' : 'View users'}
      />
    </>
  )
}
