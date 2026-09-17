import {
  DynamicTableSection,
  type TableHeader,
} from '@shared/components'
import { formatNaira } from '@shared/utils/currency'
import type { DiscountRedemptionApi } from './types'

const HEADERS: TableHeader[] = [
  { key: 'when', label: 'WHEN' },
  { key: 'operator', label: 'OPERATOR' },
  { key: 'discount', label: 'DISCOUNT' },
  { key: 'due', label: 'DUE' },
  { key: 'channel', label: 'CHANNEL' },
]

interface DiscountRedemptionsTableProps {
  redemptions: DiscountRedemptionApi[]
  loading?: boolean
}

export function DiscountRedemptionsTable({
  redemptions,
  loading,
}: DiscountRedemptionsTableProps) {
  return (
    <DynamicTableSection
      variant="embedded"
      headers={HEADERS}
      data={redemptions}
      loading={Boolean(loading)}
      emptyTitle="No redemptions yet"
      emptyMessage="When operators apply this code at checkout, they appear here."
      getRowHref={(row) => `/operators/${row.account_id}`}
      getRowKey={(row) => row.id}
      showRowAction={false}
      renderItems={(row) => [
        <span key="when" className="text-[12.5px] text-[var(--mu)]">
          {new Date(row.created_at).toLocaleString()}
        </span>,
        <span key="operator" className="font-medium">
          {row.account_display_name || row.kura_id}
          <span className="mt-0.5 block font-mono text-[11.5px] font-normal text-[var(--mu)]">
            {row.kura_id}
          </span>
        </span>,
        <span key="discount" className="font-semibold text-[var(--tx)]">
          −{formatNaira(row.discount_kobo, { fromKobo: true })}
        </span>,
        <span key="due">{formatNaira(row.due_kobo, { fromKobo: true })}</span>,
        <span key="channel" className="text-[var(--mu)]">
          {row.channel || '—'}
          {row.period ? ` · ${row.period}` : ''}
        </span>,
      ]}
    />
  )
}
