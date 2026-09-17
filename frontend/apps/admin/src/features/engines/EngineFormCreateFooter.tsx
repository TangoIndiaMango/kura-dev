import { Button } from '@mantine/core'
import { FormFooterActions } from '@shared/components'

type Props = {
  step: number
  busy: boolean
  resuming: boolean
  onLeave: () => void
  onBackToJob: () => void
  onContinueIntake: () => void
  onSaveAndClose: () => void
  onSealIntake: () => void
}

export function EngineFormCreateFooter({
  step,
  busy,
  resuming,
  onLeave,
  onBackToJob,
  onContinueIntake,
  onSaveAndClose,
  onSealIntake,
}: Props) {
  if (step === 0) {
    return (
      <FormFooterActions
        onBack={onLeave}
        submitLabel="Continue to intake"
        loading={busy}
        submitType="button"
        onSubmitClick={onContinueIntake}
        secondaryActions={
          <Button
            type="button"
            variant="default"
            disabled={busy}
            onClick={onSaveAndClose}
          >
            Save & continue later
          </Button>
        }
      />
    )
  }
  if (step === 1) {
    return (
      <FormFooterActions
        onBack={resuming ? onLeave : onBackToJob}
        submitLabel="Seal intake"
        loading={busy}
        submitType="button"
        onSubmitClick={onSealIntake}
        secondaryActions={
          <Button type="button" variant="default" onClick={onLeave}>
            Continue later
          </Button>
        }
      />
    )
  }
  return null
}
