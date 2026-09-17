import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Skeleton } from '@mantine/core'
import { PlusSignIcon } from 'hugeicons-react'
import {
  AdminModuleLayout,
  AdminLineChart,
  ADMIN_CHART_COLORS,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
  type TablePaginationConfig,
} from '@shared/components'
import { downloadCsv } from '@shared/utils/downloadCsv'
import { useCapabilities } from '../auth/useCapabilities'
import { ImpactPdfButton } from './components/ImpactPdfButton'
import {
  formatCo2Tons,
  formatImpactFuel,
  formatPublishedAt,
  impactStoryTone,
} from './impactHelpers'
import { useImpactStats, useImpactStories } from './hooks/use-impact'
import type { ImpactStoryListApi } from './types'

const STORY_HEADERS: TableHeader[] = [
  { key: 'title', label: 'STORY' },
  { key: 'region', label: 'REGION' },
  { key: 'metric', label: 'HIGHLIGHT' },
  { key: 'partners', label: 'PARTNERS' },
  { key: 'published', label: 'PUBLISHED' },
  { key: 'status', label: 'STATUS' },
]

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
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

export function ImpactPanel() {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const controls = useAdminModuleControls({
    scope: 'impact',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter impact stories',
    includeDateRangeInFilter: false,
  })

  useEffect(() => {
    if (controls.page !== 1) controls.setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls.search, controls.filterValues])

  const statusFilter =
    controls.filterValues.status && controls.filterValues.status !== 'all'
      ? String(controls.filterValues.status)
      : undefined

  const period = useMemo(() => {
    const end = controls.dateRange.end_date
    if (!end) return undefined
    return end.slice(0, 7)
  }, [controls.dateRange.end_date])

  const statsQ = useImpactStats(
    { period },
    { enabled: can('analytics:impact') },
  )
  const { stories, isPending, isError, count, totalPages, currentPage } =
    useImpactStories(
      {
        page: controls.page,
        page_size: controls.pageSize,
        search: controls.search || undefined,
        status: statusFilter,
      },
      { enabled: can('analytics:impact') },
    )

  const stats = statsQ.data
  const chartData = (stats?.series ?? []).map((p) => ({
    label: p.label,
    swaps: p.swaps,
    co2: p.co2_t,
  }))

  if (!can('analytics:impact')) {
    return (
      <AdminModuleLayout
        title="Government Impact"
        subtitle="You need analytics:impact to view outcomes."
        kpis={[]}
      >
        <p className="text-sm text-[var(--mu)]">Permission required.</p>
      </AdminModuleLayout>
    )
  }

  const kpis = [
    {
      title: 'Operators served',
      value: statsQ.isPending ? '—' : String(stats?.operators_served ?? 0),
      sub: stats?.period ?? 'Period',
      tone: 'success' as const,
    },
    {
      title: 'Swaps',
      value: statsQ.isPending ? '—' : String(stats?.swaps ?? 0),
      sub: 'In period',
    },
    {
      title: 'Fuel savings',
      value: statsQ.isPending
        ? '—'
        : formatImpactFuel(stats?.fuel_savings_kobo ?? 0),
      sub: 'Petrol equivalent',
      tone: 'success' as const,
    },
    {
      title: 'Engines replaced',
      value: statsQ.isPending ? '—' : String(stats?.engines_replaced ?? 0),
      sub: 'ICE in custody',
    },
    {
      title: 'CO₂',
      value: statsQ.isPending ? '—' : formatCo2Tons(stats?.co2_kg ?? 0),
      sub: 'Avoided (est.)',
      tone: 'success' as const,
    },
  ]

  return (
    <>
      <AdminModuleLayout
        title="Government Impact"
        subtitle={
          stats?.disclaimer ??
          'Public outcomes, partner briefs, and emissions avoided'
        }
        dateRangeSlot={
          <div className="flex flex-wrap items-center gap-2">
            <ImpactPdfButton period={period} />
            {controls.dateRangeSlot}
          </div>
        }
        kpis={kpis}
        chartsSlot={
          <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
            <h3 className="mb-2 text-[14px] font-bold text-[var(--tx)]">
              Monthly progress
            </h3>
            {chartData.length ? (
              <AdminLineChart
                data={chartData}
                series={[
                  {
                    dataKey: 'swaps',
                    name: 'Swaps',
                    color: ADMIN_CHART_COLORS.teal,
                  },
                  {
                    dataKey: 'co2',
                    name: 'CO₂ (t)',
                    color: ADMIN_CHART_COLORS.amber,
                  },
                ]}
                height={220}
                showLegend
              />
            ) : (
              <Skeleton height={220} radius="md" />
            )}
          </div>
        }
      >
        {isError ? (
          <p className="text-sm text-[var(--danger,#b42318)]">
            Could not load stories.
          </p>
        ) : isPending ? (
          <Skeleton height={280} radius="md" />
        ) : (
          <DynamicTableSection<ImpactStoryListApi>
            variant="embedded"
            headers={STORY_HEADERS}
            data={stories}
            pagination={serverPagination(
              currentPage,
              totalPages,
              controls.pageSize,
              controls.setPage,
            )}
            getRowKey={(item) => item.id}
            toolbar={{
              title: `Impact Stories · ${count}`,
              searchQuery: controls.searchQuery,
              onSearchChange: controls.setSearchQuery,
              searchPlaceholder: 'Search story, region, or partner…',
              onFilter: controls.openFilter,
              showFilter: true,
              showExport: true,
              onExport: () =>
                downloadCsv(
                  'impact-stories.csv',
                  [
                    'id',
                    'title',
                    'region',
                    'highlight',
                    'partners',
                    'published',
                    'status',
                  ],
                  stories.map((s) => [
                    s.id,
                    s.title,
                    s.region,
                    s.metric_highlight,
                    s.partners,
                    formatPublishedAt(s.published_at),
                    s.status,
                  ]),
                ),
              actions: can('impact:manage') ? (
                <Button
                  leftSection={<PlusSignIcon size={16} />}
                  className="bg-[var(--pr)] hover:opacity-90"
                  onClick={() => navigate('/impact/new')}
                >
                  Add story
                </Button>
              ) : undefined,
            }}
            onRowClick={(item) => navigate(`/impact/${item.id}`)}
            renderItems={(item) => [
              <span key="title" className="text-xs font-bold text-[var(--tx)]">
                {item.title}
              </span>,
              <span key="region" className="text-xs text-[var(--mu)]">
                {item.region || '—'}
              </span>,
              <span
                key="metric"
                className="text-xs font-semibold text-[var(--pr)]"
              >
                {item.metric_highlight || '—'}
              </span>,
              <span key="partners" className="text-xs text-[var(--mu)]">
                {item.partners || '—'}
              </span>,
              <span key="pub" className="text-xs text-[var(--mu)]">
                {formatPublishedAt(item.published_at)}
              </span>,
              <TableStatusBadge
                key="st"
                label={item.status}
                tone={impactStoryTone(item.status)}
              />,
            ]}
          />
        )}
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
