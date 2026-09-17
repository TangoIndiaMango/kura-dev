import { Skeleton } from '@mantine/core'
import { AdminModuleLayout } from '@shared/components'
import { useFetchData } from '@shared/hooks/api'
import { formatNaira } from '@shared/utils/currency'
import {
  CooperativeMembersTable,
  type CooperativeMemberRow,
} from './CooperativeMembersTable'

type CooperativeAnalytics = {
  id: string
  name: string
  region: string
  status: string
  aggregates: {
    members: number
    active_vehicles: number
    unreturned_batteries: number
    savings_kobo: number | null
    savings_note?: string
  }
  members: CooperativeMemberRow[]
}

export function MyCooperativePanel() {
  const { data, isPending, isError } = useFetchData<CooperativeAnalytics>(
    '/analytics/cooperative/me/',
    undefined,
    { staleTime: 60_000 },
  )

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton height={80} />
        <Skeleton height={280} radius="md" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <AdminModuleLayout
        title="My Cooperative"
        subtitle="Chairman view of members and fleet"
        kpis={[]}
      >
        <p className="p-4 text-[14px] text-[var(--mu)]">
          No cooperative is linked to your account yet. Ask ops to invite you as
          Cooperative Chairman with a cooperative selected, or assign you as
          chairman.
        </p>
      </AdminModuleLayout>
    )
  }

  const a = data.aggregates
  const unreturned = a.unreturned_batteries

  return (
    <AdminModuleLayout
      title={data.name}
      subtitle={data.region ? `${data.region} · Cooperative` : 'My Cooperative'}
      kpis={[
        { title: 'Members', value: String(a.members) },
        { title: 'Active vehicles', value: String(a.active_vehicles) },
        {
          title: 'Unreturned packs',
          value: String(unreturned),
          tone: unreturned > 0 ? 'danger' : 'default',
          sub: unreturned > 0 ? 'Needs follow-up' : undefined,
        },
        {
          title: 'Est. savings',
          value:
            a.savings_kobo == null
              ? '—'
              : formatNaira(a.savings_kobo, { fromKobo: true }),
          sub: 'Vs petrol',
        },
      ]}
    >
      <CooperativeMembersTable members={data.members} />
    </AdminModuleLayout>
  )
}
