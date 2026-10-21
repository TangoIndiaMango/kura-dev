import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mantine/core'
import { PlusSignIcon } from 'hugeicons-react'
import {
  AdminModuleLayout,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
  LoadingState,
} from '@shared/components'
import { downloadCsv } from '@shared/utils/downloadCsv'
import { buildPagePagination } from '@shared/utils/cursor-pagination'
import { useCapabilities } from '../auth/useCapabilities'
import {
  discountPeriodsLabel,
  discountStatusLabel,
  discountStatusTone,
  formatDiscountValue,
  formatDiscountWindow,
} from './discountHelpers'
import { useDiscounts } from './hooks/use-discounts'
import type { DiscountApi } from './types'

const HEADERS: TableHeader[] = [
  { key: 'name', label: 'NAME / CODE' },
  { key: 'window', label: 'WINDOW' },
  { key: 'value', label: 'VALUE' },
  { key: 'scope', label: 'PERIODS' },
  { key: 'redemptions', label: 'REDEMPTIONS' },
  { key: 'status', label: 'STATUS' },
]

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'PENDING', label: 'Pending sign-off' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'DRAFT', label: 'Draft' },
]


export function DiscountsPanel() {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const controls = useAdminModuleControls({
    scope: 'discounts',
    statusOptions: STATUS_OPTIONS,
    filterTitle: 'Filter discounts',
  })


  const statusFilter = controls.getFilter('status')

  const status =
    statusFilter && statusFilter !== 'all' ? String(statusFilter) : undefined

  const { discounts, isPending, isError, count, totalPages, isPlaceholderData } =
    useDiscounts(
      {
        page: controls.page,
        page_size: controls.pageSize,
        search: controls.search || undefined,
        status,
      },
      { enabled: can('tariffs:manage') },
    )

  const kpis = useMemo(() => {
    const active = discounts.filter((d) => d.status === 'ACTIVE').length
    const scheduled = discounts.filter((d) => d.status === 'SCHEDULED').length
    const expired = discounts.filter((d) => d.status === 'EXPIRED').length
    const used = discounts.reduce((sum, d) => sum + (d.redemptions_count || 0), 0)
    return { active, scheduled, expired, used }
  }, [discounts])

  return (
    <>
      <AdminModuleLayout
        title="Discounts"
        subtitle="Campaign and rule discounts on renewals and swap charges — separate from Product Offers"
        dateRangeSlot={controls.dateRangeSlot}
        kpis={[
          {
            title: 'Discounts',
            value: isPending ? '—' : count,
            sub: 'Catalog',
          },
          {
            title: 'Active (page)',
            value: isPending ? '—' : kpis.active,
            tone: 'success',
            sub: 'Applying at charge',
          },
          {
            title: 'Scheduled (page)',
            value: isPending ? '—' : kpis.scheduled,
            tone: 'warning',
            sub: 'Future window',
          },
          {
            title: 'Expired (page)',
            value: isPending ? '—' : kpis.expired,
            tone: 'danger',
            sub: 'Audit only',
          },
          {
            title: 'Redemptions (page)',
            value: isPending ? '—' : kpis.used.toLocaleString(),
            sub: 'Uses on this page',
          },
        ]}
      >
        {!can('tariffs:manage') ? (
          <p className="p-4 text-[13px] text-[var(--mu)]">
            Need tariffs:manage to view discounts.
          </p>
        ) : isPending ? (
          <LoadingState cols={6} rows={8} />
        ) : isError ? (
          <p className="mb-4 text-[13px] text-[var(--mu)]">
            Could not load discounts.
          </p>
        ) : (
          <DynamicTableSection<DiscountApi>
            variant="embedded"
            headers={HEADERS}
            data={discounts}
            pagination={buildPagePagination({
              page: controls.page,
              setPage: controls.setPage,
              totalPages,
              isPlaceholderData,
              pageSize: controls.pageSize,
            })}
            getRowKey={(item) => item.id}
            toolbar={{
              title: 'All discounts',
              searchQuery: controls.searchQuery,
              onSearchChange: controls.setSearchQuery,
              searchPlaceholder: 'Search name or code…',
              onFilter: controls.openFilter,
              showFilter: true,
              showExport: true,
              onExport: () =>
                downloadCsv(
                  'discounts.csv',
                  ['name', 'code', 'value', 'start', 'end', 'status', 'redemptions'],
                  discounts.map((d) => [
                    d.name,
                    d.code,
                    formatDiscountValue(d),
                    d.starts_at ?? '',
                    d.ends_at ?? '',
                    d.status,
                    d.redemptions_count,
                  ]),
                ),
              actions: (
                <Button
                  leftSection={<PlusSignIcon size={16} />}
                  className="bg-[var(--pr)] hover:opacity-90"
                  onClick={() => navigate('/discounts/new')}
                >
                  Add New Discount
                </Button>
              ),
            }}
            getRowHref={(item) => `/discounts/${item.id}`}
            emptyTitle="No discounts"
            emptyMessage="Create a campaign code for renewals or swap charges."
            renderItems={(item) => [
              <div key="name" className="min-w-0">
                <div className="text-xs font-bold text-[var(--tx)]">{item.name}</div>
                <div className="font-mono text-[10px] text-[var(--mu)]">
                  {item.code}
                </div>
              </div>,
              <span key="win" className="text-xs text-[var(--mu)]">
                {formatDiscountWindow(item.starts_at, item.ends_at)}
              </span>,
              <span key="val" className="text-xs font-semibold text-[var(--tx)]">
                {formatDiscountValue(item)}
              </span>,
              <span
                key="per"
                className="max-w-[160px] truncate text-xs text-[var(--mu)]"
              >
                {discountPeriodsLabel(item)}
              </span>,
              <span key="red" className="text-xs text-[var(--tx)]">
                {item.redemptions_count.toLocaleString()}
              </span>,
              <TableStatusBadge
                key="st"
                label={discountStatusLabel(item.status)}
                tone={discountStatusTone(item.status)}
              />,
            ]}
          />
        )}
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
