/** Set / change staff PIN — modal for bay override and sensitive confirmations. */
import { useState } from 'react'
import { PasswordInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { apiErrorMessage } from '@lib/api/auth'
import { KuraIllustrationModal } from '@shared/components'
import { usePostData } from '@shared/hooks/api'
import { useAuth } from '../auth/AuthProvider'

const fieldStyles = {
  input: {
    background: 'var(--in)',
    borderColor: 'var(--bd)',
    color: 'var(--tx)',
  },
}

export function ProfileSecurityPin() {
  const { me, refreshProfile } = useAuth()
  const hasPin = Boolean(me && 'has_pin' in me ? me.has_pin : false)
  const [open, setOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [current, setCurrent] = useState('')

  const setPinMut = usePostData<
    { pin: string; pin_confirm: string },
    { status: string }
  >('/auth/pin/set/', undefined, { silentError: true })

  const verifyMut = usePostData<{ pin: string }, { status: string }>(
    '/auth/pin/verify/',
    undefined,
    { silentError: true },
  )

  const resetForm = () => {
    setPin('')
    setConfirm('')
    setCurrent('')
  }

  const close = () => {
    setOpen(false)
    resetForm()
  }

  const onSave = async () => {
    if (!/^\d{4}$/.test(pin)) {
      notifications.show({ color: 'red', message: 'PIN must be exactly 4 digits.' })
      return
    }
    if (pin !== confirm) {
      notifications.show({ color: 'red', message: 'PIN confirmation does not match.' })
      return
    }
    try {
      if (hasPin) {
        if (!/^\d{4}$/.test(current)) {
          notifications.show({ color: 'red', message: 'Enter your current PIN.' })
          return
        }
        await verifyMut.mutateAsync({ pin: current })
      }
      await setPinMut.mutateAsync({ pin, pin_confirm: confirm })
      await refreshProfile()
      close()
      notifications.show({
        color: 'green',
        message: hasPin ? 'PIN updated.' : 'PIN set. Use it for bay overrides.',
      })
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not save PIN'),
      })
    }
  }

  const busy = setPinMut.isPending || verifyMut.isPending

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[14px] font-bold text-[var(--tx)]">Security PIN</p>
          <p className="mt-0.5 text-[12px] text-[var(--mu)]">
            {hasPin
              ? 'Set · required for bay overrides and sensitive confirmations.'
              : 'Not set · hub agents must set a PIN before bay overrides.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex shrink-0 items-center rounded-lg bg-[color-mix(in_srgb,var(--pr)_12%,transparent)] px-3 py-2 text-[12px] font-bold text-[var(--pr)]"
        >
          {hasPin ? 'Change PIN' : 'Set PIN'}
        </button>
      </div>

      <KuraIllustrationModal
        opened={open}
        onClose={close}
        layout="side"
        illustrationId="pin-reset"
        title={hasPin ? 'Change Security PIN' : 'Set Security PIN'}
        description="4-digit PIN for bay overrides and sensitive confirmations."
        closeOnClickOutside={!busy}
        primaryAction={{
          label: busy ? 'Saving…' : 'Save PIN',
          loading: busy,
          onClick: () => {
            void onSave()
          },
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: close,
          disabled: busy,
        }}
      >
        <div className="flex w-full flex-col gap-3 text-left">
          {hasPin ? (
            <PasswordInput
              label="Current PIN"
              inputMode="numeric"
              maxLength={4}
              value={current}
              onChange={(e) =>
                setCurrent(e.currentTarget.value.replace(/\D/g, '').slice(0, 4))
              }
              styles={fieldStyles}
            />
          ) : null}
          <PasswordInput
            label="New PIN (4 digits)"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) =>
              setPin(e.currentTarget.value.replace(/\D/g, '').slice(0, 4))
            }
            styles={fieldStyles}
          />
          <PasswordInput
            label="Confirm PIN"
            inputMode="numeric"
            maxLength={4}
            value={confirm}
            onChange={(e) =>
              setConfirm(e.currentTarget.value.replace(/\D/g, '').slice(0, 4))
            }
            styles={fieldStyles}
          />
        </div>
      </KuraIllustrationModal>
    </>
  )
}
