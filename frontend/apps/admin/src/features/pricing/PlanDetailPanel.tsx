import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Skeleton, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminConfirmModal,
  AdminDetailPage,
  TableStatusBadge,
  type AdminDetailAction,
} from '@shared/components'
import { PlanSubscribersTab } from './components/PlanSubscribersTab'
import { usePlan, usePlanSubscriptions } from '@features/mobility'
import { apiErrorMessage } from '@lib/api/auth'
import { useCapabilities } from '../auth/useCapabilities'
import type { PlanRecord, PlanSubscriberRecord } from '@shared/mock/adminMockData'
import { formatNaira } from '@shared/utils/currency'
import { PlanEconomicsAndBurnCard } from './components/PlanEconomicsAndBurnCard'
import { useActivatePlan, useDeactivatePlan } from './hooks/use-pricing'
import { planApiToRecord, subscriptionToPlanSubscriber } from './planLiveMap'

const SUB_PAGE_SIZE = 10

function planStatusTone(status: PlanRecord['status']) {
  if (status === 'ACTIVE') return 'success' as const
  if (status === 'PENDING') return 'warning' as const
  return 'danger' as const
}

function planStatusLabel(status: PlanRecord['status']) {
  if (status === 'DEACTIVATED') return 'Deactivated'
  if (status === 'PENDING') return 'Pending sign-off'
  return 'Active'
}

function swapLabel(allowance: PlanRecord['swapAllowance']) {
  return allowance === 'unlimited' ? 'Unlimited' : `${allowance} swaps`
}

function periodSuffix(period: PlanRecord['period']) {
  if (period === 'swap') return ' / swap'
  if (period === 'day') return ' / day'
  if (period === 'week') return ' / week'
  return ' / month'
}

function SectionBlock({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-4 border-b border-[var(--bd)] py-5 last:border-0 sm:grid-cols-[160px_1fr] lg:grid-cols-[200px_1fr]">
      <Text fw={700} size="sm" className="text-[var(--tx)]">
        {title}
      </Text>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
        {label}
      </div>
      <div className="mt-0.5 text-[13.5px] font-medium text-[var(--tx)]">{value}</div>
    </div>
  )
}

export function PlanDetailPanel() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [subPage, setSubPage] = useState(1)
  const [pending, setPending] = useState<'activate' | 'deactivate' | null>(null)
  const { can } = useCapabilities()
  const { plan: apiPlan, isPending, isError, refetch } = usePlan(id)
  const activate = useActivatePlan(id ?? '')
  const deactivate = useDeactivatePlan(id ?? '')
  const plan = useMemo(
    () => (apiPlan ? planApiToRecord(apiPlan) : null),
    [apiPlan],
  )
  const {
    subscriptions,
    count: subCount,
    totalPages: subTotalPages,
    isPending: subsPending,
  } = usePlanSubscriptions(
    id,
    { page: subPage, page_size: SUB_PAGE_SIZE },
    { enabled: Boolean(id) },
  )
  const subscribers: PlanSubscriberRecord[] = useMemo(
    () => subscriptions.map(subscriptionToPlanSubscriber),
    [subscriptions],
  )

  if (isPending) {
    return (
      <div className="flex flex-col gap-3 p-6">
        <Skeleton height={40} width={240} />
        <Skeleton height={220} />
      </div>
    )
  }

  if (isError || !plan) {
    return (
      <AdminDetailPage
        backLabel="Back to plans"
        onBack={() => navigate('/pricing/plans')}
        title="Plan not found"
        summaryRows={[{ label: 'ID', value: id ?? '-' }]}
      />
    )
  }

  const activeInPage = subscribers.filter((s) => s.status === 'ACTIVE').length
  const basicContent = (
    <div>
      <SectionBlock title="Basic information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Fact label="Plan name" value={plan.name} />
          <Fact label="Vehicle type" value={plan.vehicleType} />
          <Fact
            label="Price"
            value={`${formatNaira(plan.price)}${periodSuffix(plan.period)}`}
          />
          <Fact label="Duration" value={plan.durationLabel} />
          <Fact
            label="Status"
            value={
              <TableStatusBadge
                label={planStatusLabel(plan.status)}
                tone={planStatusTone(plan.status)}
              />
            }
          />
          <Fact label="Plan ID" value={plan.code} />
          <Fact label="Created" value={plan.createdAt} />
        </div>
      </SectionBlock>
      <SectionBlock title="Plan description">
        <Text size="sm" className="leading-relaxed text-[var(--tx)]">
          {plan.description || 'No description set.'}
        </Text>
      </SectionBlock>
      <SectionBlock title="Plan rules">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Fact label="Swap allowance" value={swapLabel(plan.swapAllowance)} />
          <Fact
            label="Auto-renew by default"
            value={plan.autoRenew ? 'On for new subscribers' : 'Off'}
          />
          <Fact label="On expiry" value="Lapses to pay-per-swap. No silent retry." />
          <Fact label="Surfaces" value="App · USSD · Hub agent · Landing" />
        </div>
      </SectionBlock>
    </div>
  )

  const subscribersContent = (
    <PlanSubscribersTab
      activeCount={plan.subscribers}
      activeInPage={activeInPage}
      subCount={subCount}
      pending={subsPending}
      rows={subscribers}
      page={subPage}
      totalPages={subTotalPages}
      pageSize={SUB_PAGE_SIZE}
      onPageChange={setSubPage}
    />
  )

  return (
    <>
    <AdminDetailPage
      backLabel="Back to plans"
      onBack={() => navigate('/pricing/plans')}
      title={plan.name}
      subtitle={`${plan.code} · Used by app · USSD · hub agent · landing`}
      statusLabel={planStatusLabel(plan.status)}
      statusTone={planStatusTone(plan.status)}
      actions={(() => {
        const actions: AdminDetailAction[] = []
        if (can('tariffs:manage')) {
          actions.push({
            id: 'edit',
            label: 'Edit',
            onClick: () => navigate(`/pricing/plans/${plan.id}/edit`),
          })
          if (plan.status === 'ACTIVE') {
            actions.push({
              id: 'deactivate',
              label: 'Deactivate',
              tone: 'danger',
              onClick: () => setPending('deactivate'),
            })
          } else if (can('price:approve')) {
            actions.push({
              id: 'activate',
              label: 'Activate',
              onClick: () => setPending('activate'),
            })
          }
        }
        return actions
      })()}
      tabs={[
        { id: 'basic', label: 'Basic Information', content: basicContent },
        {
          id: 'economics',
          label: 'Economics & Performance',
          content: <PlanEconomicsAndBurnCard plan={plan} />,
        },
        {
          id: 'subscribers',
          label: 'Subscribers',
          count: plan.subscribers,
          content: subscribersContent,
        },
      ]}
    />
    <AdminConfirmModal
      opened={pending != null}
      onClose={() => setPending(null)}
      title={pending === 'deactivate' ? 'Deactivate plan?' : 'Activate plan?'}
      body={
        pending === 'deactivate'
          ? 'Hides this plan from new purchases. Active subscriptions run to end date.'
          : 'Makes this plan available again for new purchases.'
      }
      confirmLabel={pending === 'deactivate' ? 'Deactivate' : 'Activate'}
      confirmTone={pending === 'deactivate' ? 'danger' : 'primary'}
      illustrationId="confirm-action"
      loading={activate.isPending || deactivate.isPending}
      onConfirm={async () => {
        try {
          if (pending === 'deactivate') await deactivate.mutateAsync({})
          else await activate.mutateAsync({})
          setPending(null)
          await refetch()
          notifications.show({ color: 'teal', message: 'Plan updated.' })
        } catch (err) {
          notifications.show({
            color: 'red',
            message: apiErrorMessage(err, 'Could not update plan'),
          })
        }
      }}
    />
    </>
  )
}
