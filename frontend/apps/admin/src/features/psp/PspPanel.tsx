import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mantine/core'
import { PencilEdit02Icon } from 'hugeicons-react'
import {
  AdminModuleLayout,
  DynamicTableSection,
  TableStatusBadge,
  type TableHeader,
} from '@shared/components'
import { AdminBarChart, ADMIN_CHART_COLORS } from '@shared/components/charts'
import { formatNaira } from '@shared/utils/currency'
import {
  MOCK_PSP_CONNECTION,
  MOCK_PSP_SETTINGS,
  MOCK_SETTLEMENT_BATCHES,
  MOCK_WEBHOOKS,
  MOCK_WEBHOOK_SERIES,
  type PspSettingRow,
  type SettlementBatchRecord,
  type WebhookRecord,
} from '@shared/mock/adminMockData'

const SETTING_HEADERS: TableHeader[] = [
  { key: 'setting', label: 'SETTING' },
  { key: 'value', label: 'VALUE' },
  { key: 'environment', label: 'ENVIRONMENT' },
  { key: 'lastVerified', label: 'LAST VERIFIED' },
  { key: 'status', label: 'STATUS' },
]

const WEBHOOK_HEADERS: TableHeader[] = [
  { key: 'event', label: 'EVENT' },
  { key: 'endpoint', label: 'ENDPOINT' },
  { key: 'attempts', label: 'ATTEMPTS' },
  { key: 'httpCode', label: 'CODE' },
  { key: 'lastAt', label: 'LAST DELIVERY' },
  { key: 'status', label: 'STATUS' },
]

const SETTLEMENT_HEADERS: TableHeader[] = [
  { key: 'reference', label: 'REFERENCE' },
  { key: 'date', label: 'DATE' },
  { key: 'batches', label: 'BATCHES' },
  { key: 'amount', label: 'AMOUNT' },
  { key: 'status', label: 'STATUS' },
]

function settingTone(status: PspSettingRow['status']) {
  if (status === 'Verified' || status === 'Applied') return 'success' as const
  if (status === 'Degraded') return 'danger' as const
  return 'warning' as const
}

function deliveryTone(status: WebhookRecord['status']) {
  if (status === 'SUCCESS') return 'success' as const
  if (status === 'FAILED') return 'danger' as const
  return 'warning' as const
}

function settlementTone(status: SettlementBatchRecord['status']) {
  if (status === 'POSTED') return 'success' as const
  if (status === 'FAILED') return 'danger' as const
  return 'warning' as const
}

export function PspPanel() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('connection')
  const connection = MOCK_PSP_CONNECTION
  const failedDeliveries = MOCK_WEBHOOKS.filter((w) => w.status === 'FAILED').length
  const pendingSettlement = MOCK_SETTLEMENT_BATCHES.filter(
    (b) => b.status === 'PENDING',
  ).reduce((sum, b) => sum + b.amount, 0)

  return (
    <AdminModuleLayout
      title="PSP & Payments"
      subtitle="Provider connection, webhook delivery, and settlement batches"
      tabs={[
        { id: 'connection', label: 'Connection' },
        { id: 'webhooks', label: 'Webhooks' },
        { id: 'settlements', label: 'Settlements' },
      ]}
      activeTab={tab}
      onTabChange={setTab}
      kpis={[
        {
          title: 'Connection',
          value: connection.connectionStatus,
          sub: `${connection.provider} · ${connection.environment}`,
          tone: connection.connectionStatus === 'Online' ? 'success' : 'warning',
        },
        {
          title: 'Gateway latency',
          value: `${connection.latencyMs} ms`,
          sub: 'Last health probe',
        },
        {
          title: 'Failed webhooks',
          value: String(failedDeliveries),
          sub: 'Retry queue',
          tone: failedDeliveries ? 'warning' : 'success',
        },
        {
          title: 'Pending settlement',
          value: formatNaira(pendingSettlement),
          sub: 'Awaiting posting',
        },
      ]}
    >
      {tab === 'connection' ? (
        <DynamicTableSection<PspSettingRow>
          variant="embedded"
          headers={SETTING_HEADERS}
          data={MOCK_PSP_SETTINGS}
          getRowKey={(item) => item.id}
          showRowAction={false}
          toolbar={{
            title: 'Integration settings',
            showFilter: false,
            actions: (
              <Button
                leftSection={<PencilEdit02Icon size={16} />}
                className="bg-[var(--pr)] hover:opacity-90"
                onClick={() => navigate('/psp/edit')}
              >
                Edit integration
              </Button>
            ),
          }}
          renderItems={(row) => [
            <span key="s" className="text-xs font-bold text-[var(--tx)]">
              {row.setting}
            </span>,
            <span key="v" className="font-mono text-xs text-[var(--tx)]">
              {row.value}
            </span>,
            <span key="e" className="text-xs text-[var(--mu)]">
              {row.environment}
            </span>,
            <span key="lv" className="text-xs text-[var(--mu)]">
              {row.lastVerified}
            </span>,
            <TableStatusBadge key="st" label={row.status} tone={settingTone(row.status)} />,
          ]}
        />
      ) : null}

      {tab === 'webhooks' ? (
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)]">
            <h3 className="mb-3 text-[13px] font-bold text-[var(--tx)]">
              Delivery outcomes · last 7 days
            </h3>
            <AdminBarChart
              data={MOCK_WEBHOOK_SERIES}
              series={[
                {
                  dataKey: 'success',
                  name: 'Delivered',
                  color: ADMIN_CHART_COLORS.teal,
                },
                {
                  dataKey: 'failed',
                  name: 'Failed',
                  color: ADMIN_CHART_COLORS.amber,
                },
              ]}
              height={200}
            />
          </div>
          <DynamicTableSection<WebhookRecord>
            variant="embedded"
            headers={WEBHOOK_HEADERS}
            data={MOCK_WEBHOOKS}
            getRowKey={(item) => item.id}
            showRowAction={false}
            toolbar={{ title: 'Recent deliveries', showFilter: false }}
            renderItems={(row) => [
              <span key="ev" className="text-xs font-bold text-[var(--tx)]">
                {row.event}
              </span>,
              <span key="ep" className="max-w-[260px] truncate text-xs text-[var(--mu)]">
                {row.endpoint}
              </span>,
              <span key="at" className="font-mono text-xs text-[var(--tx)]">
                {row.attempts}
              </span>,
              <span key="hc" className="font-mono text-xs text-[var(--mu)]">
                {row.httpCode ?? '—'}
              </span>,
              <span key="la" className="text-xs text-[var(--mu)]">
                {row.lastAt}
              </span>,
              <TableStatusBadge key="st" label={row.status} tone={deliveryTone(row.status)} />,
            ]}
          />
        </div>
      ) : null}

      {tab === 'settlements' ? (
        <DynamicTableSection<SettlementBatchRecord>
          variant="embedded"
          headers={SETTLEMENT_HEADERS}
          data={MOCK_SETTLEMENT_BATCHES}
          getRowKey={(item) => item.id}
          showRowAction={false}
          toolbar={{ title: 'Settlement batches', showFilter: false }}
          renderItems={(row) => [
            <span key="ref" className="font-mono text-xs font-bold text-[var(--tx)]">
              {row.reference}
            </span>,
            <span key="dt" className="text-xs text-[var(--mu)]">
              {row.date}
            </span>,
            <span key="bt" className="font-mono text-xs text-[var(--tx)]">
              {row.batches}
            </span>,
            <span key="amt" className="text-xs font-bold text-[var(--tx)]">
              {formatNaira(row.amount)}
            </span>,
            <TableStatusBadge key="st" label={row.status} tone={settlementTone(row.status)} />,
          ]}
        />
      ) : null}
    </AdminModuleLayout>
  )
}
