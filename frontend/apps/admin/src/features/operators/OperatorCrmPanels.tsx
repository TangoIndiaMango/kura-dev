import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mantine/core'
import {
  DynamicTableSection,
  LoadingState,
  TableStatusBadge,
  type TableHeader,
} from '@shared/components'
import { formatNaira } from '@shared/utils/currency'
import { useAccountPayments, type PaymentApi } from '@features/finance'
import { useOperatorDetailStats } from './hooks/use-operators'
import { OperatorSpendBreakdown } from './OperatorSpendBreakdown'
import { useAccountCases, type SupportCaseListApi } from '@features/support'
import {
  FlagRiskModal,
  useAccountRiskEvents,
  type RiskEventListApi,
} from '@features/risk'
import { CreateCaseModal } from '@features/cases'
import { useCapabilities } from '../auth/useCapabilities'
import type { OperatorRecord } from './types'

const LEDGER_HEADERS: TableHeader[] = [
  { key: 'date', label: 'DATE' },
  { key: 'type', label: 'TYPE' },
  { key: 'channel', label: 'CHANNEL' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'status', label: 'STATUS' },
]

const CASE_HEADERS: TableHeader[] = [
  { key: 'code', label: 'CASE' },
  { key: 'subject', label: 'SUBJECT' },
  { key: 'type', label: 'TYPE' },
  { key: 'priority', label: 'PRIORITY' },
  { key: 'status', label: 'STATUS' },
]

const RISK_HEADERS: TableHeader[] = [
  { key: 'when', label: 'WHEN' },
  { key: 'rule', label: 'RULE' },
  { key: 'severity', label: 'SEVERITY' },
  { key: 'status', label: 'STATUS' },
]

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function severityTone(s: string) {
  if (s === 'CRITICAL' || s === 'HIGH') return 'danger' as const
  if (s === 'MEDIUM') return 'warning' as const
  return 'neutral' as const
}

/** Operator money history = finance payments (?account=), not GL COA ledger. */
export function OperatorLedgerTab({ operator }: { operator: OperatorRecord }) {
  const { payments, isPending, isError } = useAccountPayments(operator.id)
  const { data: detailStats } = useOperatorDetailStats(operator.id)

  if (isPending) return <LoadingState variant="inline" cols={5} rows={5} />
  if (isError) {
    return (
      <p className="text-[13px] text-[var(--mu)]">
        Could not load payments for this account.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <OperatorSpendBreakdown
        amountKobo={detailStats?.spend_amount_kobo}
        byVehicle={detailStats?.spend_by_vehicle}
        byDriver={detailStats?.spend_by_driver}
        money={detailStats?.money}
      />
      <DynamicTableSection<PaymentApi>
        variant="embedded"
        headers={LEDGER_HEADERS}
        data={payments}
        getRowKey={(row) => row.id}
        toolbar={{ title: 'Payments', showFilter: false }}
        emptyTitle="No payments"
        emptyMessage="Wallet funding and swap captures from GET /finance/payments/?account=."
        renderItems={(row) => [
          <span key="d" className="text-xs text-[var(--mu)]">
            {formatWhen(row.created_at)}
          </span>,
          <span key="t" className="text-xs font-semibold text-[var(--tx)]">
            {row.purpose}
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
        ]}
      />
    </div>
  )
}

export { OperatorWalletTab } from './OperatorWalletTab'
export {
  OperatorVehiclesTab,
  OperatorPlansTab,
  OperatorSwapsTab,
} from './OperatorAssetTabs'

/** Support tickets / disputes — separate from risk. */
export function OperatorCasesTab({ operator }: { operator: OperatorRecord }) {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const [createOpen, setCreateOpen] = useState(false)
  const { cases, isPending, isError, refetch } = useAccountCases(operator.id)

  if (isPending) return <LoadingState variant="inline" cols={5} rows={5} />
  if (isError) {
    return (
      <p className="text-[13px] text-[var(--mu)]">
        Could not load support cases (need cases:read).
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12.5px] leading-relaxed text-[var(--mu)]">
        Support cases are help-desk tickets (disputes, KYC help, engine release).
        Fraud signals live under Risk.
      </p>
      <DynamicTableSection<SupportCaseListApi>
        variant="embedded"
        headers={CASE_HEADERS}
        data={cases}
        getRowKey={(row) => row.id}
        toolbar={{
          title: 'Support cases',
          showFilter: false,
          actions: can('cases:manage') ? (
            <Button
              size="xs"
              className="bg-[var(--pr)] hover:opacity-90"
              onClick={() => setCreateOpen(true)}
            >
              Open case
            </Button>
          ) : null,
        }}
        emptyTitle="No support cases"
        emptyMessage={`No tickets for ${operator.kuraId}.`}
        onRowClick={(row) => navigate(`/cases/${row.id}`)}
        renderItems={(row) => [
          <span key="c" className="font-mono text-xs font-semibold text-[var(--tx)]">
            {row.code}
          </span>,
          <span key="s" className="text-xs text-[var(--tx)]">
            {row.subject}
          </span>,
          <span key="k" className="text-xs text-[var(--mu)]">
            {row.kind}
          </span>,
          <TableStatusBadge key="p" label={row.priority} tone="neutral" />,
          <TableStatusBadge
            key="st"
            label={row.status}
            tone={row.status === 'OPEN' ? 'warning' : 'neutral'}
          />,
        ]}
      />
      <CreateCaseModal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        presetAccountId={operator.id}
        lockAccount
        onCreated={(id) => {
          refetch()
          navigate(`/cases/${id}`)
        }}
      />
    </div>
  )
}

/** Fraud / compliance events — not account standing. */
export function OperatorRiskTab({ operator }: { operator: OperatorRecord }) {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const [flagOpen, setFlagOpen] = useState(false)
  const { events, isPending, isError, refetch } = useAccountRiskEvents(operator.id)

  if (isPending) return <LoadingState variant="inline" cols={4} rows={5} />
  if (isError) {
    return (
      <p className="text-[13px] text-[var(--mu)]">
        Could not load risk events (need risk:read).
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12.5px] leading-relaxed text-[var(--mu)]">
        Risk events are fraud/compliance signals. Flag manually when ops spot
        something the rules have not caught yet.
      </p>
      <DynamicTableSection<RiskEventListApi>
        variant="embedded"
        headers={RISK_HEADERS}
        data={events}
        getRowKey={(row) => row.id}
        toolbar={{
          title: 'Risk events',
          showFilter: false,
          actions: can('risk:review') ? (
            <Button
              size="xs"
              className="bg-[var(--pr)] hover:opacity-90"
              onClick={() => setFlagOpen(true)}
            >
              Flag account
            </Button>
          ) : null,
        }}
        emptyTitle="No risk events"
        emptyMessage={`No RiskEvent rows for ${operator.kuraId}.`}
        onRowClick={(row) => navigate(`/risk/${row.id}`)}
        renderItems={(row) => [
          <span key="w" className="text-xs text-[var(--mu)]">
            {formatWhen(row.created_at)}
          </span>,
          <span key="r" className="text-xs font-semibold text-[var(--tx)]">
            {row.rule_code}
          </span>,
          <TableStatusBadge
            key="sev"
            label={row.severity}
            tone={severityTone(row.severity)}
          />,
          <TableStatusBadge
            key="st"
            label={row.status}
            tone={row.status === 'OPEN' ? 'warning' : 'neutral'}
          />,
        ]}
      />
      <FlagRiskModal
        opened={flagOpen}
        onClose={() => setFlagOpen(false)}
        presetAccountId={operator.id}
        lockAccount
        onFlagged={() => {
          refetch()
        }}
      />
    </div>
  )
}
