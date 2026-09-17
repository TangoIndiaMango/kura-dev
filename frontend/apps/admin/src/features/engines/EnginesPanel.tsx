import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Skeleton } from '@mantine/core'
import { PlusSignIcon } from 'hugeicons-react'
import {
  AdminModuleLayout,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
  type TablePaginationConfig,
} from '@shared/components'
import { downloadCsv } from '@shared/utils/downloadCsv'
import { useCapabilities } from '../auth/useCapabilities'
import { retrofitStageTone } from './engineHelpers'
import {
  engineToEnginesRow,
  jobToEnginesRow,
  type EnginesTableRow,
} from './enginesTableRows'
import { useAwaitingIntakeJobs, useEngines } from './hooks/use-engines'

const HEADERS: TableHeader[] = [
  { key: 'tag', label: 'ENGINE' },
  { key: 'reg', label: 'VEHICLE' },
  { key: 'petrol', label: 'PETROL' },
  { key: 'stage', label: 'STAGE' },
  { key: 'owner', label: 'OWNER' },
  { key: 'hub', label: 'HUB' },
  { key: 'stored', label: 'SINCE' },
]

const STATUS_OPTIONS = [
  { value: 'STORED', label: 'Stored' },
  { value: 'RELEASE_REQUESTED', label: 'Release requested' },
  { value: 'RELEASED', label: 'Released' },
  { value: 'DISPOSED', label: 'Disposed' },
]

function serverPagination(
  page: number,
  totalPages: number,
  pageSize: number,
  setPage: (p: number) => void,
): TablePaginationConfig {
  return {
    page,
    totalPages: Math.max(1, totalPages),
    onPageChange: setPage,
    variant: 'controls',
    pageSize: String(pageSize).padStart(2, '0'),
  }
}

export function EnginesPanel() {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const controls = useAdminModuleControls({
    scope: 'engines',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter engines',
  })

  useEffect(() => {
    if (controls.page !== 1) controls.setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls.search, controls.filterValues])

  const statusFilter =
    controls.filterValues.status && controls.filterValues.status !== 'all'
      ? String(controls.filterValues.status)
      : undefined

  const { engines, isPending, isError, count, totalPages, currentPage } =
    useEngines(
      {
        page: controls.page,
        page_size: controls.pageSize,
        search: controls.search || undefined,
        status: statusFilter,
      },
      { enabled: can('engines:manage') },
    )

  const showAwaiting = !statusFilter
  const {
    jobs: awaiting,
    count: awaitingCount,
    isPending: awaitingPending,
  } = useAwaitingIntakeJobs({
    enabled: can('engines:manage') && showAwaiting,
  })

  const rows = useMemo(() => {
    const q = controls.search.trim().toLowerCase()
    const jobs =
      showAwaiting && controls.page === 1
        ? awaiting.filter((j) => {
            if (!q) return true
            return (
              j.vehicle_reg.toLowerCase().includes(q) ||
              j.owner_name.toLowerCase().includes(q) ||
              (j.eboarder_serial || '').toLowerCase().includes(q)
            )
          })
        : []
    return [...jobs.map(jobToEnginesRow), ...engines.map(engineToEnginesRow)]
  }, [awaiting, engines, showAwaiting, controls.page, controls.search])

  const kpis = useMemo(() => {
    const stored = engines.filter((e) => e.status === 'STORED').length
    const releaseReq = engines.filter(
      (e) => e.status === 'RELEASE_REQUESTED',
    ).length
    const activated = engines.filter(
      (e) => e.retrofit_status === 'ACTIVATED',
    ).length
    return {
      awaiting: showAwaiting ? awaitingCount : 0,
      stored,
      releaseReq,
      activated,
    }
  }, [engines, awaitingCount, showAwaiting])

  if (!can('engines:manage')) {
    return (
      <AdminModuleLayout
        title="Retrofit & Engines"
        subtitle="You need engines:manage to view retrofits and stored petrol."
        kpis={[]}
      >
        <p className="text-sm text-[var(--mu)]">Permission required.</p>
      </AdminModuleLayout>
    )
  }

  const listPending = isPending || (showAwaiting && awaitingPending)
  const titleCount =
    count + (showAwaiting && controls.page === 1 ? awaitingCount : 0)

  return (
    <>
      <AdminModuleLayout
        title="Retrofit & Engines"
        subtitle="Petrol-to-electric conversions, engine custody, and e-boarder activation"
        dateRangeSlot={controls.dateRangeSlot}
        kpis={[
          {
            title: 'Awaiting intake',
            value: listPending ? '—' : String(kpis.awaiting),
            sub: 'Continue when on site',
            tone: kpis.awaiting > 0 ? 'warning' : 'default',
          },
          {
            title: 'Engines stored',
            value: isPending ? '—' : String(kpis.stored),
            sub: 'At hubs',
          },
          {
            title: 'Activated',
            value: isPending ? '—' : String(kpis.activated),
            sub: 'E-boarder live',
            tone: 'success',
          },
          {
            title: 'Release requests',
            value: isPending ? '—' : String(kpis.releaseReq),
            sub: 'Awaiting ops',
            tone: kpis.releaseReq > 0 ? 'warning' : 'default',
          },
        ]}
      >
        {isError ? (
          <p className="text-sm text-[var(--danger,#b42318)]">
            Could not load engines. Retry or check API.
          </p>
        ) : listPending ? (
          <Skeleton height={280} radius="md" />
        ) : (
          <DynamicTableSection<EnginesTableRow>
            variant="embedded"
            headers={HEADERS}
            data={rows}
            pagination={serverPagination(
              currentPage,
              totalPages,
              controls.pageSize,
              controls.setPage,
            )}
            getRowKey={(item) => item.key}
            toolbar={{
              title: `Retrofits · ${titleCount}`,
              searchQuery: controls.searchQuery,
              onSearchChange: controls.setSearchQuery,
              searchPlaceholder: 'Search tag, owner, hub…',
              onFilter: controls.openFilter,
              showFilter: true,
              showExport: true,
              onExport: () =>
                downloadCsv(
                  'engines.csv',
                  [
                    'tag',
                    'vehicle_reg',
                    'make',
                    'model',
                    'hp',
                    'owner',
                    'hub',
                    'stage',
                    'since',
                  ],
                  rows.map((r) => [
                    r.tag,
                    r.vehicle_reg,
                    r.make,
                    r.model,
                    r.hp,
                    r.owner_name,
                    r.hub,
                    r.stage,
                    r.since,
                  ]),
                ),
              actions: (
                <Button
                  leftSection={<PlusSignIcon size={16} />}
                  className="bg-[var(--pr)] hover:opacity-90"
                  onClick={() => navigate('/engines/new')}
                >
                  New retrofit
                </Button>
              ),
            }}
            onRowClick={(item) => navigate(item.href)}
            renderItems={(item) => [
              <span
                key="tag"
                className="font-mono text-xs font-bold text-[var(--pr)]"
              >
                {item.tag}
              </span>,
              <span key="reg" className="text-xs font-bold text-[var(--tx)]">
                {item.vehicle_reg}
              </span>,
              <span key="petrol" className="text-xs text-[var(--mu)]">
                {item.petrol}
              </span>,
              <TableStatusBadge
                key="stage"
                label={item.stage}
                tone={retrofitStageTone(item.stage)}
              />,
              <span key="owner" className="text-xs text-[var(--mu)]">
                {item.owner_name}
              </span>,
              <span key="hub" className="text-xs text-[var(--mu)]">
                {item.hub}
              </span>,
              <span key="since" className="text-xs text-[var(--mu)]">
                {item.since}
              </span>,
            ]}
          />
        )}
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
