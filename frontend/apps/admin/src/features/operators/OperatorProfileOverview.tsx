import { useState, type ReactNode } from 'react'
import dayjs from 'dayjs'
import { TableStatusBadge } from '@shared/components'
import {
  accountStatusLabel,
  accountStatusTone,
  kycStatusLabel,
  kycStatusTone,
  type OperatorRecord,
} from './types'
import {
  accountStandingTone,
  healthSignalsFor,
  operatorExtras,
  type OperatorExtras,
} from './operatorDetailHelpers'
import { OperatorKycDocsGallery } from './OperatorKycDocsGallery'
import type { KycPayload } from './utils/map-account'
import { useOperatorDetailStats } from './hooks/use-operators'
import { OperatorAnalyticsCockpit } from './components/OperatorAnalyticsCockpit'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--su)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[13px] font-medium text-[var(--tx)]">{children}</dd>
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

export function OperatorProfileOverview({
  operator,
  extras,
  kycVia: _kycVia,
  photosRequested,
  requestNote,
  kyc,
}: {
  operator: OperatorRecord
  extras?: OperatorExtras
  kycVia?: 'PSP' | 'PROVIDER' | 'MANUAL' | null
  photosRequested?: boolean
  requestNote?: string | null
  kyc?: KycPayload | null
}) {
  const [dateRange, setDateRange] = useState(() => {
    const end = dayjs().format('YYYY-MM-DD')
    const start = dayjs().subtract(13, 'day').format('YYYY-MM-DD')
    return { start_date: start, end_date: end }
  })

  const handleRangeChange = (start: string, end: string) => {
    setDateRange({ start_date: start, end_date: end })
  }

  const { data: stats, isPending: statsLoading } = useOperatorDetailStats(
    operator.id,
    dateRange,
  )

  const meta = extras ?? operatorExtras(operator)
  const signals = healthSignalsFor(operator, meta)
  const suspended = operator.status === 'SUSPENDED'
  const dereg = operator.status === 'DEREGISTERED'

  return (
    <div className="flex flex-col gap-4">
      {suspended || dereg ? (
        <div
          className={`rounded-[12px] border px-3.5 py-3 ${
            dereg
              ? 'border-[var(--mu)]/30 bg-[var(--tn)] text-[var(--mu)]'
              : 'border-[#C47D0E]/30 bg-[var(--ta)] text-[#C47D0E]'
          }`}
        >
          <p className="text-[13.5px] font-bold">
            {dereg
              ? 'Deregistered — no swap or payment access'
              : 'Suspended — swaps and payments blocked'}
          </p>
        </div>
      ) : null}

      {photosRequested ? (
        <div className="rounded-[12px] border border-[#C47D0E]/30 bg-[var(--ta)] px-3.5 py-3 text-[#C47D0E]">
          <p className="text-[13.5px] font-bold">Waiting on operator photo update</p>
          <p className="mt-1 text-[12.5px] text-[var(--tx)]">
            {requestNote || 'Operator was asked to reupload clearer ID photos.'}
          </p>
        </div>
      ) : null}

      {/* Flagship Analytics & Telemetry Cockpit */}
      <OperatorAnalyticsCockpit
        stats={stats}
        isLoading={statsLoading}
        startDate={dateRange.start_date}
        endDate={dateRange.end_date}
        onRangeChange={handleRangeChange}
      />

      {/* Health & Identity Operations Section */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Operational Health & Signals">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] text-[var(--mu)]">Standing</span>
            <TableStatusBadge
              label={meta.accountStanding}
              tone={accountStandingTone(meta.accountStanding)}
            />
            <span className="text-[12.5px] text-[var(--mu)]">
              {meta.canSwap ? '· Eligible to swap' : '· Swap may be blocked'}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {signals.map((s) => (
              <div
                key={s.id}
                className="rounded-[10px] border border-[var(--bd)] bg-[var(--in)] px-3 py-2.5"
              >
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
                  {s.label}
                </p>
                <div className="mt-1.5">
                  <TableStatusBadge label={s.value} tone={s.tone} />
                </div>
                {s.hint ? (
                  <p className="mt-1 text-[11px] text-[var(--mu)]">{s.hint}</p>
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Identity & KYC Credentials">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Full name">{operator.name}</Field>
            <Field label="KURA ID">{operator.kuraId}</Field>
            <Field label="Phone">{operator.phone}</Field>
            <Field label="Kind">{operator.kind}</Field>
            <Field label="Account status">
              <TableStatusBadge
                label={accountStatusLabel(operator.status)}
                tone={accountStatusTone(operator.status)}
              />
            </Field>
            <Field label="KYC status">
              <TableStatusBadge
                label={kycStatusLabel(operator.kycStatus)}
                tone={kycStatusTone(operator.kycStatus)}
              />
            </Field>
            <Field label="ID type">{operator.idType || kyc?.id_type || '—'}</Field>
            <Field label="ID last4">{operator.idLast4 || kyc?.id_last4 || '—'}</Field>
            <Field label="Doc status">
              {operator.kycDocumentStatus || kyc?.document_status || '—'}
            </Field>
            <Field label="Channel">{operator.registrationChannel}</Field>
          </dl>
          <div className="mt-4 border-t border-[var(--bd)]/60 pt-3">
            <OperatorKycDocsGallery kyc={kyc} />
          </div>
        </Card>
      </div>
    </div>
  )
}
