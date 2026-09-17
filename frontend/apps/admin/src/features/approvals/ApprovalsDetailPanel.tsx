import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { notifications } from '@mantine/notifications'
import {
  AdminConfirmModal,
  AdminDetailPage,
  DetailPageLoadingSkeleton,
  KuraIllustrationModal,
} from '@shared/components'
import { apiErrorMessage } from '@lib/api/auth'
import {
  useApproveConfig,
  useConfigVersion,
} from '@features/platform-config'
import {
  approvalTone,
  mapConfigVersion,
  namespaceCap,
  permissionLabel,
  sourcePathForNamespace,
  useCanApproveNamespace,
} from './approvalHelpers'

export function ApprovalsDetailPanel() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { version, isPending, isError, refetch } = useConfigVersion(id)
  const approve = useApproveConfig()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [success, setSuccess] = useState(false)

  const canDecide = useCanApproveNamespace(version?.namespace ?? '')
  const row = version ? mapConfigVersion(version) : null
  const canAct = row?.status === 'PENDING' && canDecide

  if (isPending) return <DetailPageLoadingSkeleton />

  if (isError || !version || !row) {
    return (
      <AdminDetailPage
        backLabel="Back to approvals"
        onBack={() => navigate('/approvals')}
        title="Approval not found"
        summaryRows={[{ label: 'ID', value: id ?? '—' }]}
      />
    )
  }

  return (
    <>
      <AdminDetailPage
        backLabel="Back to approvals"
        onBack={() => navigate('/approvals')}
        title={row.code}
        subtitle={row.subject}
        statusLabel={row.status}
        statusTone={approvalTone(row.status)}
        actions={[
          {
            id: 'approve',
            label: canDecide ? 'Approve' : 'Approve (no permission)',
            disabled: !canAct || approve.isPending,
            onClick: () => setConfirmOpen(true),
          },
        ]}
      >
        <div className="flex min-w-0 flex-col gap-4">
          <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] sm:p-5">
            <h2 className="mb-3 text-[14px] font-bold text-[var(--tx)]">Request</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Meta label="Namespace" value={row.namespace} />
              <Meta
                label="Applies to"
                value={
                  <Link
                    to={sourcePathForNamespace(row.namespace)}
                    className="font-semibold text-[var(--pr)] hover:underline"
                  >
                    {row.namespace} settings
                  </Link>
                }
              />
              <Meta label="Requested by" value={row.requestedBy} />
              <Meta label="Submitted" value={row.submittedAt} />
              <Meta
                label="Permission"
                value={permissionLabel(namespaceCap(row.namespace))}
              />
              {version.approved_by_id ? (
                <Meta
                  label="Approved by"
                  value={
                    version.approved_by_label?.trim() ||
                    version.approved_by_id.slice(0, 8)
                  }
                />
              ) : null}
            </dl>
            {row.note ? (
              <p className="mt-4 text-[13.5px] leading-relaxed text-[var(--tx)]">
                {row.note}
              </p>
            ) : null}
            {!canDecide ? (
              <p className="mt-3 text-[12.5px] font-semibold text-[#C47D0E]">
                Needs {permissionLabel(namespaceCap(row.namespace))} to approve.
              </p>
            ) : null}
          </section>

          <section className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] sm:p-5">
            <h2 className="mb-3 text-[14px] font-bold text-[var(--tx)]">
              Proposed value
            </h2>
            <pre className="overflow-x-auto rounded-[8px] border border-[var(--bd)] bg-[var(--in)] p-3 text-[12px] leading-relaxed text-[var(--tx)]">
              {JSON.stringify(row.value, null, 2)}
            </pre>
          </section>
        </div>
      </AdminDetailPage>

      <AdminConfirmModal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Approve this config change?"
        body="Activates the proposed value for this namespace. Super Admin may approve their own change; other roles need a different approver."
        confirmLabel="Approve"
        illustrationId="confirm-action"
        loading={approve.isPending}
        onConfirm={() => {
          approve.mutate(
            { id: version.id },
            {
              onSuccess: () => {
                setConfirmOpen(false)
                setSuccess(true)
                refetch()
              },
              onError: (err) =>
                notifications.show({
                  color: 'red',
                  title: 'Approval failed',
                  message: apiErrorMessage(
                    err,
                    'Creator cannot approve their own change (unless Super Admin).',
                  ),
                }),
            },
          )
        }}
      />

      <KuraIllustrationModal
        opened={success}
        onClose={() => setSuccess(false)}
        illustrationId="approved"
        title="Approved"
        description={`${row.namespace} config is now active.`}
        primaryAction={{ label: 'Done', onClick: () => setSuccess(false) }}
      />
    </>
  )
}

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[13.5px] font-medium text-[var(--tx)]">{value}</dd>
    </div>
  )
}
