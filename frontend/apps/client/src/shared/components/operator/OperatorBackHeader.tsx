import React from 'react'
import { ArrowLeft01Icon } from 'hugeicons-react'

interface OperatorBackHeaderProps {
  title: string
  onBack: () => void
  subtitle?: string
  trailing?: React.ReactNode
}

export const OperatorBackHeader: React.FC<OperatorBackHeaderProps> = ({
  title,
  onBack,
  subtitle,
  trailing,
}) => {
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 self-start text-sm text-[var(--kura-muted)]"
      >
        <ArrowLeft01Icon size={16} />
        Back
      </button>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[var(--kura-text)]">{title}</h2>
        {trailing}
      </div>
      {subtitle ? (
        <p className="text-xs text-[var(--kura-muted)]">{subtitle}</p>
      ) : null}
    </div>
  )
}
