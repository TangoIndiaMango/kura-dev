import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mantine/core'
import { PencilEdit02Icon } from 'hugeicons-react'
import {
  AdminModuleLayout,
  DemoDataBanner,
  DynamicTableSection,
  TableStatusBadge,
  type TableHeader,
} from '@shared/components'
import { formatNaira } from '@shared/utils/currency'
import {
  MOCK_PSP_CONNECTION,
  MOCK_PSP_SETTINGS,
  MOCK_SETTLEMENT_BATCHES,
  type PspSettingRow,
  type SettlementBatchRecord,
} from '@shared/mock/adminMockData'
import { usePspWebhookEvents } from './hooks/use-psp-events'
import { PspWebhooksTab } from './PspWebhooksTab'

const SETTING_HEADERS: TableHeader[] = [
  { key: 'setting', label: 'SETTING' },
  { key: 'value', label: 'VALUE' },
  { key: 'environment', label: 'ENVIRONMENT' },
  { key: 'lastVerified', label: 'LAST VERIFIED' },
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

function settlementTone(status: SettlementBatchRecord['status']) {
  if (status === 'POSTED') return 'success' as const
  if (status === 'FAILED') return 'danger' as const
  return 'warning' as const
}

export function PspPanel() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('webhooks')
  const connection = MOCK_PSP_CONNECTION
  const { events } = usePspWebhookEvents({ enabled: tab === 'webhooks' })
  const failedDeliveries = events.filter((w) => w.status === 'FAILED').length
  const pendingSettlement = MOCK_SETTLEMENT_BATCHES.filter(
    (b) => b.status === 'PENDING',
  ).reduce((sum, b) => sum + b.amount, 0)

  return (
    <AdminModuleLayout
      title="PSP & Payments"
      subtitle="Provider connection, webhook delivery, and settlement batches"
      tabs={[
        { id: 'webhooks', label: 'Webhooks' },
        { id: 'connection', label: 'Connection' },
        { id: 'settlements', label: 'Settlements' },
      ]}
      activeTab={tab}
      onTabChange={setTab}
      kpis={[
        {
          title: 'Failed webhooks',
          value: String(failedDeliveries),
          sub: 'This page · live',
          tone: failedDeliveries ? 'warning' : 'success',
        },
        {
          title: 'Pending settlement',
          value: formatNaira(pendingSettlement),
          sub: 'Demo batches',
        },
        {
          title: 'Connection',
          value: connection.connectionStatus,
          sub: `${connection.provider} · demo`,
          tone: connection.connectionStatus === 'Online' ? 'success' : 'warning',
        },
      ]}
    >
      {tab === 'webhooks' ? <PspWebhooksTab /> : null}

      {tab === 'connection' ? (
        <div className="flex flex-col gap-3">
          <DemoDataBanner
            module="PSP connection"
            detail="Integration settings UI is still mock. Live webhook events are on the Webhooks tab."
          />
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
              <TableStatusBadge
                key="st"
                label={row.status}
                tone={settingTone(row.status)}
              />,
            ]}
          />
        </div>
      ) : null}

      {tab === 'settlements' ? (
        <div className="flex flex-col gap-3">
          <DemoDataBanner
            module="Settlements"
            detail="Settlement batch ops UI is still modelled. Ledger truth is on Payments."
          />
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
              <TableStatusBadge
                key="st"
                label={row.status}
                tone={settlementTone(row.status)}
              />,
            ]}
          />
        </div>
      ) : null}
    </AdminModuleLayout>
  )
}
