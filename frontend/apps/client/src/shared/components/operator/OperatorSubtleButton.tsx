import { Button, type ButtonProps } from '@mantine/core'
import React from 'react'

type OperatorSubtleButtonProps = Omit<ButtonProps, 'variant'> &
  Omit<React.ComponentPropsWithoutRef<'button'>, keyof ButtonProps> & {
    children: React.ReactNode
  }

/** Secondary text actions — Resend, Forgot PIN, Skip — with clear hover affordance. */
export function OperatorSubtleButton({
  children,
  color = 'brand',
  fullWidth = true,
  type = 'button',
  ...props
}: OperatorSubtleButtonProps) {
  return (
    <Button
      type={type}
      variant="subtle"
      color={color}
      fullWidth={fullWidth}
      fw={600}
      size="sm"
      {...props}
    >
      {children}
    </Button>
  )
}
