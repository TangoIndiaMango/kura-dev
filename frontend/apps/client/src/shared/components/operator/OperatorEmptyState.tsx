import React from 'react'
import { useMantineColorScheme } from '@mantine/core'
import { IllustrationHero } from '../IllustrationHero'
import type { KuraIllustrationId } from '../../illustrations/catalog'

interface OperatorEmptyStateProps {
  illustration: KuraIllustrationId
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  secondaryNote?: string
  framed?: boolean
}

export const OperatorEmptyState: React.FC<OperatorEmptyStateProps> = ({
  illustration,
  title,
  description,
  actionLabel,
  onAction,
  secondaryNote,
  framed = true,
}) => {
  const { colorScheme } = useMantineColorScheme()
  const theme = colorScheme === 'light' ? 'light' : 'dark'

  return (
    <div
      className={`flex flex-col items-center gap-3 px-4 py-8 text-center ${
        framed
          ? 'rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)]'
          : ''
      }`}
    >
      <IllustrationHero
        id={illustration}
        theme={theme}
        variant="static"
        imgClassName="mx-auto h-[120px] w-auto object-contain"
      />
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-extrabold text-[var(--kura-text)]">
          {title}
        </p>
        <p className="mx-auto max-w-[280px] text-[12px] leading-relaxed text-[var(--kura-muted)]">
          {description}
        </p>
      </div>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-[var(--kura-amber)] px-4 py-2.5 text-[13px] font-extrabold text-[#1a1204]"
        >
          {actionLabel}
        </button>
      ) : null}
      {secondaryNote ? (
        <p className="mx-auto max-w-[280px] text-[11px] leading-relaxed text-[var(--kura-muted)]">
          {secondaryNote}
        </p>
      ) : null}
    </div>
  )
}
