import type { ReactNode } from 'react'
import { DetailPeekTrigger, TableStatusBadge } from '@shared/components'
import type { AgentRecord } from '@shared/mock/adminMockData'
import { formatNaira } from '@shared/utils/currency'
import {
  agentStatusLabel,
  agentStatusTone,
  healthSignalsFor,
  type AgentExtras,
} from './agentDetailHelpers'
import { AgentShiftPerformanceCard } from './components/AgentShiftPerformanceCard'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[13.5px] font-medium text-[var(--tx)]">{children}</dd>
    </div>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] sm:p-5">
      <h2 className="mb-3.5 text-[14px] font-bold text-[var(--tx)]">{title}</h2>
      {children}
    </section>
  )
}

/** Health signals first, then identity / hub / device — station staff CRM. */
export function AgentOverview({
  agent,
  extras,
  onHubPeek,
}: {
  agent: AgentRecord
  extras: AgentExtras
  onHubPeek?: () => void
}) {
  const signals = healthSignalsFor(agent, extras)
  const inactive = agent.status === 'INACTIVE'
  const hold = agent.status === 'MAINTENANCE'
  const pending = agent.inviteStatus === 'PENDING'

  return (
    <div className="flex flex-col gap-4">
      {inactive || hold || pending ? (
        <div
          className={`rounded-[12px] border px-3.5 py-3 ${
            inactive
              ? 'border-[var(--mu)]/30 bg-[var(--tn)] text-[var(--mu)]'
              : 'border-[#C47D0E]/30 bg-[var(--ta)] text-[#C47D0E]'
          }`}
        >
          <p className="text-[13.5px] font-bold">
            {inactive
              ? 'Inactive — hub login revoked'
              : hold
                ? 'Device hold — PIN or pad locked'
                : 'Invite pending — password not set'}
          </p>
          <p className="mt-1 text-[12.5px] opacity-90">
            {inactive
              ? 'Historical swaps and audit remain on Activity.'
              : hold
                ? 'Reset PIN from actions when ready.'
                : 'Resend invite so this agent can finish admin/hub setup.'}
          </p>
        </div>
      ) : null}

      <Card title="Health signals">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {signals.map((s) => (
            <div
              key={s.id}
              className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
                  {s.label}
                </p>
                <TableStatusBadge label={s.value} tone={s.tone} />
              </div>
              <p className="mt-2 text-[12.5px] text-[var(--mu)]">{s.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      <AgentShiftPerformanceCard agent={agent} extras={extras} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Identity">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Staff code">{extras.staffCode}</Field>
            <Field label="Status">
              <TableStatusBadge
                label={agentStatusLabel(agent.status)}
                tone={agentStatusTone(agent.status)}
              />
            </Field>
            <Field label="Phone">{agent.phone}</Field>
            <Field label="Email">{agent.email}</Field>
            <Field label="Hired">{agent.hiredDate}</Field>
            <Field label="Last seen">{agent.lastSeen}</Field>
          </dl>
        </Card>

        <Card title="Hub assignment">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Primary hub">
              {onHubPeek ? (
                <DetailPeekTrigger label={agent.hub} onClick={onHubPeek} />
              ) : (
                agent.hub
              )}
            </Field>
            <Field label="Relief hub">{agent.secondaryHub ?? '—'}</Field>
            <Field label="Role">Hub Agent</Field>
            <Field label="Access">Hub stations only</Field>
          </dl>
        </Card>
      </div>

      <Card title="Device & shift">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Device">{agent.deviceId}</Field>
          <Field label="Enrolment">
            {extras.deviceTrusted ? 'Trusted' : 'Needs re-enrol'}
          </Field>
          <Field label="Shift">{extras.shiftOpen ? 'Open' : 'Closed'}</Field>
          <Field label="Cash float">{formatNaira(extras.cashFloat)}</Field>
        </dl>
      </Card>
    </div>
  )
}
