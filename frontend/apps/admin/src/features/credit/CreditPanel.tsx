import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@mantine/core'
import {
  AdminModuleLayout,
  AdminBarChart,
  ADMIN_CHART_COLORS,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
  LoadingState,
} from '@shared/components'
import { useUrlTab } from '@shared/hooks/useUrlTab'
import { useConfigNamespace } from '@features/platform-config'
import { formatNaira } from '@shared/utils/currency'
import {
  ADMIN_LIST_PAGE_SIZE,
  buildCursorPagination,
} from '@shared/utils/cursor-pagination'
import { downloadCsv } from '@shared/utils/downloadCsv'
import { CreditSettingsForm } from './CreditSettingsForm'
import { scoreBands, scoreTone, shortAccountId } from './creditScoreMap'
import { useCreditScores } from './hooks/use-credit'
import type { CreditScoreRow } from './types'

const SCORE_HEADERS: TableHeader[] = [
  { key: 'account', label: 'ACCOUNT' },
  { key: 'score', label: 'SCORE' },
  { key: 'limit', label: 'LIMIT' },
  { key: 'computed', label: 'COMPUTED' },
  { key: 'status', label: 'STATUS' },
]

const STATUS_OPTIONS = [
  { value: 'ELIGIBLE', label: 'Eligible' },
  { value: 'BELOW_THRESHOLD', label: 'Below threshold' },
  { value: 'OVERRIDE', label: 'Override' },
]

export function CreditPanel() {
  const navigate = useNavigate()
  const [tab, setTab] = useUrlTab('scores', { valid: ['scores', 'settings'] })
  const [cursor, setCursor] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const { data: creditConfig } = useConfigNamespace('credit', tab === 'scores')
  const threshold = Number(creditConfig?.effective?.score_threshold ?? 60)

  const controls = useAdminModuleControls({
    scope: 'credit',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter credit',
    pageSize: ADMIN_LIST_PAGE_SIZE,
  })

  const creditStatusFilter = controls.getFilter('status')
  useEffect(() => {
    setCursor(undefined)
    setPage(1)
  }, [controls.search, creditStatusFilter])

  const { scores, isPending, isPlaceholderData, nextCursor, previousCursor } =
    useCreditScores(
      { cursor, page_size: ADMIN_LIST_PAGE_SIZE },
      { enabled: tab === 'scores', threshold },
    )

  const pagination = buildCursorPagination({
    page,
    setPage,
    cursor,
    setCursor,
    nextCursor,
    previousCursor,
    isPlaceholderData,
    pageSize: ADMIN_LIST_PAGE_SIZE,
  })

  const rows = useMemo(() => {
    const q = controls.search.toLowerCase()
    return scores.filter(
      (s) =>
        controls.matchesStatus(s.status) &&
        (s.accountId.toLowerCase().includes(q) ||
          String(s.score).includes(q) ||
          s.status.toLowerCase().includes(q)),
    )
  }, [scores, controls.search, controls.filterValues])

  const eligible = scores.filter((s) => s.eligible).length
  const overrides = scores.filter((s) => s.status === 'OVERRIDE').length
  const avg = scores.length
    ? Math.round(scores.reduce((n, s) => n + s.score, 0) / scores.length)
    : 0
  const bands = scoreBands(scores)

  return (
    <>
      <AdminModuleLayout
        title="Credit Scoring"
        subtitle="Operator scores, eligibility, and working-capital limits"
        dateRangeSlot={controls.dateRangeSlot}
        tabs={[
          { id: 'scores', label: 'Scores' },
          { id: 'settings', label: 'Scoring Settings' },
        ]}
        activeTab={tab}
        onTabChange={setTab}
        kpis={[
          {
            title: 'Scored (page)',
            value: isPending ? '—' : scores.length,
            sub: 'Current window',
          },
          {
            title: 'Eligible',
            value: isPending ? '—' : eligible,
            tone: 'success',
            sub: 'At/above threshold',
          },
          { title: 'Avg score', value: isPending ? '—' : avg, sub: 'Out of 100' },
          {
            title: 'Overrides',
            value: isPending ? '—' : overrides,
            tone: 'warning',
            sub: 'Manual flags',
          },
        ]}
        chartsSlot={
          tab === 'scores' ? (
            <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
              <h3 className="mb-3 text-[13px] font-bold text-[var(--tx)]">
                Score distribution
              </h3>
              {isPending ? (
                <Skeleton height={200} radius="md" />
              ) : (
                <AdminBarChart
                  data={bands}
                  series={[
                    {
                      dataKey: 'n',
                      name: 'Operators',
                      color: ADMIN_CHART_COLORS.teal,
                    },
                  ]}
                  height={200}
                />
              )}
            </div>
          ) : undefined
        }
      >
        {tab === 'scores' ? (
          isPending ? (
            <LoadingState cols={6} rows={8} />
          ) : (
            <DynamicTableSection<CreditScoreRow>
              variant="embedded"
              headers={SCORE_HEADERS}
              data={rows}
              pagination={pagination}
              getRowKey={(item) => item.id}
              toolbar={{
                title: 'All scores',
                searchQuery: controls.searchQuery,
                onSearchChange: (v) => {
                  setCursor(undefined)
                  setPage(1)
                  controls.setSearchQuery(v)
                },
                searchPlaceholder: 'Search account or score…',
                onFilter: controls.openFilter,
                showFilter: true,
                showExport: true,
                onExport: () =>
                  downloadCsv(
                    'credit-scores.csv',
                    ['account_id', 'score', 'limit_kobo', 'status', 'computed_by'],
                    rows.map((s) => [
                      s.accountId,
                      s.score,
                      s.limitKobo,
                      s.status,
                      s.computedBy,
                    ]),
                  ),
              }}
              onRowClick={(item) => navigate(`/credit/${item.accountId}`)}
              renderItems={(item) => [
                <span
                  key="id"
                  className="font-mono text-xs font-bold text-[var(--pr)]"
                >
                  {shortAccountId(item.accountId)}
                </span>,
                <span key="sc" className="text-xs font-extrabold text-[var(--tx)]">
                  {item.score}
                </span>,
                <span key="lim" className="font-mono text-xs text-[var(--tx)]">
                  {formatNaira(item.limitKobo, { fromKobo: true })}
                </span>,
                <span key="by" className="text-xs text-[var(--mu)]">
                  {item.computedBy}
                </span>,
                <TableStatusBadge
                  key="st"
                  label={item.status}
                  tone={scoreTone(item.status)}
                />,
              ]}
            />
          )
        ) : (
          <CreditSettingsForm />
        )}
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
