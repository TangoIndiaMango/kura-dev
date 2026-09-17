import React from 'react'
import { HoldFillButton } from './operator/HoldFillButton'

interface ConfirmDialogProps {
  opened: boolean
  title: string
  description?: string
  confirmLabel?: string
  /** Omit to show a single confirm button (e.g. success ack). */
  cancelLabel?: string
  danger?: boolean
  /** When true (default for danger), confirm requires press-and-hold. */
  holdToConfirm?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  opened,
  title,
  description,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  danger = false,
  holdToConfirm,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!opened) return null

  const showCancel = cancelLabel != null && cancelLabel !== ''
  const useHold = holdToConfirm ?? danger

  return (
    <div
      className="fixed inset-0 z-[450] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kura-confirm-title"
    >
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onCancel}
      />
      <div className="kura-sheet-enter relative z-10 w-full max-w-[320px] overflow-hidden rounded-[20px] border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] p-5 shadow-2xl">
        <h2
          id="kura-confirm-title"
          className="text-[18px] font-bold text-[var(--kura-text)]"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--kura-muted)]">
            {description}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2.5">
          {useHold ? (
            <HoldFillButton
              key="hold-confirm"
              tone={danger ? 'danger' : 'teal'}
              durationMs={danger ? 1000 : 850}
              onComplete={onConfirm}
              hint="Hold to confirm"
            >
              {confirmLabel}
            </HoldFillButton>
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              className={`w-full rounded-xl py-3.5 text-[14px] font-bold text-white ${
                danger ? 'bg-[var(--kura-coral)]' : 'bg-[var(--kura-teal)]'
              }`}
            >
              {confirmLabel}
            </button>
          )}
          {showCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-xl border border-[var(--kura-border)] py-3.5 text-[14px] font-bold text-[var(--kura-text)]"
            >
              {cancelLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
