import React from 'react'
import { ArrowLeft01Icon } from 'hugeicons-react'
import { useMantineColorScheme } from '@mantine/core'
import { PinDigitInputs } from '../../../shared/components/operator/PinDigitInputs'
import { OperatorPrimaryButton } from '../../../shared/components/operator/OperatorPrimaryButton'
import { IllustrationHero } from '../../../shared/components/IllustrationHero'

interface SetPinStepProps {
  pin: string[]
  onPinChange: (values: string[]) => void
  confirmPin: string[]
  onConfirmPinChange: (values: string[]) => void
  onSubmit: () => void
  onBack: () => void
}

export const SetPinStep: React.FC<SetPinStepProps> = ({
  pin,
  onPinChange,
  confirmPin,
  onConfirmPinChange,
  onSubmit,
  onBack,
}) => {
  const { colorScheme } = useMantineColorScheme()
  const theme = colorScheme === 'light' ? 'light' : 'dark'
  const pinReady = pin.every((d) => d.length === 1)
  const confirmReady = confirmPin.every((d) => d.length === 1)
  const match = pin.join('') === confirmPin.join('')
  const ready = pinReady && confirmReady && match

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 self-start text-sm text-[var(--kura-muted)]"
      >
        <ArrowLeft01Icon size={16} />
        Back
      </button>

      <div className="mx-auto flex h-[120px] w-full max-w-[200px] items-center justify-center">
        <IllustrationHero
          id="pin-set"
          theme={theme}
          imgClassName="max-h-full max-w-full object-contain"
        />
      </div>

      <div>
        <h2 className="text-lg font-bold text-[var(--kura-text)]">Set a PIN</h2>
        <p className="mt-1 text-xs text-[var(--kura-muted)]">
          You’ll use this to confirm swaps and wallet spends.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-[var(--kura-muted)]">
          Create 4-digit PIN
        </span>
        <PinDigitInputs values={pin} onChange={onPinChange} masked autoFocus />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-[var(--kura-muted)]">
          Confirm PIN
        </span>
        <PinDigitInputs
          values={confirmPin}
          onChange={onConfirmPinChange}
          masked
        />
      </div>

      {pinReady && confirmReady && !match ? (
        <p className="text-[12px] font-medium text-[var(--kura-coral)]">
          PINs don’t match
        </p>
      ) : null}

      <div className="pt-2">
        <OperatorPrimaryButton onClick={onSubmit} disabled={!ready}>
          Save PIN
        </OperatorPrimaryButton>
      </div>
    </div>
  )
}
