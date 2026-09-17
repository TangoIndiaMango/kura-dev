import React, { useState } from 'react'
import { ArrowLeft01Icon, Copy01Icon, Tick01Icon, Share01Icon } from 'hugeicons-react'
import { OperatorPrimaryButton } from '../../../shared/components/operator/OperatorPrimaryButton'
import { OperatorSubtleButton } from '../../../shared/components/operator/OperatorSubtleButton'
import { notify } from '../../../shared/utils/notify'

const DEMO_AMOUNTS_NAIRA = [500, 1000, 2000, 5000] as const

interface FundWalletPanelProps {
  bank: string
  nuban: string | null
  accountName: string
  onBack: () => void
  /** DEBUG/dev-VA only — sandbox credit via integrations mock. */
  demoFundEnabled?: boolean
  onDemoFund?: (amountNaira: number) => void | Promise<void>
  demoFunding?: boolean
}

export const FundWalletPanel: React.FC<FundWalletPanelProps> = ({
  bank,
  nuban,
  accountName,
  onBack,
  demoFundEnabled = false,
  onDemoFund,
  demoFunding = false,
}) => {
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)
  const [amountNaira, setAmountNaira] = useState<(typeof DEMO_AMOUNTS_NAIRA)[number]>(1000)

  const shareText = `${bank}\n${(nuban ?? '').replace(/\s/g, '')}\n${accountName}`
  const transferHint = nuban
    ? 'Transfer to your dedicated virtual account. Balance updates within seconds.'
    : 'Your transfer account is still being created.'

  const copy = async () => {
    if (!nuban) return
    try {
      await navigator.clipboard.writeText(nuban.replace(/\s/g, ''))
      setCopied(true)
      notify({ title: 'Account number copied', tone: 'success' })
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'KURA wallet account', text: shareText })
        setShared(true)
      } else {
        await navigator.clipboard.writeText(shareText)
        setShared(true)
      }
      window.setTimeout(() => setShared(false), 2000)
    } catch {
      try {
        await navigator.clipboard.writeText(shareText)
        setShared(true)
        window.setTimeout(() => setShared(false), 2000)
      } catch {
        setShared(false)
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 self-start text-sm text-[var(--kura-muted)]"
      >
        <ArrowLeft01Icon size={16} />
        Back
      </button>

      <div>
        <h2 className="text-lg font-bold text-[var(--kura-text)]">Fund wallet</h2>
        <p className="mt-1 text-xs text-[var(--kura-muted)]">{transferHint}</p>
      </div>

      {nuban ? (
        <div className="rounded-2xl bg-gradient-to-br from-[#003153] to-[#0D7C8F] p-5 text-[var(--kura-text)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-200/80">
            {bank}
          </p>
          <p className="mt-2 font-mono text-2xl font-bold tracking-wider">{nuban}</p>
          <p className="mt-1 text-[12px] text-sky-100/90">{accountName}</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={copy}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white/20 py-2.5 text-xs font-bold"
            >
              {copied ? <Tick01Icon size={14} /> : <Copy01Icon size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={share}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white/20 py-2.5 text-xs font-bold"
            >
              {shared ? <Tick01Icon size={14} /> : <Share01Icon size={14} />}
              {shared ? 'Shared' : 'Share'}
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4 py-6 text-center text-[13px] leading-relaxed text-[var(--kura-muted)]">
          Your bank details appear here as soon as the account is issued. You can
          still pay cash at any hub.
        </p>
      )}

      {demoFundEnabled && onDemoFund ? (
        !demoOpen ? (
          <OperatorSubtleButton onClick={() => setDemoOpen(true)}>
          Add demo credit
        </OperatorSubtleButton>
        ) : (
          <div className="rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--kura-muted)]">
              Demo credit
            </p>
            <p className="mt-1 text-[12px] text-[var(--kura-muted)]">
              Credits your wallet for testing — available in this environment only.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEMO_AMOUNTS_NAIRA.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmountNaira(amt)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-[13px] font-semibold ${
                    amountNaira === amt
                      ? 'border-[var(--kura-teal)] bg-[var(--kura-teal)]/10 text-[var(--kura-text)]'
                      : 'border-[var(--kura-border)] text-[var(--kura-text)]'
                  }`}
                >
                  ₦{amt.toLocaleString()}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <OperatorPrimaryButton
                tone="teal"
                disabled={demoFunding}
                onClick={() => {
                  void onDemoFund(amountNaira)
                }}
              >
                {demoFunding ? 'Crediting…' : `Credit ₦${amountNaira.toLocaleString()}`}
              </OperatorPrimaryButton>
            </div>
            <OperatorSubtleButton
              color="gray"
              className="mt-3"
              onClick={() => setDemoOpen(false)}
            >
              Cancel
            </OperatorSubtleButton>
          </div>
        )
      ) : null}
    </div>
  )
}
