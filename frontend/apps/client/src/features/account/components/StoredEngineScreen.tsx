import React, { useState } from 'react'
import { OperatorBackHeader } from '../../../shared/components/operator/OperatorBackHeader'
import { OperatorPrimaryButton } from '../../../shared/components/operator/OperatorPrimaryButton'
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog'
import { KuraIllustrationModal } from '../../../shared/components'
import { apiErrorMessage } from '../../../lib/api/auth'
import { useAuth } from '../../auth/AuthProvider'
import {
  useMyEngine,
  useMyEngines,
  useRequestEngineRelease,
} from '../hooks/use-account-engines'
import {
  engineStatusLabel,
  engineTitle,
  firstMediaUrl,
  formatStoredSince,
  releaseCaseCode,
  type EngineListApi,
} from '../enginesTypes'

interface StoredEngineScreenProps {
  onBack: () => void
  embedded?: boolean
  active?: boolean
}

function statusTone(status: string): string {
  if (status === 'STORED') return 'bg-[var(--kura-green)]/15 text-[var(--kura-green)]'
  if (status === 'RELEASE_REQUESTED')
    return 'bg-[var(--kura-amber)]/15 text-[var(--kura-amber)]'
  if (status === 'RELEASED') return 'bg-[var(--kura-muted)]/20 text-[var(--kura-muted)]'
  return 'bg-[var(--kura-border)]/40 text-[var(--kura-muted)]'
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-[var(--kura-muted)]">{label}</dt>
      <dd className="text-[12px] font-semibold text-[var(--kura-text)]">{value}</dd>
    </div>
  )
}

function EngineCard({
  row,
  active,
  onRequestReturn,
  requesting,
}: {
  row: EngineListApi
  active: boolean
  onRequestReturn: () => void
  requesting: boolean
}) {
  const { data: detail } = useMyEngine(row.id, { enabled: active })
  const intakeUrl = firstMediaUrl(detail?.intake_media, detail?.intake_photos)
  const signatureUrl = detail?.intake_signature_media?.url ?? null
  const caseCode = releaseCaseCode(detail?.raw)
  const hub = row.storage_hub_name || row.storage_hub_code || 'Custody hub'
  const eboarder =
    detail?.eboarder_serial || row.eboarder_serial || ''

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)]">
      {intakeUrl ? (
        <img src={intakeUrl} alt="" className="h-40 w-full object-cover" />
      ) : null}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-[15px] font-bold text-[var(--kura-text)]">
              {engineTitle(row)}
            </h3>
            <p className="mt-0.5 text-[12px] text-[var(--kura-muted)]">{row.tag}</p>
          </div>
          <span
            className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${statusTone(row.status)}`}
          >
            {engineStatusLabel(row.status)}
          </span>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--kura-muted)]">
            You dropped
          </p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            <Fact label="Hull / vehicle" value={row.vehicle_reg || '—'} />
            <Fact label="Condition" value={row.condition_grade || '—'} />
            <Fact label="Hub" value={hub} />
            <Fact label="Stored since" value={formatStoredSince(row.created_at)} />
          </dl>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--kura-muted)]">
            You received
          </p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            <Fact
              label="E-boarder"
              value={eboarder || (row.retrofit_id ? 'Serial pending' : '—')}
            />
            <Fact
              label="Job status"
              value={
                row.retrofit_status
                  ? row.retrofit_status.replace(/_/g, ' ')
                  : '—'
              }
            />
          </dl>
        </div>

        {signatureUrl ? (
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--kura-muted)]">
              Signed document
            </p>
            <img
              src={signatureUrl}
              alt="Intake signature"
              className="h-24 w-full rounded-xl border border-[var(--kura-border)] object-cover"
            />
          </div>
        ) : null}

        {row.status === 'RELEASE_REQUESTED' ? (
          <p className="rounded-xl border border-[var(--kura-amber)]/35 bg-[var(--kura-amber)]/10 px-3 py-2.5 text-[12px] text-[var(--kura-text)]">
            Return requested
            {caseCode ? ` · case ${caseCode}` : ''}. Ops will contact you to schedule
            pickup.
          </p>
        ) : null}
        {row.status === 'RELEASED' ? (
          <p className="text-[12px] text-[var(--kura-muted)]">
            Released
            {row.released_at ? ` · ${formatStoredSince(row.released_at)}` : ''}.
          </p>
        ) : null}
        {row.status === 'STORED' ? (
          <OperatorPrimaryButton
            loading={requesting}
            disabled={requesting}
            onClick={onRequestReturn}
          >
            Request engine return
          </OperatorPrimaryButton>
        ) : null}
      </div>
    </article>
  )
}

export const StoredEngineScreen: React.FC<StoredEngineScreenProps> = ({
  onBack,
  embedded = false,
  active = true,
}) => {
  const { isAuthenticated } = useAuth()
  const live = isAuthenticated && active
  const { engines, isPending, isError, refetch } = useMyEngines({ enabled: live })
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [doneOpen, setDoneOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const releaseMut = useRequestEngineRelease(confirmId ?? engines[0]?.id ?? '')
  const confirmEngine = engines.find((e) => e.id === confirmId) ?? null

  return (
    <div className="flex flex-col gap-4">
      {embedded ? (
        <h3 className="text-[15px] font-bold text-[var(--kura-text)]">Stored engine</h3>
      ) : (
        <OperatorBackHeader title="Stored engine" onBack={onBack} />
      )}

      {isPending ? (
        <div className="flex flex-col gap-3">
          <div className="h-40 animate-pulse rounded-2xl bg-[var(--kura-border)]/40" />
          <div className="h-36 animate-pulse rounded-2xl bg-[var(--kura-border)]/40" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-[var(--kura-coral)]/35 bg-[var(--kura-coral)]/10 px-4 py-4">
          <p className="text-[13px] font-semibold text-[var(--kura-coral)]">
            Couldn’t load engines
          </p>
          <button
            type="button"
            className="mt-2 text-[12px] font-bold text-[var(--kura-text)] underline"
            onClick={() => refetch()}
          >
            Retry
          </button>
        </div>
      ) : engines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-4 py-8 text-center">
          <p className="text-[14px] font-semibold text-[var(--kura-text)]">
            Nothing stored with Kura
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--kura-muted)]">
            If you surrender a petrol engine for an e-boarder, it will show here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {engines.map((row) => (
            <EngineCard
              key={row.id}
              row={row}
              active={live}
              requesting={releaseMut.isPending && confirmId === row.id}
              onRequestReturn={() => {
                setError(null)
                setConfirmId(row.id)
              }}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        opened={Boolean(confirmId)}
        title="Request engine return?"
        description={
          confirmEngine
            ? `Ops will open a release case for ${confirmEngine.tag} and schedule pickup from ${confirmEngine.storage_hub_name || 'custody'}.`
            : 'Ops will schedule pickup from custody.'
        }
        confirmLabel="Request return"
        cancelLabel="Keep stored"
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          if (!confirmId) return
          releaseMut
            .mutateAsync({
              note: 'Owner requested petrol engine return from Account → Stored engine',
            })
            .then(() => {
              setConfirmId(null)
              setDoneOpen(true)
            })
            .catch((err) => {
              setError(apiErrorMessage(err, 'Could not request return'))
              setConfirmId(null)
            })
        }}
      />

      {error ? (
        <p className="text-[12px] font-medium text-[var(--kura-coral)]">{error}</p>
      ) : null}

      <KuraIllustrationModal
        opened={doneOpen}
        onClose={() => setDoneOpen(false)}
        illustrationId="success-check"
        title="Return requested"
        description="Ops opened a release case. You’ll get updates in Account → Help when pickup is scheduled."
        primaryAction={{
          label: 'Got it',
          onClick: () => setDoneOpen(false),
        }}
      />
    </div>
  )
}
