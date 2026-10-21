import type { ReactNode } from 'react'
import { Select } from '@mantine/core'

const CHANNEL_OPTIONS = [
  { value: '', label: 'All methods' },
  { value: 'WALLET_DEBIT', label: 'Wallet' },
  { value: 'AGENT_CASH', label: 'Cash at hub' },
  { value: 'CREDIT', label: 'Swap credit' },
  { value: 'NUBAN_TRANSFER', label: 'Bank transfer' },
  { value: 'CARD', label: 'Card' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'SUCCESS', label: 'Successful' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REVERSED', label: 'Reversed' },
]

export function channelOptionLabel(value: string | undefined) {
  return CHANNEL_OPTIONS.find((o) => o.value === (value ?? ''))?.label ?? value ?? ''
}

/**
 * Always-visible scope for the Payments page: which hub, which days, which
 * method. The same filters drive the list, the KPIs and the statement export.
 */
export function PaymentsFilterBar({
  hubId,
  hubOptions,
  onHubChange,
  dateRangeSlot,
  channel,
  onChannelChange,
  status,
  onStatusChange,
  showPaymentFilters,
}: {
  hubId: string | undefined
  hubOptions: { value: string; label: string }[]
  onHubChange: (hubId: string | null, label: string | null) => void
  dateRangeSlot: ReactNode
  channel: string | undefined
  onChannelChange: (value: string) => void
  status: string | undefined
  onStatusChange: (value: string) => void
  /** Method/status apply to the payments list only, not cash duty windows. */
  showPaymentFilters: boolean
}) {
  const options = [{ value: '', label: 'All hubs' }, ...hubOptions]
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Select
        label="Hub"
        size="sm"
        w={220}
        data={options}
        value={hubId ?? ''}
        searchable
        allowDeselect={false}
        onChange={(v) => {
          const next = v || null
          onHubChange(next, next ? (options.find((o) => o.value === v)?.label ?? null) : null)
        }}
        comboboxProps={{ withinPortal: true }}
      />
      {showPaymentFilters ? (
        <>
          <Select
            label="Paid by"
            size="sm"
            w={160}
            data={CHANNEL_OPTIONS}
            value={channel ?? ''}
            allowDeselect={false}
            onChange={(v) => onChannelChange(v ?? '')}
            comboboxProps={{ withinPortal: true }}
          />
          <Select
            label="Status"
            size="sm"
            w={150}
            data={STATUS_OPTIONS}
            value={status ?? ''}
            allowDeselect={false}
            onChange={(v) => onStatusChange(v ?? '')}
            comboboxProps={{ withinPortal: true }}
          />
        </>
      ) : null}
      <div className="flex flex-col gap-1">
        <span className="text-[12px] font-medium text-[var(--tx)]">Dates (WAT)</span>
        {dateRangeSlot}
      </div>
    </div>
  )
}
