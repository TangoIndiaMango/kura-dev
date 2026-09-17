import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Text } from '@mantine/core'
import {
  AdminBarChart,
  AdminDetailPage,
  ADMIN_CHART_COLORS,
  DateRangePicker,
  type DateRangeOutput,
} from '@shared/components'
import { MOCK_COHORTS } from '@shared/mock/adminMockData'
import { formatNaira } from '@shared/utils/currency'
import { useRevenueAnalyticsSettings } from './RevenueSettingsTab'
import {
  estimateLtv,
  formatCompactNaira,
  formatPct,
  parsePct,
  rangeDayCount,
} from './revenueMath'

function defaultRange(): DateRangeOutput {
  return { start_date: '2026-01-01', end_date: '2026-09-05' }
}

function Fact({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
        {label}
      </div>
      <div className="mt-0.5 text-[13.5px] font-medium text-[var(--tx)]">{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-[var(--mu)]">{hint}</div> : null}
    </div>
  )
}

export function RevenueDetailPanel({ id }: { id: string }) {
  const navigate = useNavigate()
  const cohort = useMemo(() => MOCK_COHORTS.find((c) => c.id === id), [id])
  const [range, setRange] = useState<DateRangeOutput>(defaultRange)
  const { settings } = useRevenueAnalyticsSettings()

  const retentionBars = useMemo(() => {
    if (!cohort) return []
    const days = rangeDayCount(range)
    const rows = [
      { label: 'M1', pct: parsePct(cohort.m1) ?? 0, missing: parsePct(cohort.m1) === null },
      { label: 'M3', pct: parsePct(cohort.m3) ?? 0, missing: parsePct(cohort.m3) === null },
      { label: 'M6', pct: parsePct(cohort.m6) ?? 0, missing: parsePct(cohort.m6) === null },
    ].filter((r) => !r.missing)
    if (days <= 45) return rows.slice(0, 1)
    if (days <= 120) return rows.slice(0, 2)
    return rows
  }, [cohort, range])

  const ltv = cohort ? estimateLtv(cohort.arpu, settings) : null

  if (!cohort) {
    return (
      <AdminDetailPage
        onBack={() => navigate('/revenue')}
        backLabel="Back to revenue"
        title="Cohort not found"
        summaryRows={[{ label: 'Requested ID', value: id }]}
      />
    )
  }

  const overview = (
    <div className="flex flex-col gap-6">
      <section>
        <Text fw={700} size="sm" className="mb-3 text-[var(--tx)]">
          Cohort economics
        </Text>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="Cohort ID" value={cohort.id} />
          <Fact label="Join month" value={cohort.name} />
          <Fact label="Operators" value={String(cohort.size)} />
          <Fact label="ARPU" value={formatNaira(cohort.arpu)} />
          <Fact
            label="LTV (est.)"
            value={ltv === null ? '—' : formatCompactNaira(ltv)}
            hint={`${settings.ltvHorizonMonths} mo × ${formatPct(settings.ltvRetentionFactorPct, 0)} — from Settings`}
          />
          <Fact label="Lifecycle" value={cohort.status} />
          <Fact label="M1 retention" value={cohort.m1} />
          <Fact label="M3 retention" value={cohort.m3} />
          <Fact
            label="M6 retention"
            value={cohort.m6}
            hint={parsePct(cohort.m6) === null ? 'Milestone not reached yet' : undefined}
          />
        </div>
      </section>

      <section>
        <Text fw={700} size="sm" className="mb-3 text-[var(--tx)]">
          Retention
        </Text>
        <div className="overflow-visible rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 pb-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-[13px] font-bold text-[var(--tx)]">Retention milestones</h3>
              <p className="mt-0.5 text-[12px] text-[var(--mu)]">
                Shorter ranges show early milestones only. Missing M6 never plots as 0%.
              </p>
            </div>
            <DateRangePicker date={range} onChange={setRange} />
          </div>
          {retentionBars.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[var(--mu)]">
              No retention milestones in this window yet.
            </p>
          ) : (
            <AdminBarChart
              data={retentionBars.map(({ label, pct }) => ({ label, pct }))}
              series={[
                { dataKey: 'pct', name: 'Retention %', color: ADMIN_CHART_COLORS.teal },
              ]}
              height={200}
            />
          )}
        </div>
      </section>
    </div>
  )

  return (
    <AdminDetailPage
      onBack={() => navigate('/revenue')}
      backLabel="Back to revenue"
      breadcrumbs={[
        { label: 'Revenue', to: '/revenue?tab=cohorts' },
        { label: cohort.name },
      ]}
      title={cohort.name}
      subtitle={`${cohort.size} operators · ${formatNaira(cohort.arpu)} ARPU · LTV ${ltv === null ? '—' : formatCompactNaira(ltv)}`}
      statusLabel={cohort.status}
      statusTone={cohort.status === 'MATURE' ? 'success' : 'warning'}
      tabs={[{ id: 'overview', label: 'Overview', content: overview }]}
    />
  )
}
