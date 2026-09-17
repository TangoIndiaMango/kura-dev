import { useEffect, useState } from 'react'
import { Select, Textarea } from '@mantine/core'
import { KuraIllustrationModal } from '@shared/components'

export type IdentityVerifyVia = 'MANUAL' | 'PROVIDER' | 'PSP'

const VIA_OPTIONS: Array<{ value: IdentityVerifyVia; label: string; hint: string }> = [
  {
    value: 'MANUAL',
    label: 'Manual review',
    hint: 'Ops reviewed face + ID photos in CRM.',
  },
  {
    value: 'PROVIDER',
    label: 'Identity provider',
    hint: 'Verified through an integrated KYC / NIN-BVN provider.',
  },
  {
    value: 'PSP',
    label: 'PSP check',
    hint: 'Verified via payment provider identity checks.',
  },
]

type Props = {
  opened: boolean
  loading?: boolean
  onClose: () => void
  onConfirm: (payload: { via: IdentityVerifyVia; note: string }) => void | Promise<void>
}

/**
 * Verify identity: pick channel first; review note only required for Manual.
 */
export function OperatorVerifyIdentityModal({
  opened,
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  const [via, setVia] = useState<IdentityVerifyVia | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!opened) return
    setVia(null)
    setNote('')
  }, [opened])

  const selected = VIA_OPTIONS.find((o) => o.value === via)
  const noteRequired = via === 'MANUAL'
  const canConfirm =
    Boolean(via) && (!noteRequired || note.trim().length > 0) && !loading

  return (
    <KuraIllustrationModal
      opened={opened}
      onClose={onClose}
      layout="side"
      illustrationId="account-verified"
      title="Verify identity?"
      description="Choose how this account was verified. Manual review asks for a short note."
      closeOnClickOutside={!loading}
      primaryAction={{
        label: 'Mark verified',
        loading,
        disabled: !canConfirm,
        onClick: async () => {
          if (!via || !canConfirm) return
          await onConfirm({ via, note: note.trim() })
        },
      }}
      secondaryAction={{
        label: 'Cancel',
        onClick: onClose,
        disabled: loading,
      }}
    >
      <div className="mt-1 flex w-full flex-col gap-3 text-left">
        <Select
          label="Verification channel"
          placeholder="Select channel"
          data={VIA_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          value={via}
          onChange={(v) => setVia((v as IdentityVerifyVia) || null)}
          allowDeselect={false}
          required
          styles={{
            input: {
              background: 'var(--in)',
              borderColor: 'var(--bd)',
              color: 'var(--tx)',
            },
          }}
        />
        {selected ? (
          <p className="text-[12px] leading-relaxed text-[var(--mu)]">{selected.hint}</p>
        ) : null}
        {via === 'MANUAL' ? (
          <Textarea
            label="Review note"
            placeholder="e.g. Matched NIN photo at Ikeja Along hub · agent Amaka"
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            minRows={3}
            required
            styles={{
              input: {
                background: 'var(--in)',
                borderColor: 'var(--bd)',
                color: 'var(--tx)',
              },
            }}
          />
        ) : null}
      </div>
    </KuraIllustrationModal>
  )
}
