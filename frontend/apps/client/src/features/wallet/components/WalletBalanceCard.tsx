import React, { useState } from 'react'
import { Copy01Icon, Tick01Icon } from 'hugeicons-react'
import { formatNaira } from '../../../shared/utils/currency'
import { OperatorPrimaryButton } from '../../../shared/components/operator/OperatorPrimaryButton'
import { KuraIllustrationModal } from '../../../shared/components'

interface WalletBalanceCardProps {
  balanceNaira: number
  syncedAt: string
  bankLabel: string
  nuban: string | null
  accountName: string
  /** Omitted while wallet top-ups are coming soon. */
  onFund?: () => void
  onCredit?: () => void
  /** Default “Apply for credit” */
  creditLabel?: string
  creditDisabled?: boolean
  onSync?: () => void
}

/** Full wallet hero — NUBAN + fund. Lives on Wallet tab only. */
export const WalletBalanceCard: React.FC<WalletBalanceCardProps> = ({
  balanceNaira,
  syncedAt,
  bankLabel,
  nuban,
  accountName,
  onFund,
  onCredit,
  creditLabel = 'Apply for credit',
  creditDisabled = false,
  onSync,
}) => {
  const [copied, setCopied] = useState(false)
  const [syncingOpen, setSyncingOpen] = useState(false)
  const [syncLabel, setSyncLabel] = useState(syncedAt)

  const handleCopy = async () => {
    if (!nuban) return
    try {
      await navigator.clipboard.writeText(nuban.replace(/\s/g, ''))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const runSync = () => {
    setSyncingOpen(true)
    onSync?.()
    window.setTimeout(() => {
      setSyncLabel(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      )
      setSyncingOpen(false)
    }, onSync ? 800 : 1800)
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#003153] to-[#0D7C8F] p-5 text-white shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-sky-200/80">
              Kura balance
            </span>
            <div className="text-3xl font-extrabold tracking-tight">
              {formatNaira(balanceNaira)}
            </div>
            <span className="text-[11px] text-sky-100/80">Used first for your next swap or plan.</span>
          </div>
          <button
            type="button"
            onClick={runSync}
            className="shrink-0 whitespace-nowrap rounded-md bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-100 transition active:scale-95"
          >
            Updated {syncLabel}
          </button>
        </div>

        {nuban ? (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-white/15 bg-black/20 p-3 backdrop-blur-sm">
            <div className="flex min-w-0 flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-200/70">
                {bankLabel}
              </span>
              <span className="font-mono text-base font-bold tracking-wider">
                {nuban}
              </span>
              <span className="truncate text-[11px] font-medium text-sky-100/90">
                {accountName}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/30"
            >
              {copied ? <Tick01Icon size={14} /> : <Copy01Icon size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        ) : null}

        <div
          className={`mt-4 grid gap-2.5 ${onCredit && onFund ? 'grid-cols-2' : 'grid-cols-1'}`}
        >
          {onFund ? (
            <OperatorPrimaryButton tone="amber" onClick={onFund}>
              Fund wallet
            </OperatorPrimaryButton>
          ) : null}
          {onCredit ? (
            <button
              type="button"
              disabled={creditDisabled}
              onClick={() => {
                if (creditDisabled) return
                onCredit()
              }}
              className={`rounded-xl border px-4 py-3.5 text-[15px] font-bold transition ${
                creditDisabled
                  ? 'cursor-not-allowed border-white/15 bg-white/5 text-white/45'
                  : 'border-white/25 bg-white/10 text-white hover:bg-white/15'
              }`}
            >
              {creditLabel}
            </button>
          ) : null}
        </div>
      </section>

      <KuraIllustrationModal
        opened={syncingOpen}
        onClose={() => setSyncingOpen(false)}
        illustrationId="syncing"
        closeOnClickOutside={false}
        primaryAction={{
          label: 'Hide',
          onClick: () => setSyncingOpen(false),
        }}
      />
    </>
  )
}
