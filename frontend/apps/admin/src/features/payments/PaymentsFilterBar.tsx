import type { ReactNode } from 'react'
import { Group, Select } from '@mantine/core'

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

const fieldStyles = {
  input: {
    backgroundColor: 'var(--sf)',
    borderColor: 'var(--bd)',
    color: 'var(--tx)',
    fontWeight: 500,
  },
}

/**
 * Page scope (top-right of Overview): which hub and which days. Drives the
 * KPIs, the method breakdown, both tables and the statement export.
 */
export function PaymentsScopeControls({
  hubId,
  hubOptions,
  onHubChange,
  dateRangeSlot,
}: {
  hubId: string | undefined
  hubOptions: { value: string; label: string }[]
  onHubChange: (hubId: string | null, label: string | null) => void
  dateRangeSlot: ReactNode
}) {
  return (
    <Group gap="sm" wrap="wrap" justify="flex-end">
      <Select
        aria-label="Hub"
        placeholder="All hubs"
        w={220}
        radius="md"
        data={hubOptions}
        value={hubId ?? null}
        searchable
        clearable
        nothingFoundMessage="No hub matches"
        styles={fieldStyles}
        onChange={(v) =>
          onHubChange(v, v ? (hubOptions.find((o) => o.value === v)?.label ?? null) : null)
        }
        comboboxProps={{ withinPortal: true }}
      />
      {dateRangeSlot}
    </Group>
  )
}

/** List filters that sit in the payments table toolbar. */
export function PaymentsListFilters({
  channel,
  onChannelChange,
  status,
  onStatusChange,
}: {
  channel: string | undefined
  onChannelChange: (value: string) => void
  status: string | undefined
  onStatusChange: (value: string) => void
}) {
  return (
    <>
      <Select
        aria-label="Payment method"
        w={160}
        radius="md"
        data={CHANNEL_OPTIONS}
        value={channel ?? ''}
        allowDeselect={false}
        styles={fieldStyles}
        onChange={(v) => onChannelChange(v ?? '')}
        comboboxProps={{ withinPortal: true }}
      />
      <Select
        aria-label="Status"
        w={150}
        radius="md"
        data={STATUS_OPTIONS}
        value={status ?? ''}
        allowDeselect={false}
        styles={fieldStyles}
        onChange={(v) => onStatusChange(v ?? '')}
        comboboxProps={{ withinPortal: true }}
      />
    </>
  )
}
