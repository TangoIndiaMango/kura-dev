import { KuraIllustrationModal } from '../KuraIllustrationModal'

export interface AdminFormSuccessModalProps {
  opened: boolean
  onClose: () => void
  /** created → record-created art; saved → record-saved (edits) */
  mode?: 'created' | 'saved'
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

/**
 * Side success card after create / edit form submit (Admin Modal Illustrations).
 */
export function AdminFormSuccessModal({
  opened,
  onClose,
  mode = 'created',
  title,
  description,
  actionLabel = 'Done',
  onAction,
}: AdminFormSuccessModalProps) {
  const handleAction = () => {
    onAction?.()
    onClose()
  }

  return (
    <KuraIllustrationModal
      opened={opened}
      onClose={onClose}
      layout="side"
      illustrationId={mode === 'created' ? 'record-created' : 'record-saved'}
      title={title}
      description={description}
      primaryAction={{
        label: actionLabel,
        onClick: handleAction,
      }}
    />
  )
}
