import { caseStatusLabel as statusLabel } from './caseStatusLabel'
import { formatNaira } from '../../../shared/utils/currency'
import React, { useState } from 'react'
import { Modal, Textarea, Stack, Text, Title, ActionIcon } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Cancel01Icon } from 'hugeicons-react'
import { useAuth } from '../../auth/AuthProvider'
import { apiErrorMessage } from '../../../lib/api/auth'
import {
  KuraIllustrationModal,
  UploadProgressLoader,
} from '../../../shared/components'
import { OperatorBackHeader } from '../../../shared/components/operator/OperatorBackHeader'
import { OperatorPrimaryButton } from '../../../shared/components/operator/OperatorPrimaryButton'
import { MediaDropzone } from '../../../shared/components/media-upload/MediaDropzone'
import { NoteAttachmentThumb } from '../../../shared/components/media/NoteAttachmentThumb'
import { useMediaUploadMutation } from '../../../shared/hooks/useMediaUploadMutation'
import {
  formatCaseWhen,
  kindLabel,
  useAddCaseNote,
  useOperatorCase,
} from '../hooks/use-operator-support'

interface SupportCaseDetailScreenProps {
  caseId: string
  onBack: () => void
  openedNotice?: string | null
  onDismissOpenedNotice?: () => void
}

function stripUrls(body: string | null | undefined, attachmentUrl?: string | null) {
  let text = (body ?? '').trim()
  if (attachmentUrl) text = text.split(attachmentUrl).join(' ')
  text = text.replace(/https?:\/\/\S+/gi, ' ')
  return text.replace(/\s*[·•|]\s*/g, ' ').replace(/\s+/g, ' ').trim()
}

export const SupportCaseDetailScreen: React.FC<SupportCaseDetailScreenProps> = ({
  caseId,
  onBack,
  openedNotice,
  onDismissOpenedNotice,
}) => {
  const { isAuthenticated } = useAuth()
  const live = useOperatorCase(caseId, { enabled: isAuthenticated })
  const noteMut = useAddCaseNote(caseId)
  const mediaUpload = useMediaUploadMutation()

  const [noteOpen, setNoteOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftFile, setDraftFile] = useState<File | null>(null)
  const [busyOpen, setBusyOpen] = useState(false)

  if (isAuthenticated && live.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <OperatorBackHeader title="Case" onBack={onBack} />
        <div className="h-24 animate-pulse rounded-2xl bg-[var(--kura-border)]/40" />
        <div className="h-32 animate-pulse rounded-2xl bg-[var(--kura-border)]/40" />
      </div>
    )
  }

  const record = live.supportCase
    ? {
        code: live.supportCase.code,
        subject: live.supportCase.subject,
        priority: live.supportCase.priority,
        type: kindLabel(live.supportCase.kind),
        status: live.supportCase.status,
        receiptCode: live.supportCase.payment_receipt_code ?? null,
        receiptAmountKobo: live.supportCase.payment_amount_kobo ?? null,
        openedAt: formatCaseWhen(live.supportCase.created_at),
        events: live.supportCase.events.map((e) => ({
          id: e.id,
          body: stripUrls(e.body, e.attachment_url),
          actor: e.actor_name || 'Kura',
          at: formatCaseWhen(e.created_at),
          attachmentUrl: e.attachment_url,
          attachmentName: e.attachment_name,
          attachmentType: e.attachment_content_type,
        })),
        closed:
          live.supportCase.status === 'CLOSED' ||
          live.supportCase.status === 'RESOLVED',
      }
    : null

  if (!record) {
    return (
      <div className="flex flex-col gap-4">
        <OperatorBackHeader title="Case" onBack={onBack} />
        <p className="text-[14px] text-[var(--kura-muted)]">Case not found.</p>
      </div>
    )
  }

  const submitNote = async () => {
    const body = draft.trim()
    if (!body && !draftFile) return
    setBusyOpen(true)
    try {
      let attachmentId: string | undefined
      if (draftFile) {
        const uploaded = await mediaUpload.mutateAsync([
          { key: 'evidence', file: draftFile, kind: 'support' },
        ])
        attachmentId = uploaded.evidence?.id
        mediaUpload.setStep('submitting')
      }
      await noteMut.mutateAsync({
        body,
        ...(attachmentId ? { attachment_asset_id: attachmentId } : {}),
      })
      mediaUpload.resetProgress()
      setDraft('')
      setDraftFile(null)
      setNoteOpen(false)
      setBusyOpen(false)
    } catch (err) {
      mediaUpload.resetProgress()
      setBusyOpen(false)
      notifications.show({ color: 'red', message: apiErrorMessage(err) })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <OperatorBackHeader title={record.code} onBack={onBack} />

      {openedNotice ? (
        <p className="rounded-xl border border-[var(--kura-border)] bg-[var(--kura-teal)]/10 px-3 py-2 text-[12px] font-semibold text-[var(--kura-teal-bright)]">
          Case {openedNotice} opened. Updates appear here and in your inbox.
          {onDismissOpenedNotice ? (
            <button
              type="button"
              onClick={onDismissOpenedNotice}
              className="ml-2 text-[11px] font-bold underline opacity-80"
            >
              Dismiss
            </button>
          ) : null}
        </p>
      ) : null}

      <div className="rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4 py-4">
        <p className="text-[15px] font-bold text-[var(--kura-text)]">{record.subject}</p>
        <p className="mt-1 text-[12px] text-[var(--kura-muted)]">
          {record.type} · {statusLabel(record.status)} · {record.openedAt}
        </p>
        {record.receiptCode ? (
          <p className="mt-2 text-[12px] text-[var(--kura-text)]">
            About receipt <span className="font-mono font-semibold">{record.receiptCode}</span>
            {record.receiptAmountKobo != null
              ? ` · ${formatNaira(record.receiptAmountKobo, { fromKobo: true })}`
              : ''}
          </p>
        ) : null}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-[var(--kura-text)]">Updates</h3>
          {!record.closed && isAuthenticated ? (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="text-[12px] font-bold text-[var(--kura-teal-bright)]"
            >
              Reply
            </button>
          ) : null}
        </div>
        <ul className="flex flex-col gap-2">
          {record.events.map((ev) => (
            <li
              key={ev.id}
              className="rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-3 py-2.5"
            >
              <p className="text-[13px] font-semibold text-[var(--kura-text)]">
                {ev.body || ev.attachmentName || 'Update'}
              </p>
              {ev.attachmentUrl ? (
                <NoteAttachmentThumb
                  url={ev.attachmentUrl}
                  label={ev.attachmentName ?? undefined}
                  contentType={ev.attachmentType}
                />
              ) : null}
              <p className="mt-1 text-[11px] text-[var(--kura-muted)]">
                {ev.actor} · {ev.at}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <Modal
        opened={noteOpen}
        onClose={() => {
          if (noteMut.isPending || mediaUpload.isUploading) return
          setNoteOpen(false)
        }}
        centered
        withCloseButton={false}
        radius="lg"
        padding="lg"
        size="md"
        overlayProps={{ backgroundOpacity: 0.45, blur: 8 }}
        classNames={{
          content:
            'border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)]',
        }}
      >
        <ActionIcon
          variant="subtle"
          color="gray"
          radius="xl"
          size="md"
          onClick={() => setNoteOpen(false)}
          aria-label="Close"
          pos="absolute"
          top={12}
          right={12}
          className="z-10"
        >
          <Cancel01Icon size={16} />
        </ActionIcon>
        <Stack gap="md" pt={4}>
          <div>
            <Title order={4} className="text-[var(--kura-teal-bright)]">
              Reply
            </Title>
            <Text size="sm" className="mt-1 text-[var(--kura-muted)]">
              Message goes to the case thread. Ops sees it on this case in admin.
            </Text>
          </div>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            minRows={3}
            autosize
            placeholder="What else should we know?"
          />
          <MediaDropzone
            value={draftFile}
            onChange={setDraftFile}
            label="Optional photo"
            description="PNG or JPG · max 5 MB"
            maxSizeMB={5}
            minHeight={120}
            compact
          />
          <OperatorPrimaryButton
            disabled={(!draft.trim() && !draftFile) || noteMut.isPending}
            onClick={() => {
              submitNote()
            }}
          >
            Send
          </OperatorPrimaryButton>
        </Stack>
      </Modal>

      <KuraIllustrationModal
        opened={busyOpen && !mediaUpload.isUploading}
        onClose={() => {}}
        illustrationId="syncing"
        title="Sending"
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
      />
    </div>
  )
}
