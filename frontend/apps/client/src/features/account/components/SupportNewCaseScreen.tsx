import React, { useState } from 'react'
import { Select, TextInput, Textarea } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useAuth } from '../../auth/AuthProvider'
import { apiErrorMessage } from '../../../lib/api/auth'
import {
  KuraIllustrationModal,
  UploadProgressLoader,
} from '../../../shared/components'
import { OperatorBackHeader } from '../../../shared/components/operator/OperatorBackHeader'
import { OperatorPrimaryButton } from '../../../shared/components/operator/OperatorPrimaryButton'
import { MediaDropzone } from '../../../shared/components/media-upload/MediaDropzone'
import { useMediaUploadMutation } from '../../../shared/hooks/useMediaUploadMutation'
import {
  uiKindToApi,
  useOpenSupportCase,
  type SupportCaseDetailApi,
} from '../hooks/use-operator-support'

type OperatorCaseType = 'Dispute' | 'Support' | 'Billing' | 'Technical'

interface SupportNewCaseScreenProps {
  onBack: () => void
  onCreated: (created: SupportCaseDetailApi) => void
  receiptId?: string
  defaultSubject?: string
  defaultType?: OperatorCaseType
}

const TYPE_OPTIONS: Array<{ value: OperatorCaseType; label: string }> = [
  { value: 'Dispute', label: 'Dispute' },
  { value: 'Support', label: 'Support' },
  { value: 'Billing', label: 'Billing' },
  { value: 'Technical', label: 'Technical' },
]

const fieldStyles = {
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--kura-text)',
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderColor: 'var(--kura-border)',
    backgroundColor: 'var(--kura-bg-elevated)',
    color: 'var(--kura-text)',
    fontSize: 14,
    minHeight: 48,
  },
} as const

export const SupportNewCaseScreen: React.FC<SupportNewCaseScreenProps> = ({
  onBack,
  onCreated,
  receiptId,
  defaultSubject = '',
  defaultType = 'Support',
}) => {
  const { isAuthenticated } = useAuth()
  const openMut = useOpenSupportCase()
  const mediaUpload = useMediaUploadMutation()
  const [subject, setSubject] = useState(defaultSubject)
  const [type, setType] = useState<OperatorCaseType>(defaultType)
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busyOpen, setBusyOpen] = useState(false)

  const canSubmit = subject.trim().length >= 8
  const uploading = mediaUpload.isBusy || openMut.isPending

  const submit = async () => {
    if (!canSubmit) return
    if (!isAuthenticated) {
      notifications.show({
        color: 'red',
        message: 'Sign in to open a support case',
      })
      return
    }
    setBusyOpen(true)
    try {
      let attachmentId: string | undefined
      if (file) {
        const uploaded = await mediaUpload.mutateAsync([
          { key: 'evidence', file, kind: 'support' },
        ])
        attachmentId = uploaded.evidence?.id
        mediaUpload.setStep('submitting')
      }
      const livePaymentId =
        receiptId && !receiptId.startsWith('rc-') && receiptId.length > 12
          ? receiptId
          : undefined
      const created = await openMut.mutateAsync({
        subject: subject.trim(),
        kind: uiKindToApi(type),
        priority: type === 'Dispute' ? 'HIGH' : 'NORMAL',
        body: note.trim(),
        ...(attachmentId ? { attachment_asset_id: attachmentId } : {}),
        ...(livePaymentId ? { payment_id: livePaymentId } : {}),
      })
      mediaUpload.resetProgress()
      setBusyOpen(false)
      onCreated(created)
    } catch (err) {
      mediaUpload.resetProgress()
      setBusyOpen(false)
      notifications.show({ color: 'red', message: apiErrorMessage(err) })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <OperatorBackHeader
        title={receiptId ? 'Report a problem' : 'New case'}
        onBack={onBack}
      />

      {receiptId ? (
        <p className="text-[12px] leading-relaxed text-[var(--kura-muted)]">
          Opens a support case tied to this payment. Add a photo of the bank alert or
          error screen if you have one.
        </p>
      ) : (
        <p className="text-[12px] leading-relaxed text-[var(--kura-muted)]">
          Describe what went wrong. Photos help ops resolve faster.
        </p>
      )}

      <TextInput
        label="Subject"
        value={subject}
        onChange={(e) => setSubject(e.currentTarget.value)}
        placeholder="e.g. Charged twice for plan renewal"
        styles={fieldStyles}
      />

      <Select
        label="Type"
        value={type}
        onChange={(value) => {
          if (value) setType(value as OperatorCaseType)
        }}
        data={TYPE_OPTIONS}
        allowDeselect={false}
        checkIconPosition="right"
        comboboxProps={{ withinPortal: true, zIndex: 500 }}
        styles={{
          ...fieldStyles,
          dropdown: {
            backgroundColor: 'var(--kura-bg-elevated)',
            borderColor: 'var(--kura-border)',
          },
          option: {
            fontSize: 14,
            borderRadius: 8,
          },
        }}
      />

      <Textarea
        label="Details"
        value={note}
        onChange={(e) => setNote(e.currentTarget.value)}
        autosize
        minRows={3}
        maxRows={6}
        placeholder="What happened? Include times and hub if relevant."
        styles={{
          label: fieldStyles.label,
          input: {
            borderRadius: fieldStyles.input.borderRadius,
            borderColor: fieldStyles.input.borderColor,
            backgroundColor: fieldStyles.input.backgroundColor,
            color: fieldStyles.input.color,
            fontSize: fieldStyles.input.fontSize,
          },
        }}
      />

      <div className="flex flex-col gap-2">
        <span className="text-[12px] font-bold text-[var(--kura-text)]">
          Photo (optional)
        </span>
        <MediaDropzone
          value={file}
          onChange={setFile}
          label="Drop evidence here"
          description="Bank alert, bay screen, or error photo · PNG/JPG · max 5 MB"
          maxSizeMB={5}
          minHeight={160}
          compact
        />
      </div>

      <OperatorPrimaryButton
        disabled={!canSubmit || uploading}
        onClick={() => {
          submit()
        }}
      >
        Submit case
      </OperatorPrimaryButton>

      <KuraIllustrationModal
        opened={busyOpen && !mediaUpload.isUploading}
        onClose={() => {}}
        illustrationId="syncing"
        title="Opening case"
        description="Sending this to Kura support…"
        closeOnClickOutside={false}
        primaryAction={{
          label: 'Please wait',
          onClick: () => {},
          loading: true,
        }}
      />

      <UploadProgressLoader
        open={mediaUpload.isUploading}
        progress={mediaUpload.progress}
        step={mediaUpload.step}
        title="Uploading photo"
        description="Secure upload to Kura…"
      />
    </div>
  )
}
