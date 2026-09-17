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
  type TablePaginationConfig,
} from '@shared/components'
import { useUrlTab } from '@shared/hooks/useUrlTab'
import { useConfigNamespace } from '@features/platform-config'
import { formatNaira } from '@shared/utils/currency'
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

function cursorPagination(
  cursor: string | undefined,
  nextCursor: string | undefined,
  previousCursor: string | undefined,
  setCursor: (c: string | undefined) => void,
): TablePaginationConfig {
  return {
    page: cursor ? 2 : 1,
    totalPages: nextCursor ? (cursor ? 3 : 2) : cursor ? 2 : 1,
    onPageChange: () => undefined,
    variant: 'controls',
    pageSize: '25',
    onNext: nextCursor ? () => setCursor(nextCursor) : undefined,
    onPrevious: previousCursor
      ? () => setCursor(previousCursor)
      : cursor
        ? () => setCursor(undefined)
        : undefined,
  }
}

export function CreditPanel() {
  const navigate = useNavigate()
  const [tab, setTab] = useUrlTab('scores', { valid: ['scores', 'settings'] })
  const [cursor, setCursor] = useState<string | undefined>()
  const { data: creditConfig } = useConfigNamespace('credit', tab === 'scores')
  const threshold = Number(creditConfig?.effective?.score_threshold ?? 60)

  const controls = useAdminModuleControls({
    scope: 'credit',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter credit',
  })

  useEffect(() => {
    setCursor(undefined)
  }, [controls.search, controls.filterValues])

  const { scores, isPending, nextCursor, previousCursor } = useCreditScores(
    { cursor, page_size: 25 },
    { enabled: tab === 'scores', threshold },
  )

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
            <Skeleton height={280} radius="md" className="m-4" />
          ) : (
            <DynamicTableSection<CreditScoreRow>
              variant="embedded"
              headers={SCORE_HEADERS}
              data={rows}
              pagination={cursorPagination(
                cursor,
                nextCursor,
                previousCursor,
                setCursor,
              )}
              getRowKey={(item) => item.id}
              toolbar={{
                title: 'All scores',
                searchQuery: controls.searchQuery,
                onSearchChange: controls.setSearchQuery,
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
