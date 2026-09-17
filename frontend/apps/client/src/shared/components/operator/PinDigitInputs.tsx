import React from 'react'
import { PinInput, useMantineColorScheme } from '@mantine/core'

interface PinDigitInputsProps {
  length?: number
  values: string[]
  onChange: (values: string[]) => void
  masked?: boolean
  autoFocus?: boolean
  error?: boolean
  disabled?: boolean
}

/** Operator PIN / OTP field — Mantine PinInput styled to the KURA shell. */
export const PinDigitInputs: React.FC<PinDigitInputsProps> = ({
  length = 4,
  values,
  onChange,
  masked = false,
  autoFocus = false,
  error = false,
  disabled = false,
}) => {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme !== 'light'
  const value = values.join('').slice(0, length)
  const borderColor = error
    ? 'var(--kura-coral)'
    : isDark
      ? 'var(--kura-border)'
      : '#D0D5DD'

  return (
    <PinInput
      length={length}
      type="number"
      inputMode="numeric"
      mask={masked}
      oneTimeCode={!masked}
      autoFocus={autoFocus && !disabled}
      placeholder=""
      value={value}
      disabled={disabled}
      ariaLabel="PIN digits"
      gap={10}
      size="lg"
      radius="md"
      error={error}
      onChange={(next) => {
        if (disabled) return
        const digits = next.replace(/\D/g, '').slice(0, length).split('')
        onChange(Array.from({ length }, (_, i) => digits[i] ?? ''))
      }}
      styles={{
        root: {
          width: '100%',
          justifyContent: 'space-between',
          opacity: disabled ? 0.55 : 1,
        },
        pinInput: {
          flex: 1,
        },
        input: {
          width: '100%',
          minWidth: 0,
          height: 56,
          fontSize: 20,
          fontWeight: 700,
          borderColor,
          backgroundColor: isDark ? 'var(--kura-bg-elevated)' : '#F8FAFC',
          color: isDark ? 'var(--kura-text)' : '#003153',
          cursor: disabled ? 'not-allowed' : undefined,
        },
      }}
    />
  )
}
