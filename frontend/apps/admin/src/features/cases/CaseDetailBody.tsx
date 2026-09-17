import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Text } from '@mantine/core'
import type { SupportCaseDetailApi } from '@features/support'
import { formatCaseWhen } from './caseDetailHelpers'

function CaseFact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
        {label}
      </div>
      <div className="mt-0.5 text-[13.5px] font-medium text-[var(--tx)]">{value}</div>
    </div>
  )
}

export function CaseDetailBody({
  supportCase,
}: {
  supportCase: SupportCaseDetailApi
}) {
  return (
    <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
      <Text fw={700} size="sm" className="mb-3 text-[var(--tx)]">
        Case
      </Text>
      <div className="grid gap-4 sm:grid-cols-2">
        <CaseFact label="Subject" value={supportCase.subject} />
        <CaseFact label="Kind" value={supportCase.kind.replace(/_/g, ' ')} />
        <CaseFact
          label="Operator"
          value={
            <Link
              to={`/operators/${supportCase.account_id}`}
              className="font-semibold text-[var(--pr)] hover:underline"
            >
              {supportCase.account_kura_id} ·{' '}
              {supportCase.account_display_name}
            </Link>
          }
        />
        <CaseFact
          label="Assignee"
          value={supportCase.assigned_to_name ?? 'Unassigned'}
        />
        <CaseFact label="Priority" value={supportCase.priority} />
        <CaseFact
          label="Payment"
          value={
            supportCase.payment_id ? (
              <Link
                to={`/payments/${supportCase.payment_id}`}
                className="font-semibold text-[var(--pr)] hover:underline"
              >
                View payment
              </Link>
            ) : (
              '—'
            )
          }
        />
        <CaseFact
          label="SLA due"
          value={
            supportCase.sla_due_at
              ? formatCaseWhen(supportCase.sla_due_at)
              : '—'
          }
        />
        <CaseFact
          label="Opened"
          value={formatCaseWhen(supportCase.created_at)}
        />
      </div>
    </section>
  )
}
