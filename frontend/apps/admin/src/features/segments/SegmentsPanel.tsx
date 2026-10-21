import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mantine/core'
import { PlusSignIcon } from 'hugeicons-react'
import {
  AdminModuleLayout,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
  LoadingState,
} from '@shared/components'
import { downloadCsv } from '@shared/utils/downloadCsv'
import { buildPagePagination } from '@shared/utils/cursor-pagination'
import { useCapabilities } from '../auth/useCapabilities'
import { useSegments } from './hooks/use-segments'
import type { SegmentListApi } from './types'

const HEADERS: TableHeader[] = [
  { key: 'name', label: 'SEGMENT' },
  { key: 'criteria', label: 'CRITERIA' },
  { key: 'covered', label: 'COVERED' },
  { key: 'updated', label: 'UPDATED' },
  { key: 'status', label: 'STATUS' },
]

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
]


function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function SegmentsPanel() {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const controls = useAdminModuleControls({
    scope: 'segments',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter segments',
    showDateRange: false,
    includeDateRangeInFilter: false,
  })


  const statusFilter = controls.getFilter('status')

  const status =
    statusFilter && statusFilter !== 'all' ? String(statusFilter) : undefined

  const { segments, isPending, isError, count, totalPages, isPlaceholderData } =
    useSegments(
      {
        page: controls.page,
        page_size: controls.pageSize,
        search: controls.search || undefined,
        status,
      },
      { enabled: can('segments:manage') },
    )

  const covered = useMemo(
    () => segments.reduce((n, s) => n + (s.last_count || 0), 0),
    [segments],
  )
  const largest = useMemo(
    () => (segments.length ? Math.max(...segments.map((s) => s.last_count)) : 0),
    [segments],
  )

  return (
    <>
      <AdminModuleLayout
        title="Segments"
        subtitle="Cohorts that decide who sees Product Offers in Wallet"
        dateRangeSlot={controls.dateRangeSlot}
        kpis={[
          {
            title: 'Segments',
            value: isPending ? '—' : count,
            sub: 'Saved cohorts',
          },
          {
            title: 'Covered (page)',
            value: isPending ? '—' : covered.toLocaleString(),
            sub: 'Sum of last counts',
          },
          {
            title: 'Largest (page)',
            value: isPending ? '—' : largest,
            sub: 'Top cohort size',
          },
          {
            title: 'Active (page)',
            value: isPending
              ? '—'
              : segments.filter((s) => s.status === 'ACTIVE').length,
            tone: 'success',
            sub: 'Ready for targeting',
          },
        ]}
      >
        {!can('segments:manage') ? (
          <p className="p-4 text-[13px] text-[var(--mu)]">
            Need segments:manage to view cohorts.
          </p>
        ) : isPending ? (
          <LoadingState cols={6} rows={8} />
        ) : isError ? (
          <p className="mb-4 text-[13px] text-[var(--mu)]">
            Could not load segments.
          </p>
        ) : (
          <DynamicTableSection<SegmentListApi>
            variant="embedded"
            headers={HEADERS}
            data={segments}
            pagination={buildPagePagination({
              page: controls.page,
              setPage: controls.setPage,
              totalPages,
              isPlaceholderData,
              pageSize: controls.pageSize,
            })}
            getRowKey={(item) => item.id}
            toolbar={{
              title: 'All segments',
              searchQuery: controls.searchQuery,
              onSearchChange: controls.setSearchQuery,
              searchPlaceholder: 'Search segment name…',
              onFilter: controls.openFilter,
              showFilter: true,
              showExport: true,
              onExport: () =>
                downloadCsv(
                  'segments.csv',
                  ['id', 'name', 'criteria', 'covered', 'updated', 'status'],
                  segments.map((s) => [
                    s.id,
                    s.name,
                    s.criteria_summary,
                    s.last_count,
                    s.updated_at,
                    s.status,
                  ]),
                ),
              actions: (
                <Button
                  leftSection={<PlusSignIcon size={16} />}
                  className="bg-[var(--pr)] hover:opacity-90"
                  onClick={() => navigate('/segments/new')}
                >
                  Add New Segment
                </Button>
              ),
            }}
            getRowHref={(item) => `/segments/${item.id}`}
            emptyTitle="No segments"
            emptyMessage="Create a cohort with measurable account criteria."
            renderItems={(item) => [
              <div key="name" className="flex min-w-0 flex-col">
                <span className="truncate text-xs font-bold text-[var(--tx)]">
                  {item.name}
                </span>
                <span className="font-mono text-[10px] text-[var(--pr)]">
                  {item.id.slice(0, 8)}…
                </span>
              </div>,
              <span
                key="criteria"
                className="max-w-xs truncate text-xs text-[var(--mu)]"
              >
                {item.criteria_summary}
              </span>,
              <span
                key="covered"
                className="text-xs font-extrabold text-[var(--tx)]"
              >
                {item.last_count.toLocaleString()}
              </span>,
              <span key="updated" className="text-xs text-[var(--mu)]">
                {formatWhen(item.updated_at)}
              </span>,
              <TableStatusBadge
                key="st"
                label={item.status}
                tone={item.status === 'ACTIVE' ? 'success' : 'warning'}
              />,
            ]}
          />
        )}
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
