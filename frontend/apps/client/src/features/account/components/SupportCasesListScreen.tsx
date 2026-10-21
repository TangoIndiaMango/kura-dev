import { caseStatusLabel } from './caseStatusLabel'
import React from 'react'
import { ArrowRight01Icon } from 'hugeicons-react'
import { useAuth } from '../../auth/AuthProvider'
import { OperatorBackHeader } from '../../../shared/components/operator/OperatorBackHeader'
import { OperatorPrimaryButton } from '../../../shared/components/operator/OperatorPrimaryButton'
import {
  formatCaseWhen,
  kindLabel,
  useOperatorCases,
} from '../hooks/use-operator-support'

interface SupportCasesListScreenProps {
  onBack: () => void
  onOpenCase: (id: string) => void
  onNewCase: () => void
}

function tone(status: string) {
  if (status === 'CLOSED' || status === 'RESOLVED') {
    return 'text-[var(--kura-green)]'
  }
  if (status === 'PENDING' || status === 'IN_PROGRESS') {
    return 'text-[var(--kura-amber,#C47D0E)]'
  }
  return 'text-[var(--kura-coral)]'
}

export const SupportCasesListScreen: React.FC<SupportCasesListScreenProps> = ({
  onBack,
  onOpenCase,
  onNewCase,
}) => {
  const { isAuthenticated } = useAuth()
  const live = useOperatorCases({ enabled: isAuthenticated })
  const rows = live.cases.map((c) => ({
    id: c.id,
    code: c.code,
    subject: c.subject,
    status: c.status,
    type: kindLabel(c.kind),
    openedAt: formatCaseWhen(c.created_at),
  }))
  const loading = isAuthenticated && live.isLoading

  return (
    <div className="flex flex-col gap-4">
      <OperatorBackHeader title="My cases" onBack={onBack} />

      <OperatorPrimaryButton onClick={onNewCase}>New case</OperatorPrimaryButton>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[76px] animate-pulse rounded-2xl bg-[var(--kura-border)]/40"
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-[var(--kura-muted)]">
          No support cases yet. Open one if a payment, swap, or hub visit went
          wrong.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onOpenCase(c.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4 py-3.5 text-left"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[14px] font-bold text-[var(--kura-text)]">
                    {c.subject}
                  </span>
                  <span className="text-[11px] text-[var(--kura-muted)]">
                    {c.code} · {c.type} · {c.openedAt}
                  </span>
                  <span className={`text-[11px] font-bold ${tone(c.status)}`}>
                    {caseStatusLabel(c.status)}
                  </span>
                </span>
                <ArrowRight01Icon
                  size={16}
                  className="shrink-0 text-[var(--kura-muted)]"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
