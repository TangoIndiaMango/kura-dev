import { Checkbox } from '@mantine/core'

export const CONSENT_SERVICE_LABEL = 'I agree to KURA service terms (required)'
export const CONSENT_DATA_SHARING_LABEL =
  'Optional: share anonymised usage for partners / programmes'

/** F1 step 2 consent — SERVICE required, DATA_SHARING optional (withdraw in Settings). */
export function ConsentCheckboxes({
  service,
  onService,
  dataSharing,
  onDataSharing,
}: {
  service: boolean
  onService: (next: boolean) => void
  dataSharing: boolean
  onDataSharing: (next: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <Checkbox
        checked={service}
        onChange={(e) => onService(e.currentTarget.checked)}
        label={CONSENT_SERVICE_LABEL}
        styles={{
          label: { color: 'var(--kura-text)', fontSize: 13 },
        }}
      />
      <Checkbox
        checked={dataSharing}
        onChange={(e) => onDataSharing(e.currentTarget.checked)}
        label={CONSENT_DATA_SHARING_LABEL}
        styles={{
          label: { color: 'var(--kura-muted)', fontSize: 13 },
        }}
      />
    </div>
  )
}
