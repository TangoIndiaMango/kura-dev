import { useState } from 'react'
import {
  AdminConfirmModal,
  AdminModuleLayout,
  DetailsDrawer,
  DynamicTableSection,
  KuraIllustrationModal,
  LoadingState,
  useAdminModuleControls,
  type TableHeader,
} from '@shared/components'
import { downloadCsv } from '@shared/utils/downloadCsv'
import { useAuditEvents, useAuditStats, type AuditEventApi } from './hooks/use-audit'

const HEADERS: TableHeader[] = [
  { key: 'at', label: 'WHEN' },
  { key: 'action', label: 'ACTION' },
  { key: 'actor', label: 'ACTOR' },
  { key: 'target', label: 'TARGET' },
  { key: 'ip', label: 'IP' },
]

export function AuditPanel() {
  const [peek, setPeek] = useState<AuditEventApi | null>(null)
  const [confirmExport, setConfirmExport] = useState(false)
  const [exported, setExported] = useState(false)
  const controls = useAdminModuleControls({
    scope: 'audit',
    statusOptions: [],
    filterTitle: 'Filter audit log',
  })

  const { events, isPending, isError } = useAuditEvents({
    search: controls.search || undefined,
    start_date: controls.dateRange?.start_date,
    end_date: controls.dateRange?.end_date,
  })
  const { data: stats } = useAuditStats()
  const { pageRows, pagination } = controls.paginate(events)

  const formatAt = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <>
      <AdminModuleLayout
        title="Audit Trail"
        subtitle="Immutable record of privileged console actions"
        dateRangeSlot={controls.dateRangeSlot}
        kpis={[
          {
            title: 'Events',
            value: String(stats?.totals.all ?? '—'),
            sub: 'All time',
          },
          {
            title: 'Last 24h',
            value: String(stats?.totals.last_24h ?? '—'),
            tone: 'warning',
            sub: 'Recent',
          },
          {
            title: 'Loaded',
            value: String(events.length),
            sub: 'Current feed',
          },
          {
            title: 'Module',
            value: 'Live',
            tone: 'success',
            sub: 'API-backed',
          },
        ]}
      >
        {isPending ? (
          <LoadingState cols={5} rows={8} />
        ) : isError ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--mu)]">
            Could not load audit events.
          </p>
        ) : (
          <DynamicTableSection<AuditEventApi>
            variant="embedded"
            headers={HEADERS}
            data={pageRows}
            pagination={pagination}
            getRowKey={(item) => item.id}
            toolbar={{
              title: 'Audit log',
              searchQuery: controls.searchQuery,
              onSearchChange: controls.setSearchQuery,
              searchPlaceholder: 'Search action, actor, or target…',
              onFilter: controls.openFilter,
              showFilter: true,
              showExport: true,
              onExport: () => setConfirmExport(true),
            }}
            onRowClick={setPeek}
            emptyTitle="No audit events"
            emptyMessage="Privileged actions will appear here as they happen."
            renderItems={(item) => [
              <span key="at" className="text-xs text-[var(--mu)]">
                {formatAt(item.at)}
              </span>,
              <span key="action" className="font-mono text-xs font-bold text-[var(--pr)]">
                {item.action}
              </span>,
              <span key="actor" className="text-xs font-bold text-[var(--tx)]">
                {item.actor_name}
              </span>,
              <span key="target" className="text-xs text-[var(--tx)]">
                {item.subject_label || `${item.subject_type}:${item.subject_id}`}
              </span>,
              <span key="ip" className="font-mono text-xs text-[var(--mu)]">
                {item.ip_address || '—'}
              </span>,
            ]}
          />
        )}
      </AdminModuleLayout>
      {controls.filterModal}

      <DetailsDrawer
        opened={Boolean(peek)}
        onClose={() => setPeek(null)}
        title={peek?.action ?? 'Audit event'}
        rows={
          peek
            ? [
                { label: 'When', value: formatAt(peek.at) },
                { label: 'Actor', value: peek.actor_name },
                { label: 'Role', value: peek.actor_role || '—' },
                {
                  label: 'Target',
                  value: peek.subject_label || `${peek.subject_type}:${peek.subject_id}`,
                },
                { label: 'IP', value: peek.ip_address || '—' },
                {
                  label: 'Detail',
                  value: JSON.stringify(peek.after || peek.metadata || {}),
                },
              ]
            : []
        }
      />

      <AdminConfirmModal
        opened={confirmExport}
        onClose={() => setConfirmExport(false)}
        title="Export loaded audit rows?"
        body="Exports the currently loaded feed from the audit API."
        confirmLabel="Export"
        illustrationId="confirm-action"
        onConfirm={() => {
          downloadCsv(
            'audit.csv',
            ['at', 'action', 'actor', 'target', 'ip'],
            events.map((e) => [
              e.at,
              e.action,
              e.actor_name,
              e.subject_label || `${e.subject_type}:${e.subject_id}`,
              e.ip_address || '',
            ]),
          )
          setConfirmExport(false)
          setExported(true)
        }}
      />

      <KuraIllustrationModal
        opened={exported}
        onClose={() => setExported(false)}
        illustrationId="record-exported"
        title="Export ready"
        description="Your CSV download should have started."
        primaryAction={{
          label: 'Done',
          onClick: () => setExported(false),
        }}
      />
    </>
  )
}
