import type { ReactNode } from 'react'
import { Box, Button, Group } from '@mantine/core'
import { ArrowLeft01Icon } from 'hugeicons-react'

export interface FormFooterActionsProps {
  onBack: () => void
  submitLabel?: string
  showBack?: boolean
  disabled?: boolean
  loading?: boolean
  /** When false, renders a plain button instead of type="submit". */
  submitType?: 'submit' | 'button'
  onSubmitClick?: () => void
  secondaryActions?: ReactNode
}

export function FormFooterActions({
  onBack,
  submitLabel = 'Continue',
  showBack = true,
  disabled = false,
  loading = false,
  submitType = 'submit',
  onSubmitClick,
  secondaryActions,
}: FormFooterActionsProps) {
  return (
    <Box pt="xl" className="shrink-0 border-t border-gray-2 w-full bg-white">
      <Group justify="space-between" align="center" wrap="nowrap" w="100%">
        {showBack ? (
          <Button
            type="button"
            variant="default"
            w={44}
            h={44}
            p={0}
            onClick={onBack}
            aria-label="Go back"
          >
            <ArrowLeft01Icon size={16} />
          </Button>
        ) : (
          <Box />
        )}

        <Group gap="sm" wrap="wrap" justify="flex-end">
          {secondaryActions}
          <Button
            type={submitType}
            color="brand"
            px="xl"
            disabled={disabled}
            loading={loading}
            onClick={onSubmitClick}
          >
            {submitLabel}
          </Button>
        </Group>
      </Group>
    </Box>
  )
}
