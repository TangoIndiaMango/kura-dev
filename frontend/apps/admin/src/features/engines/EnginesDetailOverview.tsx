import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Text } from '@mantine/core'
import {
  daysInCustody,
  formatEngineSince,
  petrolLabel,
} from './engineHelpers'
import type { EngineDetailApi } from './types'

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
  hubLabel: string
}

export function EnginesDetailOverview({ engine, hubLabel }: Props) {
  return (
    <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
      <Text fw={700} size="sm" className="mb-3 text-[var(--tx)]">
        Petrol engine
      </Text>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Fact label="Tag" value={engine.tag} />
        <Fact
          label="Make / model / HP"
          value={petrolLabel(engine.make, engine.model, engine.hp) || '—'}
        />
        <Fact label="Condition" value={engine.condition_grade} />
        <Fact
          label="Custody"
          value={engine.status.replace(/_/g, ' ')}
        />
        <Fact
          label="Owner"
          value={
            <Link
              to={`/operators/${engine.account_id}`}
              className="font-semibold text-[var(--pr)] hover:underline"
            >
              {engine.owner_name}
              {engine.owner_kura_id ? ` · ${engine.owner_kura_id}` : ''}
            </Link>
          }
        />
        <Fact
          label="Vehicle"
          value={
            engine.vehicle_id ? (
              <Link
                to={`/vehicles/${engine.vehicle_id}`}
                className="font-semibold text-[var(--pr)] hover:underline"
              >
                {engine.vehicle_reg || engine.vehicle_id}
              </Link>
            ) : (
              '—'
            )
          }
        />
        <Fact
          label="Storage hub"
          value={
            engine.storage_hub_id ? (
              <Link
                to={`/hubs/${engine.storage_hub_id}`}
                className="font-semibold text-[var(--pr)] hover:underline"
              >
                {hubLabel}
              </Link>
            ) : (
              hubLabel
            )
          }
        />
        <Fact label="Stored since" value={formatEngineSince(engine.created_at)} />
        <Fact
          label="Days in custody"
          value={String(daysInCustody(engine.created_at))}
        />
        <Fact
          label="Released at"
          value={formatEngineSince(engine.released_at)}
        />
        <Fact
          label="Intake agent"
          value={
            engine.intake_agent_id ? (
              <Link
                to={`/users/${engine.intake_agent_id}`}
                className="font-semibold text-[var(--pr)] hover:underline"
              >
                {engine.intake_agent_id.slice(0, 8)}…
              </Link>
            ) : (
              '—'
            )
          }
        />
        <Fact
          label="Intake witness"
          value={
            engine.intake_witness_id ? (
              <Link
                to={`/users/${engine.intake_witness_id}`}
                className="font-semibold text-[var(--pr)] hover:underline"
              >
                {engine.intake_witness_id.slice(0, 8)}…
              </Link>
            ) : (
              '—'
            )
          }
        />
        <Fact
          label="Released by"
          value={
            engine.release_by_id ? (
              <Link
                to={`/users/${engine.release_by_id}`}
                className="font-semibold text-[var(--pr)] hover:underline"
              >
                {engine.release_by_id.slice(0, 8)}…
              </Link>
            ) : (
              '—'
            )
          }
        />
      </div>
    </section>
  )
}
