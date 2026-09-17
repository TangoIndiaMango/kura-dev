import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMantineColorScheme } from '@mantine/core'
import { Cancel01Icon } from 'hugeicons-react'
import {
  illustrationHasGif,
  illustrationPngFallback,
  illustrationSrc,
  KURA_ILLUSTRATIONS,
  type KuraIllustrationId,
} from '../illustrations/catalog'
import { ProgressMotionBar } from './ProgressMotionBar'

/**
 * center = stacked “normal” modal (e.g. Note added)
 * side = 560px horizontal action card (confirm / ops success / applying)
 */
export type KuraModalLayout = 'center' | 'side'

export interface KuraIllustrationModalProps {
  opened: boolean
  onClose: () => void
  illustrationId?: KuraIllustrationId
  illustration?: ReactNode
  /** @deprecated Prefer illustrationId + catalog tone */
  variant?: 'info' | 'success' | 'warning' | 'danger'
  title?: string
  description?: ReactNode
  children?: ReactNode
  primaryAction: {
    label: string
    onClick: () => void
    loading?: boolean
    tone?: 'primary' | 'danger'
    disabled?: boolean
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    disabled?: boolean
  }
  /** Force layout; otherwise inferred from illustrationId */
  layout?: KuraModalLayout
  primaryOutline?: boolean
  closeOnClickOutside?: boolean
}

/**
 * Centered stack — only simple “Done” completions from hifi (e.g. Note added).
 * Ops success / confirm / applying stay on the 560px side card.
 */
const CENTER_LAYOUT_IDS = new Set<KuraIllustrationId>(['note-added'])

const VARIANT_FALLBACK_ID: Record<
  NonNullable<KuraIllustrationModalProps['variant']>,
  KuraIllustrationId
> = {
  info: 'success-check',
  success: 'success',
  warning: 'confirm-action',
  danger: 'action-failed',
}

function progressMotionClass(id?: KuraIllustrationId): string {
  if (!id) return ''
  if (
    id === 'syncing' ||
    id === 'reconnecting' ||
    id === 'syncing-partner' ||
    id === 'recomputing'
  ) {
    return 'kura-illust-spin'
  }
  if (
    id === 'applying' ||
    id === 'exporting' ||
    id === 'awaiting-partner' ||
    id === 'processing-payment' ||
    id === 'swap-in-progress' ||
    id === 'reservation-countdown' ||
    id === 'finding-hubs'
  ) {
    return 'kura-illust-pulse'
  }
  return ''
}

function progressLabel(id?: KuraIllustrationId): string {
  switch (id) {
    case 'applying':
      return 'Applying change…'
    case 'exporting':
      return 'Preparing export…'
    case 'recomputing':
      return 'Recomputing score…'
    case 'syncing-partner':
      return 'Syncing with payment partner…'
    case 'awaiting-partner':
      return 'Waiting on partner…'
    default:
      return 'Please wait…'
  }
}

function resolveLayout(
  layout: KuraModalLayout | undefined,
  id?: KuraIllustrationId,
): KuraModalLayout {
  if (layout) return layout
  if (id && CENTER_LAYOUT_IDS.has(id)) return 'center'
  return 'side'
}

/**
 * Admin status modals — two presentations from hifi:
 * - center (~380px): illustration above, text, full-width CTA (notes / simple done)
 * - side (~560px): illustration left 160px, copy + actions right (confirm / ops flows)
 */
export function KuraIllustrationModal({
  opened,
  onClose,
  illustrationId,
  illustration,
  variant,
  title,
  description,
  children,
  primaryAction,
  secondaryAction,
  layout,
  primaryOutline = false,
  closeOnClickOutside = true,
}: KuraIllustrationModalProps) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme !== 'light'
  const resolvedId =
    illustrationId ?? (variant ? VARIANT_FALLBACK_ID[variant] : undefined)
  const meta = resolvedId ? KURA_ILLUSTRATIONS[resolvedId] : null
  const resolvedTitle = title ?? meta?.title ?? ''
  const resolvedDescription = description ?? meta?.description
  const tone = meta?.tone ?? variant ?? 'info'
  const useOutline = primaryOutline || tone === 'progress'
  const hasGif = resolvedId ? illustrationHasGif(resolvedId) : false
  const motionClass = hasGif ? '' : progressMotionClass(resolvedId)
  const mode = resolveLayout(layout, resolvedId)
  const themeKey = isDark ? 'dark' : 'light'

  if (!opened) return null

  const illustNode =
    illustration ??
    (resolvedId ? (
      <div
        className={`relative flex items-center justify-center ${motionClass} ${
          mode === 'side' ? 'h-[160px] w-[160px]' : 'h-[140px] w-full max-w-[240px]'
        }`}
      >
        {!hasGif && tone === 'progress' && mode === 'center' ? (
          <>
            <span className="kura-radar-ring" aria-hidden />
            <span className="kura-radar-ring kura-radar-ring-delay" aria-hidden />
          </>
        ) : null}
        <img
          key={`${resolvedId}-${themeKey}`}
          src={illustrationSrc(resolvedId, themeKey)}
          alt=""
          width={mode === 'side' ? 160 : 240}
          height={mode === 'side' ? 160 : 180}
          className={`relative z-[1] object-contain ${
            mode === 'side' ? 'h-[160px] w-[160px]' : 'mx-auto h-[140px] w-auto'
          }`}
          onError={(e) => {
            const img = e.currentTarget
            if (img.dataset.fallback === '1') return
            img.dataset.fallback = '1'
            img.src = illustrationPngFallback(resolvedId, themeKey)
          }}
        />
      </div>
    ) : null)

  const primaryClass =
    primaryAction.tone === 'danger'
      ? 'bg-[#C0392B] text-white hover:opacity-90'
      : useOutline
        ? 'border border-[var(--bd)] bg-transparent text-[var(--tx)]'
        : 'bg-[var(--pr)] text-white hover:opacity-90'

  if (mode === 'side') {
    return createPortal(
      <div
        className="fixed inset-0 z-[400] flex items-end justify-center p-4 sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kura-admin-status-title"
      >
        <button
          type="button"
          aria-label="Dismiss"
          className="absolute inset-0 bg-[var(--ov)] backdrop-blur-[2px]"
          onClick={closeOnClickOutside ? onClose : undefined}
        />

        <div className="kura-sheet-enter relative z-10 flex w-full max-w-[560px] flex-col overflow-hidden rounded-[20px] border border-[var(--bd)] bg-[var(--sf)] text-[var(--tx)] shadow-2xl sm:min-h-[220px] sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 z-20 rounded-lg p-1.5 text-[var(--mu)] hover:text-[var(--tx)]"
          >
            <Cancel01Icon size={16} />
          </button>

          <div
            className={`flex shrink-0 items-center justify-center p-6 sm:w-[200px] ${
              isDark ? 'bg-[var(--in)]' : 'bg-[var(--prs)]'
            }`}
          >
            {illustNode}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between gap-5 p-6 pr-12 sm:p-7 sm:pr-12">
            <div className="flex flex-col gap-2">
              <h2
                id="kura-admin-status-title"
                className="text-[18px] font-bold leading-tight tracking-tight text-[var(--tx)]"
              >
                {resolvedTitle}
              </h2>
              {resolvedDescription ? (
                <p className="text-[13px] leading-relaxed text-[var(--mu)]">
                  {resolvedDescription}
                </p>
              ) : null}
              {children}
              {tone === 'progress' && !hasGif ? (
                <ProgressMotionBar label={progressLabel(resolvedId)} />
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5">
              {secondaryAction ? (
                <button
                  type="button"
                  onClick={secondaryAction.onClick}
                  disabled={secondaryAction.disabled}
                  className="rounded-xl border border-[var(--bd)] px-4 py-2.5 text-[13.5px] font-bold text-[var(--tx)] transition disabled:opacity-50"
                >
                  {secondaryAction.label}
                </button>
              ) : null}
              <button
                type="button"
                onClick={primaryAction.onClick}
                disabled={
                  primaryAction.loading ||
                  primaryAction.disabled ||
                  tone === 'progress'
                }
                className={`rounded-xl px-5 py-2.5 text-[13.5px] font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 ${primaryClass}`}
              >
                {primaryAction.loading || tone === 'progress'
                  ? primaryAction.label === 'Please wait'
                    ? 'Please wait'
                    : primaryAction.label
                  : primaryAction.label}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  // —— Center / “normal” modal (Note added, etc.) ——
  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kura-admin-status-title"
    >
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-[var(--ov)] backdrop-blur-[2px]"
        onClick={closeOnClickOutside ? onClose : undefined}
      />

      <div className="kura-sheet-enter relative z-10 w-full max-w-[380px] overflow-hidden rounded-[24px] border border-[var(--bd)] bg-[var(--sf)] text-[var(--tx)] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-[var(--mu)] hover:text-[var(--tx)]"
        >
          <Cancel01Icon size={16} />
        </button>

        <div className="flex flex-col items-center gap-4 px-6 pb-6 pt-8">
          {illustNode}
          {tone === 'progress' && !hasGif ? (
            <ProgressMotionBar label={progressLabel(resolvedId)} />
          ) : null}

          <div className="flex flex-col items-center gap-2 px-1 text-center">
            <h2
              id="kura-admin-status-title"
              className="text-[20px] font-bold leading-tight tracking-tight text-[var(--tx)]"
            >
              {resolvedTitle}
            </h2>
            {resolvedDescription ? (
              <p className="text-[13px] leading-relaxed text-[var(--mu)]">
                {resolvedDescription}
              </p>
            ) : null}
          </div>

          {children ? <div className="w-full">{children}</div> : null}

          <div className="flex w-full flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.loading || primaryAction.disabled}
              className={`w-full rounded-xl px-4 py-3.5 text-[15px] font-bold transition active:scale-[0.98] disabled:opacity-60 ${primaryClass}`}
            >
              {primaryAction.loading ? 'Working…' : primaryAction.label}
            </button>
            {secondaryAction ? (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                disabled={secondaryAction.disabled}
                className="w-full py-2 text-sm font-semibold text-[var(--mu)] disabled:opacity-50"
              >
                {secondaryAction.label}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
