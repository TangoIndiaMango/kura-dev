import type { ReactNode } from 'react'
import { useMantineColorScheme } from '@mantine/core'
import { Cancel01Icon } from 'hugeicons-react'
import {
  illustrationHasGif,
  KURA_ILLUSTRATIONS,
  type KuraIllustrationId,
} from '../illustrations/catalog'
import { ProgressMotionBar } from './ProgressMotionBar'
import { IllustrationHero } from './IllustrationHero'

export interface KuraIllustrationModalProps {
  opened: boolean
  onClose: () => void
  illustrationId?: KuraIllustrationId
  illustration?: ReactNode
  title?: string
  description?: ReactNode
  children?: ReactNode
  /** When set, replaces indeterminate motion with a real 0–100 bar. */
  progressValue?: number
  progressLabel?: string
  primaryAction: {
    label: string
    onClick: () => void
    loading?: boolean
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    disabled?: boolean
  }
  /** Outline/secondary style primary (Cancel / Hide on progress cards) */
  primaryOutline?: boolean
  closeOnClickOutside?: boolean
}

/**
 * Status sheet matching Operator Modal Illustrations hifi.
 * Narrow phone card (~320px), theme-aware light/dark surfaces.
 */
export function KuraIllustrationModal({
  opened,
  onClose,
  illustrationId,
  illustration,
  title,
  description,
  children,
  progressValue,
  progressLabel,
  primaryAction,
  secondaryAction,
  primaryOutline = false,
  closeOnClickOutside = true,
}: KuraIllustrationModalProps) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme !== 'light'
  const meta = illustrationId ? KURA_ILLUSTRATIONS[illustrationId] : null
  const resolvedTitle = title ?? meta?.title ?? ''
  const resolvedDescription = description ?? meta?.description
  const tone = meta?.tone ?? 'info'
  const useOutline =
    primaryOutline || tone === 'progress'
  const hasGif = illustrationId ? illustrationHasGif(illustrationId) : false

  // CSS motion only when we do not have a real GIF for this state
  const progressMotion =
    hasGif
      ? ''
      : illustrationId === 'syncing' || illustrationId === 'reconnecting'
        ? 'kura-illust-spin'
        : illustrationId === 'finding-hubs'
          ? 'kura-illust-radar'
          : illustrationId === 'processing-payment' ||
              illustrationId === 'swap-in-progress' ||
              illustrationId === 'reservation-countdown'
            ? 'kura-illust-pulse'
            : ''

  if (!opened) return null

  const defaultProgressLabel =
    progressLabel ??
    (illustrationId === 'finding-hubs'
      ? 'Scanning nearby hubs…'
      : illustrationId === 'processing-payment'
        ? 'Talking to your bank…'
        : illustrationId === 'swap-in-progress'
          ? 'Agent is working…'
          : illustrationId === 'syncing'
            ? 'Pulling latest balance…'
            : illustrationId === 'reconnecting'
              ? 'Reaching KURA…'
              : 'Please wait…')

  const hero = illustration ?? (
    illustrationId ? (
    <div className="flex w-full flex-col items-center gap-3">
        <div
          className={`relative mx-auto flex h-[140px] w-full max-w-[240px] items-center justify-center ${progressMotion}`}
        >
          {!hasGif && tone === 'progress' ? (
            <>
              <span className="kura-radar-ring" aria-hidden />
              <span className="kura-radar-ring kura-radar-ring-delay" aria-hidden />
            </>
          ) : null}
          <IllustrationHero
            id={illustrationId}
            theme={isDark ? 'dark' : 'light'}
          />
        </div>
        {!hasGif && tone === 'progress' ? (
          <ProgressMotionBar label={defaultProgressLabel} value={progressValue} />
        ) : null}
      </div>
    ) : null
  )

  return (
    <div
      className="fixed inset-0 z-[400] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kura-status-title"
    >
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity"
        onClick={closeOnClickOutside ? onClose : undefined}
      />

      <div
        className={`kura-sheet-enter relative z-10 w-full max-w-[320px] overflow-hidden rounded-[20px] border shadow-2xl ${
          isDark
            ? 'border-[var(--kura-border)] bg-[#0E1C24] text-[var(--kura-text)]'
            : 'border-[#E6EEF2] bg-white text-[#003153]'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={`absolute right-3 top-3 rounded-lg p-1.5 ${
            isDark ? 'text-[var(--kura-text)]/40 hover:text-[var(--kura-text)]' : 'text-[#94A3B8] hover:text-[#003153]'
          }`}
        >
          <Cancel01Icon size={16} />
        </button>

        <div className="flex flex-col items-center gap-4 px-5 pb-5 pt-7">
          {hero}

          <div className="flex flex-col items-center gap-2 px-1 text-center">
            <h2
              id="kura-status-title"
              className="text-[20px] font-bold leading-tight tracking-tight"
            >
              {resolvedTitle}
            </h2>
            {resolvedDescription ? (
              <p
                className={`text-[13px] leading-relaxed ${
                  isDark ? 'text-[var(--kura-muted)]' : 'text-[#5B6B76]'
                }`}
              >
                {resolvedDescription}
              </p>
            ) : null}
          </div>

          {children ? <div className="w-full">{children}</div> : null}

          <div className="flex w-full flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.loading}
              className={`w-full rounded-xl px-4 py-3.5 text-[15px] font-bold transition active:scale-[0.98] disabled:opacity-60 ${
                useOutline
                  ? isDark
                    ? 'border border-[var(--kura-border)] bg-transparent text-[var(--kura-text)]'
                    : 'border border-[#D0D5DD] bg-transparent text-[#003153]'
                  : 'bg-[var(--kura-teal)] text-[var(--kura-text-inverse)]'
              }`}
            >
              {primaryAction.label}
            </button>

            {secondaryAction ? (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                disabled={secondaryAction.disabled}
                className={`w-full py-2 text-sm font-semibold ${
                  isDark ? 'text-[var(--kura-text)]/50' : 'text-[#667085]'
                }`}
              >
                {secondaryAction.label}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
