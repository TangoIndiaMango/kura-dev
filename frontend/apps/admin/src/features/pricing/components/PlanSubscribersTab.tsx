import { Skeleton } from '@mantine/core'
import {
  DynamicTableSection,
  TableStatusBadge,
  type TableHeader,
} from '@shared/components'
import type { PlanSubscriberRecord } from '@shared/mock/adminMockData'
import { buildPagePagination } from '@shared/utils/cursor-pagination'
import { formatNaira } from '@shared/utils/currency'

const SUB_HEADERS: TableHeader[] = [
  { key: 'op', label: 'OPERATOR' },
  { key: 'paid', label: 'PAYMENT DATE' },
  { key: 'amt', label: 'AMOUNT' },
  { key: 'vehicle', label: 'VEHICLE' },
  { key: 'status', label: 'STATUS' },
]

type Props = {
  activeCount: number
  activeInPage: number
  subCount: number
  pending: boolean
  rows: PlanSubscriberRecord[]
  page: number
  totalPages: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function PlanSubscribersTab({
  activeCount,
  activeInPage,
  subCount,
  pending,
  rows,
  page,
  totalPages,
  pageSize,
  onPageChange,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-[10px] border border-[var(--bd)] bg-[var(--in)] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--su)]">
            Active subscribers
          </div>
          <div className="mt-1 text-[18px] font-bold text-[var(--tx)]">
            {activeCount.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--mu)]">
            Live count · {activeInPage} on this page
          </div>
        </div>
        <div className="rounded-[10px] border border-[var(--bd)] bg-[var(--in)] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--su)]">
            Rows loaded
          </div>
          <div className="mt-1 text-[18px] font-bold text-[var(--tx)]">
            {subCount.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--mu)]">
            All statuses for this plan
          </div>
        </div>
      </div>
      {pending ? (
        <Skeleton height={160} radius="md" />
      ) : (
        <DynamicTableSection<PlanSubscriberRecord>
          variant="embedded"
          headers={SUB_HEADERS}
          data={rows}
          pagination={buildPagePagination({
            page,
            setPage: onPageChange,
            totalPages,
            pageSize,
          })}
          getRowKey={(row) => row.id}
          emptyTitle="No subscribers on this plan"
          emptyMessage="Operators appear here after a successful plan payment."
          toolbar={{ title: 'Subscriber list', showFilter: false }}
          renderItems={(row) => [
            <div key="op" className="min-w-0">
              <div className="text-xs font-bold text-[var(--tx)]">{row.operatorName}</div>
              <div className="text-[11px] text-[var(--pr)]">{row.operatorId}</div>
            </div>,
            <span key="paid" className="text-xs text-[var(--mu)]">
              {row.paymentDate}
            </span>,
            <span key="amt" className="font-mono text-xs text-[var(--tx)]">
              {formatNaira(row.amount)}
            </span>,
            <span key="veh" className="text-xs text-[var(--mu)]">
              {row.vehicleLabel}
            </span>,
            <TableStatusBadge
              key="st"
              label={
                row.status === 'LAPSED'
                  ? 'Lapsed'
                  : row.status === 'EXPIRED'
                    ? 'Expired'
                    : 'Active'
              }
              tone={row.status === 'ACTIVE' ? 'success' : 'danger'}
            />,
          ]}
        />
      )}
    </div>
  )
}
