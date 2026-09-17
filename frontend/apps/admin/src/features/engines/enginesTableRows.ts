import {
  formatEngineSince,
  petrolLabel,
  retrofitStageLabel,
} from './engineHelpers'
import type { EngineListApi, RetrofitListApi } from './types'

export type EnginesTableRow = {
  key: string
  kind: 'job' | 'engine'
  href: string
  tag: string
  vehicle_reg: string
  petrol: string
  stage: string
  owner_name: string
  hub: string
  since: string
  make: string
  model: string
  hp: string
  status: string
}

export function jobToEnginesRow(job: RetrofitListApi): EnginesTableRow {
  const stage = retrofitStageLabel({ kind: 'job' })
  return {
    key: `job-${job.id}`,
    kind: 'job',
    href: `/engines/${job.id}/edit`,
    tag: job.petrol_engine_tag || '—',
    vehicle_reg: job.vehicle_reg || '—',
    petrol:
      petrolLabel(
        job.petrol_make ?? '',
        job.petrol_model ?? '',
        job.petrol_hp ?? '',
      ) || '—',
    stage,
    owner_name: job.owner_name,
    hub: job.storage_hub_name ?? job.storage_hub_code ?? '—',
    since: formatEngineSince(job.created_at),
    make: job.petrol_make ?? '',
    model: job.petrol_model ?? '',
    hp: job.petrol_hp ?? '',
    status: stage,
  }
}

export function engineToEnginesRow(e: EngineListApi): EnginesTableRow {
  const stage = retrofitStageLabel({
    kind: 'engine',
    engineStatus: e.status,
    retrofitStatus: e.retrofit_status,
  })
  return {
    key: `engine-${e.id}`,
    kind: 'engine',
    href: `/engines/${e.id}`,
    tag: e.tag,
    vehicle_reg: e.vehicle_reg || '—',
    petrol: petrolLabel(e.make, e.model, e.hp) || '—',
    stage,
    owner_name: e.owner_name,
    hub: e.storage_hub_name ?? e.storage_hub_code ?? '—',
    since: formatEngineSince(e.created_at),
    make: e.make,
    model: e.model,
    hp: e.hp,
    status: e.status,
  }
}
