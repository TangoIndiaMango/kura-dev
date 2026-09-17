import React, { useEffect, useMemo, useState } from 'react'
import { Add01Icon, QrCode01Icon, ArrowRight01Icon } from 'hugeicons-react'
import { useMantineColorScheme } from '@mantine/core'
import type { OperatorActiveReservation } from '../../../shared/session'
import {
  ActivityTypeIcon,
  activityIconFromTitle,
} from '../../../shared/components/operator/ActivityTypeIcon'
import { OperatorBackHeader } from '../../../shared/components/operator/OperatorBackHeader'
import { IllustrationHero } from '../../../shared/components/IllustrationHero'
import { nowMs } from '../../../shared/time/serverClock'

function formatClock(msLeft: number) {
  const total = Math.max(0, Math.floor(msLeft / 1000))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export interface SwapRecentItem {
  id: string
  title: string
  meta: string
  amountLabel: string
  tone: 'credit' | 'debit' | 'neutral' | 'plan'
  /** Payment UUID — only when a ledger receipt exists. */
  receiptId?: string
  inProgress?: boolean
  incomplete?: boolean
  paymentMode?: string
  uiStatus?: string
}

interface SwapHubScreenProps {
  holds: OperatorActiveReservation[]
  recentSwaps: SwapRecentItem[]
  loading?: boolean
  onOpenHold: (id: string) => void
  onNewSwap: () => void
  onSeeHistory?: () => void
  onOpenReceipt?: (receiptId: string) => void
  onOpenInProgressSwap?: (item: SwapRecentItem) => void
  onOpenIncompleteSwap?: (item: SwapRecentItem) => void
}

const HOLD_PREVIEW = 3
const RECENT_PREVIEW = 5

function HoldRow({
  hold,
  now,
  emphasize,
  onOpen,
}: {
  hold: OperatorActiveReservation
  now: number
  emphasize?: boolean
  onOpen: () => void
}) {
  const msLeft = hold.expiresAt - now
  const expired = msLeft <= 0
  const urgent = !expired && msLeft < 5 * 60 * 1000

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3.5 text-left transition ${
        emphasize
          ? 'border-[var(--kura-amber)]/45 bg-[var(--kura-amber)]/8'
          : 'border-[var(--kura-border)] bg-[var(--kura-bg-elevated)]'
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          emphasize
            ? 'bg-[var(--kura-amber)]/20 text-[var(--kura-amber)]'
            : 'bg-[var(--kura-teal)]/15 text-[var(--kura-teal-bright)]'
        }`}
      >
        <QrCode01Icon size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] font-extrabold tabular-nums ${
              expired
                ? 'bg-[var(--kura-coral)]/15 text-[var(--kura-coral)]'
                : urgent || emphasize
                  ? 'bg-[var(--kura-amber)]/20 text-[var(--kura-amber)]'
                  : 'bg-[var(--kura-teal)]/15 text-[var(--kura-teal-bright)]'
            }`}
          >
            {expired ? 'Expired' : formatClock(msLeft)}
          </span>
          <span className="font-mono text-[14px] font-bold tracking-wide text-[var(--kura-text)]">
            {hold.code}
          </span>
        </span>
        <span className="mt-1 block truncate text-[12px] text-[var(--kura-muted)]">
          {hold.hubName} · {hold.vehicleLabel}
        </span>
      </span>
      <span className="shrink-0 text-[12px] font-bold text-[var(--kura-teal-bright)]">
        QR
      </span>
    </button>
  )
}

/**
 * Swaps hub — book CTA first, live holds (cap 3), recent completed fills the page
 * like Wallet transactions. Full holds / full history via View all / See all.
 */
export const SwapHubScreen: React.FC<SwapHubScreenProps> = ({
  holds,
  recentSwaps,
  loading = false,
  onOpenHold,
  onNewSwap,
  onSeeHistory,
  onOpenReceipt,
  onOpenInProgressSwap,
  onOpenIncompleteSwap,
}) => {
  const [now, setNow] = useState(nowMs)
  const [holdsExpanded, setHoldsExpanded] = useState(false)
  const { colorScheme } = useMantineColorScheme()
  const theme = colorScheme === 'light' ? 'light' : 'dark'

  useEffect(() => {
    const id = window.setInterval(() => setNow(nowMs()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const sorted = useMemo(
    () => [...holds].sort((a, b) => a.expiresAt - b.expiresAt),
    [holds],
  )

  const openPastSwaps = () => {
    sessionStorage.setItem('kura_history_filter', 'swaps')
    onSeeHistory?.()
  }

  if (holdsExpanded) {
    return (
      <div className="flex flex-col gap-4">
        <OperatorBackHeader
          title="Active holds"
          onBack={() => setHoldsExpanded(false)}
        />
        <p className="text-[12px] text-[var(--kura-muted)]">
          {sorted.length} live reservation{sorted.length === 1 ? '' : 's'} · tap
          for QR
        </p>
        <ul className="flex flex-col gap-2.5">
          {sorted.map((hold, i) => (
            <li key={hold.id}>
              <HoldRow
                hold={hold}
                now={now}
                emphasize={i === 0 && hold.expiresAt > now}
                onOpen={() => onOpenHold(hold.id)}
              />
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onNewSwap}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--kura-border)] py-3.5 text-[14px] font-bold text-[var(--kura-text)]"
        >
          <Add01Icon size={16} />
          Book another swap
        </button>
      </div>
    )
  }

  const previewHolds = sorted.slice(0, HOLD_PREVIEW)
  const hasMoreHolds = sorted.length > HOLD_PREVIEW
  const previewRecent = recentSwaps.slice(0, RECENT_PREVIEW)

  const amountClass = (tone: SwapRecentItem['tone']) => {
    if (tone === 'plan') return 'text-[var(--kura-green)]'
    if (tone === 'debit') return 'text-[var(--kura-amber)]'
    if (tone === 'credit') return 'text-[var(--kura-green)]'
    return 'text-[var(--kura-muted)]'
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--kura-text)]">
            Swaps
          </h2>
          {sorted.length > 0 ? (
            <p className="mt-0.5 text-[12px] font-semibold tabular-nums text-[var(--kura-muted)]">
              {sorted.length} active hold{sorted.length === 1 ? '' : 's'}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onNewSwap}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--kura-amber)] px-3.5 py-2.5 text-[13px] font-extrabold text-[#1a1204]"
        >
          <Add01Icon size={16} />
          Book
        </button>
      </header>

      {sorted.length > 0 ? (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--kura-muted)]">
              Active now
            </h3>
            {hasMoreHolds ? (
              <button
                type="button"
                onClick={() => setHoldsExpanded(true)}
                className="text-[12px] font-bold text-[var(--kura-teal-bright)]"
              >
                View all ({sorted.length})
              </button>
            ) : null}
          </div>
          <ul className="flex flex-col gap-2">
            {previewHolds.map((hold, i) => (
              <li key={hold.id}>
                <HoldRow
                  hold={hold}
                  now={now}
                  emphasize={i === 0 && hold.expiresAt > now}
                  onOpen={() => onOpenHold(hold.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {loading && previewRecent.length === 0 && sorted.length === 0 ? (
        <div className="flex flex-col gap-3 py-2">
          <div className="h-[72px] animate-pulse rounded-2xl bg-[var(--kura-border)]/40" />
          <div className="h-[72px] animate-pulse rounded-2xl bg-[var(--kura-border)]/40" />
          <div className="h-[72px] animate-pulse rounded-2xl bg-[var(--kura-border)]/40" />
        </div>
      ) : previewRecent.length === 0 && sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-2 py-6 text-center">
          <IllustrationHero
            id="no-activity"
            theme={theme}
            imgClassName="mx-auto h-[120px] w-auto object-contain"
          />
          <div className="flex flex-col gap-1">
            <p className="text-[15px] font-extrabold text-[var(--kura-text)]">
              Ready when you are
            </p>
            <p className="mx-auto max-w-[260px] text-[12px] leading-relaxed text-[var(--kura-muted)]">
              Book a battery, pick it up at the hub with your QR, and your swaps
              will show up here.
            </p>
          </div>
          <button
            type="button"
            onClick={onNewSwap}
            className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-[var(--kura-amber)] px-4 py-2.5 text-[13px] font-extrabold text-[#1a1204]"
          >
            <Add01Icon size={16} />
            Book a swap
          </button>
        </div>
      ) : previewRecent.length > 0 ? (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-sm font-bold text-[var(--kura-text)]">
              Recent swaps
            </h3>
            {onSeeHistory ? (
              <button
                type="button"
                onClick={openPastSwaps}
                className="text-[13px] font-bold text-[var(--kura-teal-bright)]"
              >
                See all
              </button>
            ) : null}
          </div>

          <div className="divide-y divide-[var(--kura-border-subtle)] rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4">
            {previewRecent.map((item) => {
              const tappable = Boolean(
                item.receiptId || item.incomplete || item.inProgress,
              )
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!tappable}
                  onClick={() => {
                    if (item.receiptId) {
                      onOpenReceipt?.(item.receiptId)
                      return
                    }
                    if (item.incomplete) {
                      onOpenIncompleteSwap?.(item)
                      return
                    }
                    if (item.inProgress) {
                      onOpenInProgressSwap?.(item)
                    }
                  }}
                  className={`flex w-full items-center gap-3 py-3.5 text-left ${
                    tappable ? 'active:opacity-70' : 'cursor-default'
                  }`}
                >
                  <ActivityTypeIcon
                    kind={activityIconFromTitle(item.title)}
                    size="sm"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] font-bold text-[var(--kura-text)]">
                      {item.title}
                    </span>
                    <span className="truncate text-[11px] text-[var(--kura-muted)]">
                      {item.meta}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-[12px] font-bold ${amountClass(item.tone)}`}
                  >
                    {item.amountLabel}
                  </span>
                  {tappable ? (
                    <ArrowRight01Icon
                      size={14}
                      className="shrink-0 text-[var(--kura-muted)]"
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
