import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Text } from '@mantine/core'
import { EngineSafetyChecklist } from './EngineSafetyChecklist'
import { formatEngineSince, retrofitStageLabel } from './engineHelpers'
import type {
  EngineDetailApi,
  EngineSafetyChecks,
  RetrofitDetailApi,
} from './types'

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
        {label}
      </div>
      <div className="mt-1 text-[13px] text-[var(--tx)]">{value}</div>
    </div>
  )
}

type Props = {
  engine: EngineDetailApi
  retrofit: RetrofitDetailApi | null
  safety: EngineSafetyChecks
  onSafetyChange: (next: EngineSafetyChecks) => void
}

export function EnginesDetailRetrofit({
  engine,
  retrofit,
  safety,
  onSafetyChange,
}: Props) {
  if (!retrofit) {
    return (
      <section className="rounded-[12px] border border-dashed border-[var(--bd)] bg-[var(--sf)] p-6">
        <Text size="sm" c="dimmed">
          Custody-only engine — no e-boarder job on this unit. Install and
          activate happen on a retrofit linked to the vehicle.
        </Text>
      </section>
    )
  }

  const stage = retrofitStageLabel({
    kind: 'engine',
    engineStatus: engine.status,
    retrofitStatus: retrofit.status,
  })
  const checklistEditable =
    retrofit.status === 'INSTALLED' || retrofit.status === 'CHECKED'
  const showChecklist =
    retrofit.status === 'INSTALLED' ||
    retrofit.status === 'CHECKED' ||
    retrofit.status === 'FAILED' ||
    retrofit.status === 'ACTIVATED'

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
        <Text fw={700} size="sm" className="mb-3 text-[var(--tx)]">
          E-boarder job
        </Text>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="Stage" value={stage} />
          <Fact label="Job status" value={retrofit.status} />
          <Fact
            label="E-boarder serial"
            value={retrofit.eboarder_serial || '—'}
          />
          <Fact
            label="Vehicle"
            value={
              <Link
                to={`/vehicles/${retrofit.vehicle_id}`}
                className="font-semibold text-[var(--pr)] hover:underline"
              >
                {retrofit.vehicle_reg || retrofit.vehicle_id}
              </Link>
            }
          />
          <Fact
            label="Activated on"
            value={
              retrofit.activated_at
                ? formatEngineSince(retrofit.activated_at)
                : 'Not activated yet'
            }
          />
          <Fact
            label="Install agent"
            value={
              retrofit.agent_id ? (
                <Link
                  to={`/users/${retrofit.agent_id}`}
                  className="font-semibold text-[var(--pr)] hover:underline"
                >
                  {retrofit.agent_id.slice(0, 8)}…
                </Link>
              ) : (
                '—'
              )
            }
          />
        </div>
        {retrofit.status === 'FAILED' &&
        typeof retrofit.raw?.failure_reason === 'string' ? (
          <Text size="sm" c="red" mt="md">
            Fail reason: {retrofit.raw.failure_reason}
          </Text>
        ) : null}
        <Text size="xs" c="dimmed" mt="md">
          Next step is under Take Action — install, submit checklist, activate,
          or release.
        </Text>
      </section>

      {showChecklist ? (
        <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
          <EngineSafetyChecklist
            value={safety}
            onChange={onSafetyChange}
            locked={!checklistEditable || engine.status === 'RELEASED'}
            gate="activation"
            optionalNote={
              checklistEditable
                ? 'Tick all six, then Submit checklist in Take Action'
                : undefined
            }
          />
        </section>
      ) : (
        <Text size="sm" c="dimmed">
          Safety checklist unlocks after Mark installed.
        </Text>
      )}
    </div>
  )
}
