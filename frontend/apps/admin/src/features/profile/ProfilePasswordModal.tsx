import { useState } from 'react'
import { PasswordInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminConfirmModal,
  KuraIllustrationModal,
} from '@shared/components'
import { apiErrorMessage, changeAdminPassword } from '@lib/api/auth'

export function ProfilePasswordModal({
  opened,
  onClose,
}: {
  opened: boolean
  onClose: () => void
}) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const reset = () => {
    setCurrent('')
    setNext('')
    setConfirm('')
  }

  const close = () => {
    reset()
    onClose()
  }

  const submit = async () => {
    if (busy) return
    setBusy(true)
    try {
      await changeAdminPassword({
        current_password: current,
        new_password: next,
        new_password_confirmation: confirm,
      })
      setPending(false)
      close()
      setSaved(true)
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not update password'),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {opened ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[16px] border border-[var(--bd)] bg-[var(--sf)] p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[16px] font-bold text-[var(--tx)]">Change Password</h3>
                <p className="mt-1 text-[12px] text-[var(--mu)]">
                  Use a strong password. You stay signed in on this device.
                </p>
              </div>
              <button
                type="button"
                className="text-[13px] font-semibold text-[var(--mu)] hover:text-[var(--tx)]"
                onClick={close}
              >
                Close
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <PasswordInput
                label="Current password"
                value={current}
                onChange={(e) => setCurrent(e.currentTarget.value)}
              />
              <PasswordInput
                label="New password"
                value={next}
                onChange={(e) => setNext(e.currentTarget.value)}
              />
              <PasswordInput
                label="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.currentTarget.value)}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-[var(--bd)] px-3 py-2 text-[12px] font-bold text-[var(--tx)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!current || !next || !confirm || busy}
                onClick={() => setPending(true)}
                className="rounded-lg bg-[var(--pr)] px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50"
              >
                Update password
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AdminConfirmModal
        opened={pending}
        onClose={() => setPending(false)}
        title="Update password?"
        body="Your console password will change immediately."
        confirmLabel={busy ? 'Updating…' : 'Update'}
        loading={busy}
        illustrationId="confirm-action"
        onConfirm={() => {
          void submit()
        }}
      />

      <KuraIllustrationModal
        opened={saved}
        onClose={() => setSaved(false)}
        illustrationId="pin-reset"
        title="Password updated"
        description="Use your new password the next time you sign in."
        primaryAction={{
          label: 'Done',
          onClick: () => setSaved(false),
        }}
      />
    </>
  )
}
