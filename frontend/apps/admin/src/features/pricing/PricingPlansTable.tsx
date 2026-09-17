import { Button, Skeleton } from '@mantine/core'
import { PlusSignIcon } from 'hugeicons-react'
import { DynamicTableSection, TableStatusBadge } from '@shared/components'
import type { PlanRecord } from '@shared/mock/adminMockData'
import { formatNaira } from '@shared/utils/currency'
import {
  PLAN_HEADERS,
  periodSuffix,
  planStatusLabel,
  planTone,
} from './pricingPanelMeta'

type Pagination = {
  page: number
  totalPages: number
  pageSize?: string
  onPageChange: (page: number) => void
  onNext?: () => void
  onPrevious?: () => void
}

type Props = {
  pending: boolean
  error: boolean
  rows: PlanRecord[]
  pagination: Pagination
  searchQuery: string
  onSearchChange: (q: string) => void
  onFilter: () => void
  onOpenPlan: (id: string) => void
  onAdd: () => void
}

export function PricingPlansTable({
  pending,
  error,
  rows,
  pagination,
  searchQuery,
  onSearchChange,
  onFilter,
  onOpenPlan,
  onAdd,
}: Props) {
  if (pending) return <Skeleton height={280} radius="md" />
  if (error) {
    return (
      <p className="text-[13px] text-[var(--mu)]">
        Could not load live plans. Check auth and retry.
      </p>
    )
  }
  return (
    <DynamicTableSection<PlanRecord>
      variant="embedded"
      headers={PLAN_HEADERS}
      data={rows}
      pagination={pagination}
      getRowKey={(item) => item.id}
      emptyTitle="No plans in catalogue"
      emptyMessage="Catalogue plans appear after seed or matrix activation."
      toolbar={{
        title: 'All plans',
        searchQuery,
        onSearchChange,
        searchPlaceholder: 'Search plans…',
        onFilter,
        showFilter: true,
        actions: (
          <Button
            leftSection={<PlusSignIcon size={16} />}
            className="bg-[var(--pr)] hover:opacity-90"
            onClick={onAdd}
          >
            Add New Plan
          </Button>
        ),
      }}
      onRowClick={(item) => onOpenPlan(item.id)}
      renderItems={(item) => [
        <div key="name" className="min-w-0">
          <div className="text-xs font-bold text-[var(--tx)]">{item.name}</div>
          <div className="text-[11px] font-medium text-[var(--pr)]">ID: {item.code}</div>
        </div>,
        <span key="vt" className="text-xs text-[var(--mu)]">
          {item.vehicleType}
        </span>,
        <span key="price" className="font-mono text-xs text-[var(--tx)]">
          {formatNaira(item.price)}
          <span className="text-[var(--mu)]">{periodSuffix(item.period)}</span>
        </span>,
        <span key="dur" className="text-xs text-[var(--mu)]">
          {item.durationLabel}
        </span>,
        <span key="created" className="text-xs text-[var(--mu)]">
          {item.createdAt}
        </span>,
        <TableStatusBadge
          key="st"
          label={planStatusLabel(item.status)}
          tone={planTone(item.status)}
        />,
      ]}
    />
  )
}
