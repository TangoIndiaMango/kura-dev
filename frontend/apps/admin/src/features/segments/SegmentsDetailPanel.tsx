import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Skeleton, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { AdminDetailPage } from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import {
  useRefreshSegment,
  useSegment,
  useSegmentMembers,
  useUpdateSegment,
} from './hooks/use-segments'
import { SegmentMembersTable } from './SegmentMembersTable'
import {
  formatCriterionLabel,
  formatCriterionValue,
} from './segmentCriteriaLabels'

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
        {label}
      </div>
      <div className="mt-0.5 text-[13.5px] font-medium text-[var(--tx)]">{value}</div>
    </div>
  )
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function SegmentsDetailPanel({ id }: { id: string }) {
  const navigate = useNavigate()
  const [membersPage, setMembersPage] = useState(1)
  const { segment, isPending, isError, refetch } = useSegment(id)
  const membersQ = useSegmentMembers(id, { page: membersPage, page_size: 25 })
  const update = useUpdateSegment(id)
  const refresh = useRefreshSegment(id)

  if (isPending) {
    return (
      <AdminDetailPage
        onBack={() => navigate('/segments')}
        backLabel="Back to segments"
        title="Loading segment…"
        summaryRows={[{ label: 'Requested ID', value: id }]}
      >
        <Skeleton height={200} radius="md" />
      </AdminDetailPage>
    )
  }

  if (isError || !segment) {
    return (
      <AdminDetailPage
        onBack={() => navigate('/segments')}
        backLabel="Back to segments"
        title="Segment not found"
        summaryRows={[{ label: 'Requested ID', value: id }]}
      />
    )
  }

  const activate = () => {
    update.mutate(
      { status: 'ACTIVE' },
      {
        onSuccess: () => {
          notifications.show({ color: 'teal', message: 'Segment activated' })
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

  const toDraft = () => {
    update.mutate(
      { status: 'DRAFT' },
      {
        onSuccess: () => {
          notifications.show({ color: 'teal', message: 'Segment set to draft' })
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

  const runRefresh = () => {
    refresh.mutate(
      {},
      {
        onSuccess: () => {
          notifications.show({ color: 'teal', message: 'Coverage refreshed' })
          refetch()
          membersQ.refetch()
        },
        onError: (err) =>
          notifications.show({
            color: 'red',
            message: apiErrorMessage(err, 'Refresh failed'),
          }),
      },
    )
  }

  return (
    <AdminDetailPage
      onBack={() => navigate('/segments')}
      backLabel="Back to segments"
      title={segment.name}
      subtitle={segment.criteria_summary}
      breadcrumbs={[
        { label: 'Segments', to: '/segments' },
        { label: segment.name },
      ]}
      statusLabel={segment.status}
      statusTone={segment.status === 'ACTIVE' ? 'success' : 'warning'}
      summaryRows={[
        { label: 'Covered', value: String(segment.last_count) },
        { label: 'Last evaluated', value: formatWhen(segment.last_evaluated_at) },
        { label: 'Updated', value: formatWhen(segment.updated_at) },
        { label: 'ID', value: segment.id },
      ]}
      actions={[
        {
          id: 'edit',
          label: 'Edit',
          onClick: () => navigate(`/segments/${segment.id}/edit`),
        },
        ...(segment.status !== 'ACTIVE'
          ? [{ id: 'activate', label: 'Activate', onClick: activate }]
          : [{ id: 'draft', label: 'Set draft', onClick: toDraft }]),
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Text fw={700} size="sm" className="text-[var(--tx)]">
              Membership rules
            </Text>
            <Button
              size="xs"
              variant="light"
              loading={refresh.isPending}
              onClick={runRefresh}
            >
              Refresh count
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(segment.criteria ?? {}).map(([key, val]) => (
              <Fact
                key={key}
                label={formatCriterionLabel(key)}
                value={formatCriterionValue(key, val)}
              />
            ))}
          </div>
          <p className="mt-4 text-[12.5px] text-[var(--mu)]">
            Active segments can be selected when creating or editing Product
            Offers.
          </p>
        </div>

        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
          <Text fw={700} size="sm" className="mb-3 text-[var(--tx)]">
            Covered operators
          </Text>
          <SegmentMembersTable
            members={membersQ.members}
            loading={membersQ.isPending}
            pagination={{
              page: membersQ.currentPage,
              totalPages: Math.max(1, membersQ.totalPages),
              onPageChange: setMembersPage,
              variant: 'controls',
              pageSize: '25',
            }}
          />
        </div>
      </div>
    </AdminDetailPage>
  )
}
