import { Button, type ButtonProps } from '@mantine/core'
import React from 'react'

type OperatorPrimaryButtonProps = Omit<ButtonProps, 'variant' | 'color'> &
  Omit<React.ComponentPropsWithoutRef<'button'>, keyof ButtonProps> & {
    tone?: 'teal' | 'amber'
    children: React.ReactNode
  }

export function OperatorPrimaryButton({
  tone = 'teal',
  fullWidth = true,
  type = 'button',
  children,
  ...props
}: OperatorPrimaryButtonProps) {
  return (
    <Button
      type={type}
      fullWidth={fullWidth}
      size="md"
      fw={700}
      color={tone === 'amber' ? 'yellow' : 'brand'}
      className={
        tone === 'amber'
          ? 'bg-[var(--kura-amber)] text-[#003153] hover:brightness-105'
          : 'bg-[var(--kura-teal)] text-[var(--kura-text-inverse)] hover:bg-[#0b6a7a]'
      }
      styles={{
        root: {
          height: 48,
          border: 'none',
        },
      }}
      {...props}
    >
      {children}
    </Button>
  )
}
