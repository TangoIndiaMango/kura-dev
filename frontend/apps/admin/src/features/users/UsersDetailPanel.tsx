import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AdminDetailPage,
  DetailPageLoadingSkeleton,
  DynamicTableSection,
  useAdminModuleControls,
  type AdminDetailAction,
  type TableHeader,
} from '@shared/components'
import type { AuditLogRecord } from '@shared/mock/adminMockData'
import { downloadCsv } from '@shared/utils/downloadCsv'
import { useAuditEvents, type AuditEventApi } from '@features/audit'
import { userStatusLabel, userStatusTone } from './userDetailHelpers'
import { useAssignableStaffRoles, useStaffUser } from './hooks/use-users'
import { useUserDetailActions } from './hooks/use-user-detail-actions'
import { UsersDetailModals } from './UsersDetailModals'

const AUDIT_HEADERS: TableHeader[] = [
  { key: 'at', label: 'WHEN' },
  { key: 'action', label: 'ACTION' },
  { key: 'actor', label: 'ACTOR' },
  { key: 'target', label: 'TARGET' },
  { key: 'ip', label: 'IP' },
]

function mapAudit(ev: AuditEventApi): AuditLogRecord {
  return {
    id: ev.id,
    action: ev.action,
    actor: ev.actor_name,
    target: ev.subject_label || ev.subject_id,
    ip: ev.ip_address || '—',
    at: new Date(ev.at).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),
    detail: JSON.stringify(ev.after || ev.metadata || {}),
  }
}

/** Staff IAM detail — summary + live audit from `/audit/`. */
export function UsersDetailPanel() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: found, raw, isPending, isError } = useStaffUser(id)
  const { roles } = useAssignableStaffRoles()
  const actionsApi = useUserDetailActions(id || '', found)
  const { events: auditEvents } = useAuditEvents({
    subject_type: 'user',
    subject_id: id,
  })

  const [rolePickerOpen, setRolePickerOpen] = useState(false)
  const [draftRole, setDraftRole] = useState('')
  const [peek, setPeek] = useState<AuditLogRecord | null>(null)

  const auditControls = useAdminModuleControls({
    scope: `user_${id ?? 'x'}_audit`,
    statusOptions: [],
    filterTitle: 'Filter audit',
    showDateRange: false,
  })

  if (isPending) return <DetailPageLoadingSkeleton />

  const record = actionsApi.live
  if (isError || !record) {
    return (
      <AdminDetailPage
        backLabel="Back to users"
        onBack={() => navigate('/users')}
        title="User not found"
        summaryRows={[{ label: 'ID', value: id ?? '—' }]}
      />
    )
  }

  const auditRows = auditEvents.map(mapAudit)
  const q = auditControls.search.toLowerCase()
  const filteredAudit = q
    ? auditRows.filter(
        (a) =>
          a.action.toLowerCase().includes(q) ||
          a.actor.toLowerCase().includes(q) ||
          a.detail.toLowerCase().includes(q),
      )
    : auditRows
  const { pageRows, pagination } = auditControls.paginate(filteredAudit)
  const displayId = record.publicId || record.id

  const actions: AdminDetailAction[] = [
    {
      id: 'edit',
      label: 'Edit',
      disabled: record.status === 'REVOKED',
      onClick: () => navigate(`/users/${id}/edit`),
    },
    {
      id: 'change-role',
      label: 'Change Role',
      disabled: record.status === 'REVOKED',
      onClick: () => {
        setDraftRole(raw?.role ?? '')
        setRolePickerOpen(true)
      },
    },
    {
      id: 'suspend',
      label: 'Suspend',
      tone: 'danger',
      disabled: record.status !== 'ACTIVE' && record.status !== 'INVITED',
      onClick: () => actionsApi.setPending('suspend'),
    },
    {
      id: 'reactivate',
      label: 'Reactivate',
      disabled: record.status === 'ACTIVE' || record.status === 'INVITED',
      onClick: () => actionsApi.setPending('reactivate'),
    },
    {
      id: 'export',
      label: 'Export Record',
      onClick: () => actionsApi.setPending('export'),
    },
  ]

  return (
    <>
      <AdminDetailPage
        backLabel="Back to users"
        onBack={() => navigate('/users')}
        breadcrumbs={[{ label: 'Users', to: '/users' }, { label: record.name }]}
        title={record.name}
        subtitle={`User · ${displayId}`}
        statusLabel={userStatusLabel(record.status)}
        statusTone={userStatusTone(record.status)}
        actions={actions}
        summaryRows={[
          { label: 'User ID', value: displayId },
          { label: 'Email', value: record.email },
          { label: 'Phone', value: record.phone },
          { label: 'Role', value: record.role },
          { label: 'Last login', value: record.lastLogin },
        ]}
        detailRows={[
          { label: 'Internal UUID', value: record.id },
          { label: 'Status', value: userStatusLabel(record.status) },
          { label: 'Invited', value: record.invitedAt },
          { label: 'Auth', value: record.authMethod },
        ]}
      >
        <div className="min-w-0 rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] shadow-[var(--sh)]">
          <DynamicTableSection<AuditLogRecord>
            variant="embedded"
            headers={AUDIT_HEADERS}
            data={pageRows}
            pagination={pagination}
            getRowKey={(item) => item.id}
            toolbar={{
              title: 'Audit trail',
              searchQuery: auditControls.searchQuery,
              onSearchChange: auditControls.setSearchQuery,
              searchPlaceholder: 'Search action, actor…',
              onFilter: auditControls.openFilter,
              showFilter: true,
              showExport: true,
              onExport: () =>
                downloadCsv(
                  `${displayId}-audit.csv`,
                  ['at', 'action', 'actor', 'target', 'ip', 'detail'],
                  filteredAudit.map((a) => [
                    a.at,
                    a.action,
                    a.actor,
                    a.target,
                    a.ip,
                    a.detail,
                  ]),
                ),
            }}
            onRowClick={setPeek}
            emptyTitle="No audit events"
            emptyMessage="Invite, role, and access changes for this user list here."
            renderItems={(item) => [
              <span key="at" className="text-xs text-[var(--mu)]">
                {item.at}
              </span>,
              <span key="action" className="font-mono text-xs font-bold text-[var(--pr)]">
                {item.action}
              </span>,
              <span key="actor" className="text-xs font-bold text-[var(--tx)]">
                {item.actor}
              </span>,
              <span key="target" className="text-xs text-[var(--tx)]">
                {item.target}
              </span>,
              <span key="ip" className="font-mono text-xs text-[var(--mu)]">
                {item.ip}
              </span>,
            ]}
          />
        </div>
      </AdminDetailPage>

      {auditControls.filterModal}

      <UsersDetailModals
        recordName={record.name}
        roles={roles}
        rolePickerOpen={rolePickerOpen}
        setRolePickerOpen={setRolePickerOpen}
        draftRole={draftRole}
        setDraftRole={setDraftRole}
        peek={peek}
        setPeek={setPeek}
        actionsApi={actionsApi}
        onEdit={() => navigate(`/users/${record.id}/edit`)}
      />
    </>
  )
}
