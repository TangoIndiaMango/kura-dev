import React, { useState } from 'react'
import { Copy01Icon, Tick01Icon } from 'hugeicons-react'
import { formatNaira } from '../../../shared/utils/currency'

interface HomeWalletStripProps {
  balanceNaira: number
  nuban: string | null
  /** Omitted while wallet top-ups are coming soon. */
  onFund?: () => void
}

/** Compact money surface on Home — balance, NUBAN copy (Fund when enabled). */
export const HomeWalletStrip: React.FC<HomeWalletStripProps> = ({
  balanceNaira,
  nuban,
  onFund,
}) => {
  const [copied, setCopied] = useState(false)

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

  return (
    <section className="flex items-center gap-3 rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--kura-muted)]">
          Wallet
        </p>
        <p className="text-[17px] font-extrabold tabular-nums text-[var(--kura-text)]">
          {formatNaira(balanceNaira)}
        </p>
        {nuban ? (
          <button
            type="button"
            onClick={handleCopy}
            className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-[var(--kura-muted)]"
          >
            {copied ? <Tick01Icon size={12} /> : <Copy01Icon size={12} />}
            {copied ? 'Copied' : nuban}
          </button>
        ) : null}
      </div>
      {onFund ? (
        <button
          type="button"
          onClick={onFund}
          className="shrink-0 rounded-lg bg-[var(--kura-amber)] px-3 py-2 text-xs font-extrabold text-[#1a1204]"
        >
          Fund
        </button>
      ) : null}
    </section>
  )
}
