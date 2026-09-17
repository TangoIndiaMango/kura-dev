import React from 'react'
import { Cancel01Icon } from 'hugeicons-react'

interface OperatorSheetProps {
  opened: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function OperatorSheet({
  opened,
  title,
  onClose,
  children,
}: OperatorSheetProps) {
  if (!opened) return null

  return (
    <div
      className="fixed inset-0 z-[450] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="kura-sheet-enter relative z-10 flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-[1.5rem] border border-[var(--kura-border)] bg-[var(--kura-bg)] shadow-2xl sm:rounded-[1.5rem]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--kura-border-subtle)] px-4 py-3.5">
          <h2 className="text-[16px] font-bold text-[var(--kura-text)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--kura-border)] p-2 text-[var(--kura-muted)]"
          >
            <Cancel01Icon size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  )
}
