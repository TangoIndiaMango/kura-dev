import { AdminConfirmModal } from '@shared/components'
import type { BatteryLabelApi } from './types'

export function BatteryLabelModal({
  opened,
  onClose,
  loading,
  label,
}: {
  opened: boolean
  onClose: () => void
  loading: boolean
  label: BatteryLabelApi | null
}) {
  return (
    <AdminConfirmModal
      opened={opened}
      onClose={onClose}
      title="Battery label"
      body={
        loading
          ? 'Loading label…'
          : label
            ? `Scheme ${label.qr_scheme}. Payload: ${label.payload}`
            : 'Could not load label.'
      }
      confirmLabel="Done"
      confirmTone="primary"
      onConfirm={onClose}
    />
  )
}
