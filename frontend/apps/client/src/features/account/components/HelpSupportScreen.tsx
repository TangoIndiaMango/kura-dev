import React from 'react'
import {
  CallIcon,
  Message01Icon,
  Location01Icon,
  File01Icon,
  Add01Icon,
} from 'hugeicons-react'
import { useAuth } from '../../auth/AuthProvider'
import { OperatorBackHeader } from '../../../shared/components/operator/OperatorBackHeader'
import { useOperatorCases } from '../hooks/use-operator-support'

const OPS_PHONE = '+234 700 000 5872'
const OPS_HOURS = 'Cases: in-app · phone Mon–Sat 8:00–20:00 WAT'

interface HelpSupportScreenProps {
  onBack: () => void
  onOpenCases: () => void
  onNewCase: () => void
}

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({
  onBack,
  onOpenCases,
  onNewCase,
}) => {
  const { isAuthenticated } = useAuth()
  const live = useOperatorCases({ enabled: isAuthenticated })
  const openCount = live.cases.filter(
    (c) => c.status !== 'CLOSED' && c.status !== 'RESOLVED',
  ).length

  return (
    <div className="flex flex-col gap-4">
      <OperatorBackHeader title="Help & support" onBack={onBack} />

      <button
        type="button"
        onClick={onOpenCases}
        className="flex items-center gap-3 rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4 py-4 text-left"
      >
        <span className="rounded-lg bg-[var(--kura-teal)]/15 p-2.5 text-[var(--kura-teal-bright)]">
          <File01Icon size={18} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[14px] font-bold text-[var(--kura-text)]">
            My cases
          </span>
          <span className="text-[12px] text-[var(--kura-muted)]">
            {isAuthenticated && live.isLoading
              ? 'Loading your cases…'
              : openCount > 0
                ? `${openCount} open · view status & evidence`
                : 'Track disputes and support tickets'}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={onNewCase}
        className="flex items-center gap-3 rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4 py-4 text-left"
      >
        <span className="rounded-lg bg-[var(--kura-teal)]/15 p-2.5 text-[var(--kura-teal-bright)]">
          <Add01Icon size={18} />
        </span>
        <span className="flex flex-col">
          <span className="text-[14px] font-bold text-[var(--kura-text)]">
            Open a case
          </span>
          <span className="text-[12px] text-[var(--kura-muted)]">
            Billing, swap issues, or technical problems
          </span>
        </span>
      </button>

      <a
        href={`tel:${OPS_PHONE.replace(/\s/g, '')}`}
        className="flex items-center gap-3 rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4 py-4"
      >
        <span className="rounded-lg bg-[var(--kura-teal)]/15 p-2.5 text-[var(--kura-teal-bright)]">
          <CallIcon size={18} />
        </span>
        <span className="flex flex-col">
          <span className="text-[14px] font-bold text-[var(--kura-text)]">
            Call support
          </span>
          <span className="text-[12px] text-[var(--kura-muted)]">{OPS_PHONE}</span>
        </span>
      </a>

      <button
        type="button"
        onClick={onOpenCases}
        className="flex items-center gap-3 rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4 py-4 text-left"
      >
        <span className="rounded-lg bg-[var(--kura-teal)]/15 p-2.5 text-[var(--kura-teal-bright)]">
          <Message01Icon size={18} />
        </span>
        <span className="flex flex-col">
          <span className="text-[14px] font-bold text-[var(--kura-text)]">
            Case messages
          </span>
          <span className="text-[12px] text-[var(--kura-muted)]">{OPS_HOURS}</span>
        </span>
      </button>

      <div className="flex items-start gap-3 rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4 py-4">
        <span className="rounded-lg bg-[var(--kura-teal)]/15 p-2.5 text-[var(--kura-teal-bright)]">
          <Location01Icon size={18} />
        </span>
        <p className="text-[12px] leading-relaxed text-[var(--kura-muted)]">
          For hub visits, open the Swap tab, live hubs nearby. In-app cases are
          the fastest path for billing and swap disputes.
        </p>
      </div>
    </div>
  )
}
