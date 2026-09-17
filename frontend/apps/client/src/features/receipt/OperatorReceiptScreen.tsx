import React, { useState } from 'react'
import {
  Cancel01Icon,
  Download01Icon,
  Share01Icon,
  Tick02Icon,
} from 'hugeicons-react'
import { OperatorBackHeader } from '../../shared/components/operator/OperatorBackHeader'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { SupportNewCaseScreen } from '../account/components/SupportNewCaseScreen'
import { SupportCaseDetailScreen } from '../account/components/SupportCaseDetailScreen'
import {
  resolveReceiptView,
  usePaymentReceipt,
} from './hooks/use-payment-receipt'
import { downloadReceiptPdf, shareReceipt } from './receiptShare'
import { apiErrorMessage } from '../../lib/api/auth'
import { notifications } from '@mantine/notifications'

interface OperatorReceiptScreenProps {
  onBack: () => void
  receiptId?: string | null
}

type ReceiptView = 'receipt' | 'dispute' | 'case'

export const OperatorReceiptScreen: React.FC<OperatorReceiptScreenProps> = ({
  onBack,
  receiptId,
}) => {
  const liveQuery = usePaymentReceipt(receiptId)
  const data = resolveReceiptView(liveQuery.receipt, liveQuery.looksLive)
  const [view, setView] = useState<ReceiptView>('receipt')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [caseId, setCaseId] = useState<string | null>(null)
  const [openedCaseCode, setOpenedCaseCode] = useState<string | null>(null)
  const [shareAck, setShareAck] = useState<'shared' | 'copied' | 'saved' | null>(
    null,
  )
  const [busyAction, setBusyAction] = useState<'share' | 'download' | null>(null)

  if (liveQuery.looksLive && liveQuery.isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <OperatorBackHeader title="Receipt" onBack={onBack} />
        <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-[var(--kura-border)]/40" />
        <div className="mx-auto h-8 w-40 animate-pulse rounded-lg bg-[var(--kura-border)]/40" />
        <div className="h-48 animate-pulse rounded-2xl bg-[var(--kura-border)]/40" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <OperatorBackHeader title="Receipt" onBack={onBack} />
        <p className="text-[14px] text-[var(--kura-muted)]">
          Receipt not found for this payment.
        </p>
      </div>
    )
  }

  const ok = data.success !== false
  const paymentId = data.id

  const onShare = async () => {
    if (busyAction) return
    setBusyAction('share')
    try {
      const result = await shareReceipt(paymentId, data)
      setShareAck(result)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not share receipt'),
      })
    } finally {
      setBusyAction(null)
    }
  }

  const onDownload = async () => {
    if (busyAction) return
    setBusyAction('download')
    try {
      await downloadReceiptPdf(paymentId, data)
      setShareAck('saved')
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not download PDF'),
      })
    } finally {
      setBusyAction(null)
    }
  }

  if (view === 'dispute') {
    const psp =
      data.rows.find((r) => /psp/i.test(r.label))?.value ?? data.rows[0]?.value
    return (
      <SupportNewCaseScreen
        onBack={() => setView('receipt')}
        receiptId={data.id}
        defaultType="Dispute"
        defaultSubject={`Dispute on ${psp ?? data.headline}`}
        onCreated={(created) => {
          setCaseId(created.id)
          setOpenedCaseCode(created.code)
          setView('case')
        }}
      />
    )
  }

  if (view === 'case' && caseId) {
    return (
      <SupportCaseDetailScreen
        caseId={caseId}
        openedNotice={openedCaseCode}
        onDismissOpenedNotice={() => setOpenedCaseCode(null)}
        onBack={onBack}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <OperatorBackHeader title="Receipt" onBack={onBack} />

      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${
            ok ? 'bg-[var(--kura-green)]' : 'bg-[var(--kura-coral)]'
          }`}
        >
          {ok ? <Tick02Icon size={22} /> : <Cancel01Icon size={22} />}
        </span>
        <p className="text-[28px] font-bold tracking-tight text-[var(--kura-text)]">
          {data.amountLabel}
        </p>
        <p className="text-[12px] text-[var(--kura-muted)]">{data.headline}</p>
      </div>

      <div className="-mx-1 divide-y divide-[var(--kura-border-subtle)] border-y border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4 sm:mx-0 sm:rounded-2xl sm:border">
        {data.rows.map((row) => (
          <div
            key={row.label}
            className="flex items-start justify-between gap-3 py-3.5"
          >
            <span className="shrink-0 text-[12px] text-[var(--kura-muted)]">
              {row.label}
            </span>
            <span
              className={`min-w-0 flex-1 break-all text-right text-[12px] font-semibold leading-snug ${
                row.emphasize
                  ? ok
                    ? 'text-[var(--kura-green)]'
                    : 'text-[var(--kura-coral)]'
                  : 'text-[var(--kura-text)]'
              }`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-2.5">
        <button
          type="button"
          disabled={busyAction != null}
          onClick={() => {
            onDownload().catch(() => undefined)
          }}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-3 text-[14px] font-bold text-[var(--kura-text)] transition active:scale-[0.98] disabled:opacity-50"
        >
          <Download01Icon size={18} />
          {busyAction === 'download' ? 'Saving…' : 'Download PDF'}
        </button>
        <button
          type="button"
          disabled={busyAction != null}
          onClick={() => {
            onShare().catch(() => undefined)
          }}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--kura-teal)] px-3 text-[14px] font-bold text-white transition hover:bg-[#0b6a7a] active:scale-[0.98] disabled:opacity-50"
        >
          <Share01Icon size={18} />
          {busyAction === 'share' ? 'Sharing…' : 'Share'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="w-full py-1 text-center text-[13px] font-semibold text-[var(--kura-muted)] underline-offset-2 transition hover:text-[var(--kura-coral)] hover:underline"
      >
        Report a problem
      </button>

      <p className="text-center text-[11px] leading-relaxed text-[var(--kura-muted)]">
        {data.footer}
      </p>

      <ConfirmDialog
        opened={confirmOpen}
        title="Open a dispute?"
        description="Creates a support case tied to this payment. You can attach a bank alert or error photo next."
        confirmLabel="Continue"
        cancelLabel="Cancel"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          setView('dispute')
        }}
      />

      <ConfirmDialog
        opened={shareAck != null}
        title={
          shareAck === 'shared'
            ? 'Shared'
            : shareAck === 'saved'
              ? 'Downloaded'
              : 'Receipt copied'
        }
        description={
          shareAck === 'copied'
            ? 'Receipt summary is on your clipboard.'
            : shareAck === 'saved'
              ? 'PDF receipt saved to your device.'
              : undefined
        }
        confirmLabel="OK"
        cancelLabel=""
        onCancel={() => setShareAck(null)}
        onConfirm={() => setShareAck(null)}
      />
    </div>
  )
}
