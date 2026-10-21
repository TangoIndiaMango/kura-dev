import {
  DynamicTableSection,
  LoadingState,
  TableStatusBadge,
  type TableHeader,
} from '@shared/components'
import { formatNaira } from '@shared/utils/currency'
import {
  useAccountPayments,
  useWallet,
  useWalletByAccount,
  walletStandingFromDetail,
  walletStandingLabel,
  walletStandingTone,
  type PaymentApi,
} from '@features/finance'
import type { OperatorRecord } from './types'

const WALLET_HEADERS: TableHeader[] = [
  { key: 'id', label: 'REF' },
  { key: 'channel', label: 'CHANNEL' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'status', label: 'STATUS' },
  { key: 'date', label: 'WHEN' },
]

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function OperatorWalletTab({ operator }: { operator: OperatorRecord }) {
  const byAccount = useWalletByAccount(operator.id, {
    enabled: !operator.walletId,
  })
  const walletId = operator.walletId || byAccount.walletId
  const { wallet, isPending, isError } = useWallet(walletId, {
    enabled: Boolean(walletId),
  })
  const { payments, isPending: paymentsPending } = useAccountPayments(operator.id, {
    enabled: Boolean(operator.id),
  })

  if (isPending || (!operator.walletId && byAccount.isPending)) {
    return <LoadingState variant="inline" cols={4} rows={6} />
  }

  if (isError || !wallet) {
    return (
      <p className="text-[13px] text-[var(--mu)]">
        No wallet for {operator.kuraId} yet. It is created when the operator
        completes profile (PSP / NUBAN provisioning).
      </p>
    )
  }

  const standing = walletStandingFromDetail(wallet)
  const va = wallet.virtual_account

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--su)]">
            Available
          </p>
          <p className="mt-1 text-[18px] font-bold tabular-nums text-[var(--tx)]">
            {formatNaira(wallet.available_kobo, { fromKobo: true, showDecimals: true })}
          </p>
        </div>
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--su)]">
            Balance
          </p>
          <p className="mt-1 text-[18px] font-bold tabular-nums text-[var(--tx)]">
            {formatNaira(wallet.balance_kobo, { fromKobo: true, showDecimals: true })}
          </p>
        </div>
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--su)]">
            Standing
          </p>
          <div className="mt-2">
            <TableStatusBadge
              label={walletStandingLabel(standing)}
              tone={walletStandingTone(standing)}
            />
          </div>
        </div>
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--su)]">
            NUBAN
          </p>
          {va?.nuban ? (
            <>
              <p className="mt-1 font-mono text-[15px] font-bold text-[var(--tx)]">
                {va.nuban}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--mu)]">
                {va.bank_name}
                {va.account_name ? ` · ${va.account_name}` : ''}
              </p>
            </>
          ) : (
            <p className="mt-1 text-[13px] text-[var(--mu)]">Pending PSP assign</p>
          )}
        </div>
      </div>

      <DynamicTableSection<PaymentApi>
        variant="embedded"
        headers={WALLET_HEADERS}
        data={payments}
        getRowKey={(row) => row.id}
        toolbar={{ title: 'Wallet movements', showFilter: false }}
        emptyTitle={paymentsPending ? 'Loading…' : 'No wallet movements'}
        emptyMessage="Funding and charges appear after NUBAN transfers or swaps."
        renderItems={(row) => [
          <span key="r" className="font-mono text-xs text-[var(--tx)]">
            {row.receipt_code}
          </span>,
          <span key="c" className="text-xs text-[var(--mu)]">
            {row.channel}
          </span>,
          <span key="a" className="text-xs font-semibold tabular-nums text-[var(--tx)]">
            {formatNaira(row.amount_kobo, { fromKobo: true, showDecimals: true })}
          </span>,
          <TableStatusBadge
            key="s"
            label={row.status}
            tone={row.status === 'SUCCESS' ? 'success' : 'neutral'}
          />,
          <span key="d" className="text-xs text-[var(--mu)]">
            {formatWhen(row.created_at)}
          </span>,
        ]}
      />
    </div>
  )
}
