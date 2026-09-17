import { Button, Select } from '@mantine/core'
import { formatNaira } from '@shared/utils/currency'
import { DiscountCodeField } from '@features/discounts/DiscountCodeField'
import type { DiscountRedeemOk } from '@features/discounts/discountRedeem'
import { settleModeLabel, type BaySettleMode, type SettlePlan } from './hubSwapSettle'

type Props = {
  plan: SettlePlan
  listDueNaira: number
  mode: BaySettleMode
  onModeChange: (mode: BaySettleMode) => void
  topUpRef: string | null
  onCollectTopUp: () => void
  cashReceiptRef: string | null
  onCollectCash: () => void
  discount: DiscountRedeemOk | null
  onDiscountChange: (next: DiscountRedeemOk | null) => void
  discountContext: {
    vehicleCount: number
    grantedDiscountId?: string | null
  }
  onUseCashInstead?: () => void
}

export function HubSwapSettleSection({
  plan,
  listDueNaira,
  mode,
  onModeChange,
  topUpRef,
  onCollectTopUp,
  cashReceiptRef,
  onCollectCash,
  discount,
  onDiscountChange,
  discountContext,
  onUseCashInstead,
}: Props) {
  const due = mode === 'PLAN' ? 0 : plan.dueNaira
  const modeData = plan.allowed.map((m) => ({
    value: m,
    label: settleModeLabel(m),
  }))

  const walletShort = mode === 'WALLET' && plan.shortfallNaira > 0 && !topUpRef
  const cashReady = mode === 'CASH_AT_HUB' && Boolean(cashReceiptRef)
  const topUpNeeded = mode === 'WALLET' && plan.shortfallNaira > 0 && !topUpRef
  const showDiscount = mode !== 'PLAN'

  const settleHint =
    mode === 'PLAN'
      ? 'Covered by plan allowance. No bay collection — discount codes do not apply.'
      : 'List tariff is locked. Agent cannot invent a fee. A discount only applies after the rider’s code is entered and confirmed.'

  return (
    <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
      <h3 className="text-[14px] font-bold text-[var(--tx)]">Confirm payment</h3>
      <p className="mt-1 text-[12.5px] text-[var(--mu)]">{settleHint}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-[10px] border border-[var(--bd)] bg-[var(--in)] px-3 py-2.5">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
            {discount && showDiscount ? 'Due after code' : 'Swap due'}
          </p>
          <p className="mt-0.5 text-[18px] font-bold tabular-nums text-[var(--tx)]">
            {mode === 'PLAN' ? '₦0' : formatNaira(due)}
          </p>
          {discount && showDiscount ? (
            <p className="mt-0.5 text-[11px] text-[var(--mu)]">
              List {formatNaira(listDueNaira)}
            </p>
          ) : null}
        </div>
        <div className="rounded-[10px] border border-[var(--bd)] bg-[var(--in)] px-3 py-2.5">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
            Wallet
          </p>
          <p className="mt-0.5 text-[18px] font-bold tabular-nums text-[var(--tx)]">
            {formatNaira(plan.walletBalance)}
          </p>
        </div>
        <div className="rounded-[10px] border border-[var(--bd)] bg-[var(--in)] px-3 py-2.5 sm:col-span-1 col-span-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
            Shortfall
          </p>
          <p className="mt-0.5 text-[18px] font-bold tabular-nums text-[var(--tx)]">
            {plan.shortfallNaira > 0 && mode !== 'PLAN'
              ? formatNaira(plan.shortfallNaira)
              : '-'}
          </p>
        </div>
      </div>

      {showDiscount ? (
        <DiscountCodeField
          listNaira={listDueNaira}
          context={{
            channel: 'Hub',
            period: 'swap',
            vehicleCount: discountContext.vehicleCount,
            grantedDiscountId: discountContext.grantedDiscountId,
          }}
          applied={discount}
          onApplied={onDiscountChange}
        />
      ) : null}

      <Select
        mt="md"
        label="Payment method"
        data={modeData}
        value={mode}
        onChange={(v) => v && onModeChange(v as BaySettleMode)}
        allowDeselect={false}
      />

      <p className="mt-2 text-[12.5px] font-medium text-[var(--tx)]">{plan.label}</p>

      {mode === 'CASH_AT_HUB' ? (
        <div className="mt-3 rounded-[10px] border border-[var(--bd)] bg-[var(--in)] px-3 py-3">
          {cashReady ? (
            <>
              <p className="text-[13px] font-bold text-[var(--tx)]">Cash ready</p>
              <p className="mt-1 text-[12px] text-[var(--mu)]">
                {formatNaira(due)}
                {discount ? ` · ${discount.code}` : ''} will post on Complete.
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-[12.5px] text-[var(--mu)]">
                Collect exactly {formatNaira(due)} from the rider, then mark ready.
              </p>
              <Button mt="sm" color="brand" fullWidth onClick={onCollectCash}>
                Mark {formatNaira(due)} cash collected
              </Button>
            </>
          )}
        </div>
      ) : null}

      {mode === 'WALLET' && topUpNeeded ? (
        <div className="mt-3 rounded-[10px] border border-[#C47D0E]/35 bg-[var(--ta)] px-3 py-3">
          <p className="text-[13px] font-bold text-[var(--tx)]">Wallet short</p>
          <p className="mt-1 text-[12.5px] text-[var(--mu)]">
            Top up {formatNaira(plan.shortfallNaira)}, then debit wallet.
          </p>
          <Button mt="sm" color="brand" variant="light" fullWidth onClick={onCollectTopUp}>
            Cash top-up {formatNaira(plan.shortfallNaira)}
          </Button>
          <Button
            mt="xs"
            variant="subtle"
            fullWidth
            onClick={() => onModeChange('CASH_AT_HUB')}
          >
            Or pay full due in cash
          </Button>
        </div>
      ) : null}

      {mode === 'WALLET' && topUpRef ? (
        <p className="mt-3 rounded-[10px] border border-[var(--bd)] bg-[var(--in)] px-3 py-2 text-[12.5px] text-[var(--mu)]">
          Top-up noted. Wallet ready for debit.
        </p>
      ) : null}

      {mode === 'WALLET' && plan.riderPinRequired && !walletShort && !topUpNeeded ? (
        <div className="mt-3 rounded-[10px] border border-[var(--bd)] bg-[var(--in)] px-3 py-3">
          <p className="text-[13px] font-bold text-[var(--tx)]">Rider PIN required</p>
          <p className="mt-1 text-[12.5px] text-[var(--mu)]">
            On Complete, the rider enters their app PIN (not the agent PIN).
          </p>
          {onUseCashInstead ? (
            <Button mt="sm" variant="subtle" fullWidth onClick={onUseCashInstead}>
              Collect cash instead
            </Button>
          ) : null}
        </div>
      ) : null}

      {mode === 'WALLET' && !plan.riderPinRequired && !walletShort && !topUpNeeded ? (
        <p className="mt-3 text-[12.5px] text-[var(--mu)]">
          Hold already captured at booking. Confirm to finish.
        </p>
      ) : null}

      {mode === 'CREDIT' ? (
        <p className="mt-3 text-[12.5px] text-[var(--mu)]">
          Draws {formatNaira(due)} from swap credit on complete.
        </p>
      ) : null}

      {mode === 'PLAN' ? (
        <p className="mt-3 text-[12.5px] text-[var(--mu)]">
          Covered by active plan. No bay collection and no discount code.
        </p>
      ) : null}
    </section>
  )
}

export function settleCompleteBlocked(
  mode: BaySettleMode,
  plan: SettlePlan,
  cashReceiptRef: string | null,
  topUpRef: string | null,
): string | null {
  if (mode === 'CASH_AT_HUB' && !cashReceiptRef) {
    return `Mark cash collected for ${formatNaira(plan.dueNaira)} first.`
  }
  if (mode === 'WALLET' && plan.shortfallNaira > 0 && !topUpRef) {
    return 'Wallet short. Top up or switch to cash.'
  }
  return null
}
