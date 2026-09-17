import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Skeleton, Switch } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { PencilEdit01Icon } from 'hugeicons-react'
import { AdminModuleLayout } from '@shared/components'
import { apiErrorMessage, updateAdminProfile } from '@lib/api/auth'
import { useAuth } from '../auth/AuthProvider'
import { ProfileAvatarButton } from './ProfileAvatarButton'
import { ProfilePasswordModal } from './ProfilePasswordModal'
import { ProfileSecurityPin } from './ProfileSecurityPin'

export { ProfileEditPanel } from './ProfileEditPanel'

function roleLabel(role?: string) {
  if (!role) return 'Staff'
  return role.replace(/_/g, ' ')
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] font-medium text-[var(--mu)]">{label}</p>
      <p className="mt-1 truncate text-[14px] font-semibold text-[var(--tx)]">{value}</p>
    </div>
  )
}

function SettingsCard({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-[16px] border border-[var(--bd)] bg-[var(--sf)] p-5 shadow-[var(--sh)] sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[16px] font-bold text-[var(--tx)]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function SettingsRow({ children }: { children: ReactNode }) {
  return <div className="py-3.5 first:pt-0 last:pb-0">{children}</div>
}

export function ProfilePanel() {
  const navigate = useNavigate()
  const { me, status, refreshProfile } = useAuth()
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [prefsBusy, setPrefsBusy] = useState(false)

  const user = me?.user
  const firstName = user?.first_name || ''
  const lastName = user?.last_name || ''
  const fullName = `${firstName} ${lastName}`.trim() || user?.email || 'Staff'
  const emailNotifs = me?.notification_prefs?.email !== false
  const pushNotifs = me?.notification_prefs?.push !== false

  const patchPrefs = async (patch: { email?: boolean; push?: boolean }) => {
    if (prefsBusy) return
    setPrefsBusy(true)
    try {
      await updateAdminProfile({
        notification_prefs: {
          email: patch.email ?? emailNotifs,
          push: patch.push ?? pushNotifs,
        },
      })
      await refreshProfile()
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not save notification prefs'),
      })
    } finally {
      setPrefsBusy(false)
    }
  }

  if (status === 'loading' || !user) {
    return (
      <AdminModuleLayout
        title="My Profile Setting"
        subtitle="Account details, alerts & security"
        contentVariant="bare"
      >
        <Skeleton height={180} radius="md" />
        <Skeleton height={120} radius="md" className="mt-4" />
      </AdminModuleLayout>
    )
  }

  return (
    <>
      <AdminModuleLayout
        title="My Profile Setting"
        subtitle="Account details, alerts & security"
        contentVariant="bare"
      >
        <div className="flex flex-col gap-5">
          <SettingsCard
            title="Personal Information"
            action={
              <button
                type="button"
                onClick={() => navigate('/profile/edit')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--bd)] bg-[var(--sf)] px-3 py-2 text-[12px] font-bold text-[var(--tx)] hover:bg-[var(--bg)]"
              >
                <PencilEdit01Icon size={14} />
                Edit Profile
              </button>
            }
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <ProfileAvatarButton
                firstName={firstName}
                lastName={lastName}
                photoUrl={me?.photo_url}
              />
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoField label="Full Name" value={fullName} />
                <InfoField label="User ID" value={user.id.slice(0, 8)} />
                <InfoField label="Email Address" value={user.email || '—'} />
                <InfoField label="Phone" value={user.phone || '—'} />
                <InfoField label="Role" value={roleLabel(user.role)} />
              </div>
            </div>
          </SettingsCard>

          <SettingsCard title="Notifications">
            <div className="divide-y divide-[var(--bd)]">
              <SettingsRow>
                <div className="flex items-start gap-3">
                  <Switch
                    checked={emailNotifs}
                    disabled={prefsBusy}
                    onChange={(e) => {
                      void patchPrefs({ email: e.currentTarget.checked })
                    }}
                    color="var(--pr)"
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-[14px] font-bold text-[var(--tx)]">
                      Email notifications
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--mu)]">
                      Receive account and activity updates by email.
                    </p>
                  </div>
                </div>
              </SettingsRow>
              <SettingsRow>
                <div className="flex items-start gap-3">
                  <Switch
                    checked={pushNotifs}
                    disabled={prefsBusy}
                    onChange={(e) => {
                      void patchPrefs({ push: e.currentTarget.checked })
                    }}
                    color="var(--pr)"
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-[14px] font-bold text-[var(--tx)]">
                      Push notifications
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--mu)]">
                      Receive in-app and push alerts when available.
                    </p>
                  </div>
                </div>
              </SettingsRow>
            </div>
          </SettingsCard>

          <SettingsCard title="Security">
            <div className="divide-y divide-[var(--bd)]">
              <SettingsRow>
                <ProfileSecurityPin />
              </SettingsRow>
              <SettingsRow>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[14px] font-bold text-[var(--tx)]">Password</p>
                    <p className="mt-0.5 text-[12px] text-[var(--mu)]">
                      Choose a strong password to keep your account safe.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChangePasswordOpen(true)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[color-mix(in_srgb,var(--pr)_12%,transparent)] px-3 py-2 text-[12px] font-bold text-[var(--pr)] hover:opacity-90"
                  >
                    <PencilEdit01Icon size={14} />
                    Change Password
                  </button>
                </div>
              </SettingsRow>
            </div>
          </SettingsCard>
        </div>
      </AdminModuleLayout>

      <ProfilePasswordModal
        opened={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </>
  )
}
