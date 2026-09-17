import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Skeleton, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminConfirmModal,
  AdminDetailPage,
  type AdminDetailAction,
  type KuraIllustrationId,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import {
  discountAudienceLabel,
  discountPeriodsLabel,
  discountPlansLabel,
  discountStatusLabel,
  discountStatusTone,
  formatDiscountValue,
  formatDiscountWindow,
} from './discountHelpers'
import {
  useActivateDiscount,
  useDiscount,
  useDiscountRedemptions,
  useUpdateDiscount,
} from './hooks/use-discounts'
import { DiscountRedemptionsTable } from './DiscountRedemptionsTable'
import type { DiscountStatus } from './types'

type ActionId = 'pause' | 'activate' | 'resume' | 'end'

const ACTION_META: Record<
  ActionId,
  { confirmTitle: string; confirmBody: string; illustrationId: KuraIllustrationId }
> = {
  pause: {
    confirmTitle: 'Pause this discount?',
    confirmBody:
      'New code entries are rejected. Existing redemptions stay on the ledger.',
    illustrationId: 'offer-paused',
  },
  activate: {
    confirmTitle: 'Activate this discount?',
    confirmBody:
      'Requires price:approve. Creator cannot activate their own discount.',
    illustrationId: 'offer-published',
  },
  resume: {
    confirmTitle: 'Resume this discount?',
    confirmBody: 'Returns the campaign to ACTIVE so eligible riders can enter the code again.',
    illustrationId: 'offer-published',
  },
  end: {
    confirmTitle: 'End this discount?',
    confirmBody: 'Marks the campaign expired. Create a new code to restart.',
    illustrationId: 'offer-ended',
  },
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

function SectionBlock({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="border-b border-[var(--bd)] py-5 last:border-0">
      <Text fw={700} size="sm" className="mb-3 text-[var(--tx)]">
        {title}
      </Text>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

export function DiscountsDetailPanel({ id }: { id: string }) {
  const navigate = useNavigate()
  const { discount, isPending, isError, refetch } = useDiscount(id)
  const { redemptions, isPending: redemptionsPending } = useDiscountRedemptions(id)
  const update = useUpdateDiscount(id)
  const activate = useActivateDiscount(id)
  const [pending, setPending] = useState<ActionId | null>(null)

  if (isPending) {
    return (
      <AdminDetailPage
        onBack={() => navigate('/discounts')}
        backLabel="Back to discounts"
        title="Loading discount…"
        summaryRows={[{ label: 'Requested ID', value: id }]}
      >
        <Skeleton height={200} radius="md" />
      </AdminDetailPage>
    )
  }

  if (isError || !discount) {
    return (
      <AdminDetailPage
        onBack={() => navigate('/discounts')}
        backLabel="Back to discounts"
        title="Discount not found"
        summaryRows={[{ label: 'Requested ID', value: id }]}
      />
    )
  }

  const status = discount.status as DiscountStatus
  const meta = pending ? ACTION_META[pending] : null
  const busy = update.isPending || activate.isPending

  const runStatus = (next: DiscountStatus, okMsg: string) => {
    update.mutate(
      { status: next },
      {
        onSuccess: () => {
          notifications.show({ color: 'teal', message: okMsg })
          setPending(null)
          refetch()
        },
        onError: (err) =>
          notifications.show({
            color: 'red',
            message: apiErrorMessage(err, 'Update failed'),
          }),
      },
    )
  }

  const confirm = () => {
    if (!pending) return
    if (pending === 'pause') {
      runStatus('PAUSED', 'Discount paused')
      return
    }
    if (pending === 'end') {
      runStatus('EXPIRED', 'Discount ended')
      return
    }
    if (pending === 'resume') {
      runStatus('ACTIVE', 'Discount resumed')
      return
    }
    activate.mutate(
      {},
      {
        onSuccess: () => {
          notifications.show({ color: 'teal', message: 'Discount activated' })
          setPending(null)
          refetch()
        },
        onError: (err) =>
          notifications.show({
            color: 'red',
            message: apiErrorMessage(err, 'Activate failed'),
          }),
      },
    )
  }

  const actions: AdminDetailAction[] = [
    {
      id: 'edit',
      label: 'Edit',
      onClick: () => navigate(`/discounts/${discount.id}/edit`),
    },
  ]

  if (status === 'DRAFT' || status === 'PENDING' || status === 'SCHEDULED') {
    actions.push({
      id: 'activate',
      label: 'Activate',
      onClick: () => setPending('activate'),
    })
  }
  if (status === 'ACTIVE') {
    actions.push({
      id: 'pause',
      label: 'Pause',
      onClick: () => setPending('pause'),
    })
  }
  if (status === 'PAUSED') {
    actions.push({
      id: 'resume',
      label: 'Resume',
      onClick: () => setPending('resume'),
    })
  }
  if (status !== 'EXPIRED' && status !== 'SUPERSEDED') {
    actions.push({
      id: 'end',
      label: 'End discount',
      tone: 'danger',
      onClick: () => setPending('end'),
    })
  }

  return (
    <>
      <AdminDetailPage
        onBack={() => navigate('/discounts')}
        backLabel="Back to discounts"
        title={discount.name}
        subtitle={discount.summary || discount.code}
        breadcrumbs={[
          { label: 'Discounts', to: '/discounts' },
          { label: discount.name },
        ]}
        statusLabel={discountStatusLabel(status)}
        statusTone={discountStatusTone(status)}
        summaryRows={[
          { label: 'Code', value: discount.code },
          { label: 'Value', value: formatDiscountValue(discount) },
          {
            label: 'Redemptions',
            value: String(discount.redemptions_count),
          },
          {
            label: 'Window',
            value: formatDiscountWindow(discount.starts_at, discount.ends_at),
          },
        ]}
        actions={actions}
      >
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
          <SectionBlock title="Rule">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Fact label="Code" value={discount.code} />
              <Fact label="Value" value={formatDiscountValue(discount)} />
              <Fact label="Periods" value={discountPeriodsLabel(discount)} />
              <Fact label="Plans" value={discountPlansLabel(discount)} />
            </div>
          </SectionBlock>
          <SectionBlock title="Eligibility & window">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Fact label="Audience" value={discountAudienceLabel(discount)} />
              <Fact label="Channels" value={discount.channels || '—'} />
              <Fact
                label="Starts"
                value={formatDiscountWindow(discount.starts_at, null).split(' → ')[0]}
              />
              <Fact
                label="Ends"
                value={formatDiscountWindow(null, discount.ends_at).split(' → ')[1]}
              />
              <Fact label="Discount ID" value={discount.id} />
              <Fact
                label="Max redemptions"
                value={
                  discount.max_redemptions == null
                    ? 'Unlimited'
                    : String(discount.max_redemptions)
                }
              />
            </div>
          </SectionBlock>
          <SectionBlock title="Redemptions">
            <Text size="sm" c="dimmed" mb="sm">
              {discount.redemptions_count.toLocaleString()} total · live ledger
            </Text>
            <DiscountRedemptionsTable
              redemptions={redemptions}
              loading={redemptionsPending}
            />
          </SectionBlock>
        </div>
      </AdminDetailPage>

      <AdminConfirmModal
        opened={Boolean(pending)}
        onClose={() => setPending(null)}
        title={meta?.confirmTitle ?? ''}
        body={meta?.confirmBody ?? ''}
        illustrationId={meta?.illustrationId}
        confirmLabel={busy ? 'Working…' : 'Confirm'}
        loading={busy}
        onConfirm={confirm}
      />
    </>
  )
}
