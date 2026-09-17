import React, { useState } from 'react'
import { OperatorBackHeader } from '../../../shared/components/operator/OperatorBackHeader'
import { OperatorPrimaryButton } from '../../../shared/components/operator/OperatorPrimaryButton'
import { PinDigitInputs } from '../../../shared/components/operator/PinDigitInputs'
import { KuraIllustrationModal } from '../../../shared/components'
import { useOperatorSession } from '../../../shared/session'
import {
  apiErrorMessage,
  setPin as apiSetPin,
  verifyPin,
} from '../../../lib/api/auth'
import { useAuth } from '../../auth/AuthProvider'

interface ChangePinScreenProps {
  onBack: () => void
}

export const ChangePinScreen: React.FC<ChangePinScreenProps> = ({ onBack }) => {
  const { session } = useOperatorSession()
  const { refreshProfile } = useAuth()
  const hasPin = Boolean(session?.hasPin)
  const [current, setCurrent] = useState(['', '', '', ''])
  const [next, setNext] = useState(['', '', '', ''])
  const [confirm, setConfirm] = useState(['', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [doneOpen, setDoneOpen] = useState(false)

  const nextReady = next.every(Boolean) && confirm.join('') === next.join('')
  const ready = hasPin ? current.every(Boolean) && nextReady : nextReady

  const save = async () => {
    setError(null)
    setLoading(true)
    try {
      if (hasPin) {
        await verifyPin(current.join(''))
      }
      await apiSetPin(next.join(''), confirm.join(''))
      await refreshProfile()
      setDoneOpen(true)
    } catch (err) {
      if (hasPin) setCurrent(['', '', '', ''])
      setError(apiErrorMessage(err, 'Could not save PIN'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        <OperatorBackHeader
          title={hasPin ? 'Change PIN' : 'Set PIN'}
          subtitle={
            hasPin
              ? 'Used for swaps and wallet spends'
              : 'Required before confirming a swap'
          }
          onBack={onBack}
        />

        {hasPin ? (
          <Field label="Current PIN">
            <PinDigitInputs values={current} onChange={setCurrent} masked />
          </Field>
        ) : null}
        <Field label={hasPin ? 'New PIN' : 'Create 4-digit PIN'}>
          <PinDigitInputs values={next} onChange={setNext} masked />
        </Field>
        <Field label="Confirm PIN">
          <PinDigitInputs values={confirm} onChange={setConfirm} masked />
        </Field>

        {error ? (
          <p className="text-[12px] font-medium text-[var(--kura-coral)]">
            {error}
          </p>
        ) : null}

        <div className="pt-2">
          <OperatorPrimaryButton
            disabled={!ready}
            loading={loading}
            onClick={() => {
              save().catch(() => undefined)
            }}
          >
            Save PIN
          </OperatorPrimaryButton>
        </div>
      </div>

      <KuraIllustrationModal
        opened={doneOpen}
        onClose={() => setDoneOpen(false)}
        illustrationId="pin-set"
        primaryAction={{
          label: 'Continue',
          onClick: () => {
            setDoneOpen(false)
            onBack()
          },
        }}
      />
    </>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] font-semibold text-[var(--kura-muted)]">
        {label}
      </p>
      {children}
    </div>
  )
}
