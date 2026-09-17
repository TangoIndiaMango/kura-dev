import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AdminLineChart,
  DynamicTableSection,
  ADMIN_CHART_COLORS,
  type TableHeader,
} from '@shared/components'
import {
  MOCK_COHORTS,
  MOCK_REVENUE_ARPU_MONTHLY,
  MOCK_REVENUE_BY_VEHICLE,
} from '@shared/mock/adminMockData'
import { formatNaira } from '@shared/utils/currency'
import { CohortRetentionMatrix } from './CohortRetentionMatrix'
import { useRevenueAnalyticsSettings } from './RevenueSettingsTab'
import {
  arpuBasisLabel,
  buildArpuTrend,
  estimateLtv,
  formatCompactNaira,
  formatPct,
  vehicleRowsWithEconomics,
} from './revenueMath'

const VEHICLE_HEADERS: TableHeader[] = [
  { key: 'vehicleType', label: 'VEHICLE TYPE' },
  { key: 'operators', label: 'OPERATORS' },
  { key: 'mrr', label: 'MRR' },
  { key: 'arpu', label: 'ARPU' },
  { key: 'contribution', label: 'CONTRIBUTION' },
  { key: 'churn', label: 'CHURN' },
]

export function RevenueCohortsTab() {
  const navigate = useNavigate()
  const { settings } = useRevenueAnalyticsSettings()
  const arpuTrend = useMemo(
    () => buildArpuTrend(MOCK_REVENUE_ARPU_MONTHLY, settings.arpuBasis),
    [settings.arpuBasis],
  )
  const latestArpu = arpuTrend.length
    ? arpuTrend[arpuTrend.length - 1]!.arpu
    : null
  const ltv = estimateLtv(latestArpu, settings)
  const vehicleRows = useMemo(
    () => vehicleRowsWithEconomics(MOCK_REVENUE_BY_VEHICLE),
    [],
  )

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
            ARPU
          </p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--tx)]">
            {latestArpu === null ? '—' : formatNaira(latestArpu)}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--mu)]">
            {arpuBasisLabel(settings.arpuBasis)}
          </p>
        </div>
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
            Estimated LTV
          </p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--tx)]">
            {ltv === null ? '—' : formatCompactNaira(ltv)}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--mu)]">
            {settings.ltvHorizonMonths} months × {settings.ltvRetentionFactorPct}% retention
          </p>
        </div>
        <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
            Cohorts tracked
          </p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--tx)]">
            {MOCK_COHORTS.length}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--mu)]">
            Churn warning above {settings.churnWarnPct}%
          </p>
        </div>
      </div>

      <div className="overflow-visible rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 pb-5">
        <h3 className="mb-1 text-[13px] font-bold text-[var(--tx)]">ARPU trend</h3>
        <p className="mb-3 text-[12px] text-[var(--mu)]">
          Planning model · monthly numerator ÷ active operators
        </p>
        <AdminLineChart
          data={arpuTrend}
          series={[
            { dataKey: 'arpu', name: 'ARPU (₦)', color: ADMIN_CHART_COLORS.teal },
          ]}
          height={220}
        />
      </div>

      <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4">
        <h3 className="mb-1 text-[13px] font-bold text-[var(--tx)]">
          Cohort retention
        </h3>
        <p className="mb-3 text-[12px] text-[var(--mu)]">
          Select a cohort to open its retention detail
        </p>
        <CohortRetentionMatrix
          cohorts={MOCK_COHORTS}
          onSelect={(id) => navigate(`/revenue/${id}`)}
        />
      </div>

      <DynamicTableSection<(typeof vehicleRows)[number]>
        variant="embedded"
        headers={VEHICLE_HEADERS}
        data={vehicleRows}
        getRowKey={(row) => row.id}
        showRowAction={false}
        toolbar={{ title: 'Economics by vehicle type', showFilter: false }}
        renderItems={(row) => [
          <span key="vt" className="text-xs font-bold text-[var(--tx)]">
            {row.vehicleType}
          </span>,
          <span key="op" className="font-mono text-xs text-[var(--tx)]">
            {row.operators}
          </span>,
          <span key="mrr" className="text-xs tabular-nums text-[var(--tx)]">
            {formatCompactNaira(row.mrr)}
          </span>,
          <span key="arpu" className="text-xs tabular-nums text-[var(--tx)]">
            {formatNaira(row.arpu)}
          </span>,
          <span key="cm" className="text-xs tabular-nums text-[var(--mu)]">
            {formatCompactNaira(row.contributionNaira)} · {formatPct(row.contributionPct)}
          </span>,
          <span key="ch" className="font-mono text-xs text-[var(--mu)]">
            {row.churn}
          </span>,
        ]}
      />
    </div>
  )
}
