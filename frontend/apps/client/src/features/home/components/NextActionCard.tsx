import React from 'react'
import { ArrowRight01Icon } from 'hugeicons-react'
import type { NextAction } from '../../../shared/session'

interface NextActionCardProps {
  action: NextAction
  onAction: () => void
}

export const NextActionCard: React.FC<NextActionCardProps> = ({
  action,
  onAction,
}) => {
  return (
    <button
      type="button"
      onClick={onAction}
      className="flex w-full items-center justify-between rounded-2xl border border-[var(--kura-teal)]/45 bg-[var(--kura-teal)]/10 px-4 py-4 text-left transition hover:border-[var(--kura-teal)]"
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--kura-teal-bright)]">
          Next
        </span>
        <span className="text-[15px] font-bold text-[var(--kura-text)]">
          {action.title}
        </span>
      </span>
      <ArrowRight01Icon size={18} className="text-[var(--kura-teal-bright)]" />
    </button>
  )
}
