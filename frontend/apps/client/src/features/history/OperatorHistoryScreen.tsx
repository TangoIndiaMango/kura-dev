import React, { useMemo, useState } from 'react'
import { OperatorBackHeader } from '../../shared/components/operator/OperatorBackHeader'
import { OperatorListPagination } from '../../shared/components/operator/OperatorListPagination'
import {
  ActivityTypeIcon,
  activityIconFromTitle,
} from '../../shared/components/operator/ActivityTypeIcon'
import { KuraIllustrationModal } from '../../shared/components'
import { formatNaira } from '../../shared/utils/currency'
import { useAuth } from '../auth/AuthProvider'
import { useMySwaps } from '../swap/hooks/use-swap-live'
import { useOperatorPayments } from '../wallet/hooks/use-operator-wallet'
import { paymentToHistory, swapToHistory } from './historyLiveMap'
import {
  matchesSwapFilter,
  type HistoryFilter,
  type HistoryItem,
  type SwapHistoryFilter,
} from './historyTypes'

interface OperatorHistoryScreenProps {
  onBack: () => void
  onOpenReceipt: (receiptId: string) => void
}

const KIND_FILTERS: { id: HistoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'swaps', label: 'Swaps' },
  { id: 'payments', label: 'Payments' },
  { id: 'plans', label: 'Plans' },
]

const SWAP_FILTERS: { id: SwapHistoryFilter; label: string }[] = [
  { id: 'all', label: 'All swaps' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'plan', label: 'Plan' },
  { id: 'wallet', label: 'Paid online' },
  { id: 'cash', label: 'Cash at hub' },
]

const PAGE_SIZE = 10

const toneClass = (tone: HistoryItem['tone']) => {
  if (tone === 'credit' || tone === 'plan') return 'text-[var(--kura-green)]'
  if (tone === 'danger') return 'text-[var(--kura-coral)]'
  if (tone === 'debit') return 'text-[var(--kura-amber)]'
  return 'text-[var(--kura-muted)]'
}

function readEntry(): { scope: 'full' | 'swaps'; kind: HistoryFilter } {
  const raw = sessionStorage.getItem('kura_history_filter')
  sessionStorage.removeItem('kura_history_filter')
  if (raw === 'swaps') return { scope: 'swaps', kind: 'swaps' }
  if (raw === 'payments' || raw === 'plans' || raw === 'all') {
    return { scope: 'full', kind: raw }
  }
  return { scope: 'full', kind: 'all' }
}

export const OperatorHistoryScreen: React.FC<OperatorHistoryScreenProps> = ({
  onBack,
  onOpenReceipt,
}) => {
  const { isAuthenticated } = useAuth()
  const entry = useMemo(() => readEntry(), [])
  const swapScope = entry.scope === 'swaps'
  const liveSwaps = useMySwaps({ enabled: isAuthenticated })
  const livePayments = useOperatorPayments({ enabled: isAuthenticated })

  const [kindFilter, setKindFilter] = useState<HistoryFilter>(entry.kind)
  const [swapFilter, setSwapFilter] = useState<SwapHistoryFilter>('all')
  const [page, setPage] = useState(1)
  const [peek, setPeek] = useState<HistoryItem | null>(null)

  const liveItems = useMemo(() => {
    const swaps = liveSwaps.swaps.map(swapToHistory)
    const payments = livePayments.payments.map(paymentToHistory)
    return { swaps, payments, all: [...swaps, ...payments] }
  }, [liveSwaps.swaps, livePayments.payments])

  const filtered = useMemo(() => {
    if (swapScope) {
      return liveItems.swaps.filter((item) =>
        matchesSwapFilter(item, swapFilter),
      )
    }
    if (kindFilter === 'swaps') return liveItems.swaps
    if (kindFilter === 'payments') return liveItems.payments
    if (kindFilter === 'plans') {
      return liveItems.payments.filter((p) =>
        /plan/i.test(p.title + p.meta),
      )
    }
    return liveItems.all
  }, [liveItems, swapScope, swapFilter, kindFilter])

  const loading =
    isAuthenticated && (liveSwaps.isLoading || livePayments.isLoading)
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  const chips = swapScope ? SWAP_FILTERS : KIND_FILTERS
  const paidLabel = formatNaira(
    liveItems.payments.reduce((sum, p) => {
      const n = Number(String(p.amountLabel).replace(/[^\d.-]/g, ''))
      return sum + (Number.isFinite(n) ? n : 0)
    }, 0),
  )

  const onRowClick = (item: HistoryItem) => {
    if (item.receiptId || item.tapKind === 'receipt') {
      if (item.receiptId) onOpenReceipt(item.receiptId)
      return
    }
    if (item.tapKind === 'incomplete' || item.tapKind === 'in_progress') {
      setPeek(item)
    }
  }

  const peekIncomplete = peek?.tapKind === 'incomplete'
  const peekInProgress = peek?.tapKind === 'in_progress'

  return (
    <div className="flex flex-col gap-4">
      <OperatorBackHeader
        title={swapScope ? 'Swap history' : 'History'}
        onBack={onBack}
      />

      <section className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--kura-border)] bg-gradient-to-br from-[#003153] to-[#0D7C8F] p-3.5 text-white shadow-lg">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-200/70">
            Swaps
          </p>
          <p className="mt-1 text-[20px] font-extrabold tabular-nums">
            {liveItems.swaps.length}
          </p>
          <p className="text-[10px] text-sky-100/70">Recent</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-200/70">
            {swapScope ? 'Showing' : 'Paid'}
          </p>
          <p className="mt-1 text-[20px] font-extrabold tabular-nums">
            {swapScope ? filtered.length : paidLabel}
          </p>
          <p className="text-[10px] text-sky-100/70">
            {swapScope ? 'matching filter' : 'from payments'}
          </p>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {chips.map((f) => {
          const active = swapScope ? f.id === swapFilter : f.id === kindFilter
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                if (swapScope) setSwapFilter(f.id as SwapHistoryFilter)
                else setKindFilter(f.id as HistoryFilter)
                setPage(1)
              }}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition ${
                active
                  ? 'bg-[var(--kura-teal)] text-[var(--kura-text-inverse)]'
                  : 'border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] text-[var(--kura-muted)]'
              }`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-[var(--kura-border)]/40"
            />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-[var(--kura-border-subtle)] rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)]">
          {pageItems.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-[var(--kura-muted)]">
              No activity yet.
            </p>
          ) : (
            pageItems.map((item) => {
              const tappable =
                Boolean(item.receiptId) ||
                item.tapKind === 'receipt' ||
                item.tapKind === 'incomplete' ||
                item.tapKind === 'in_progress'
              return (
              <button
                key={item.id}
                type="button"
                disabled={!tappable}
                onClick={() => onRowClick(item)}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${
                  tappable ? 'active:opacity-70' : 'cursor-default'
                }`}
              >
                <ActivityTypeIcon kind={activityIconFromTitle(item.title)} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-bold text-[var(--kura-text)]">
                    {item.title}
                  </span>
                  <span className="truncate text-[11px] text-[var(--kura-muted)]">
                    {item.meta}
                  </span>
                </span>
                <span
                  className={`shrink-0 text-[12px] font-bold ${toneClass(item.tone)}`}
                >
                  {item.amountLabel}
                </span>
              </button>
              )
            })
          )}
        </div>
      )}

      {pageCount > 1 ? (
        <OperatorListPagination
          page={safePage}
          totalPages={pageCount}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      ) : null}

      <KuraIllustrationModal
        opened={Boolean(peek) && peekIncomplete}
        onClose={() => setPeek(null)}
        illustrationId={
          peek?.uiStatus === 'FAILED' ? 'payment-declined' : 'reservation-expired'
        }
        title={
          peek?.uiStatus === 'FAILED' ? 'Swap not completed' : 'No receipt yet'
        }
        description={
          peek
            ? peek.uiStatus === 'FAILED'
              ? `${peek.title} was closed without finishing at the bay. No fee was charged, so there is no receipt.`
              : `${peek.title} never finished at the bay before the hold expired. Pay-as-you-go only creates a receipt after the hub agent completes the swap. No fee was charged.`
            : undefined
        }
        primaryAction={{
          label: 'Got it',
          onClick: () => setPeek(null),
        }}
      />
      <KuraIllustrationModal
        opened={Boolean(peek) && peekInProgress}
        onClose={() => setPeek(null)}
        illustrationId="swap-in-progress"
        title="Waiting on the hub"
        description={
          peek
            ? `${peek.title} · ${peek.amountLabel}. Your receipt appears here as soon as the agent finishes the swap (return + issue). Until then the fee is only reserved.`
            : undefined
        }
        primaryAction={{
          label: 'Got it',
          onClick: () => setPeek(null),
        }}
      />
    </div>
  )
}
