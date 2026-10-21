import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildPagePagination } from '@shared/utils/cursor-pagination'
import { Button, Skeleton } from '@mantine/core'
import { PlusSignIcon } from 'hugeicons-react'
import {
  AdminModuleLayout,
  AdminDonutChart,
  ADMIN_CHART_COLORS,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
  type TableHeader,
  LoadingState,
} from '@shared/components'
import { downloadCsv } from '@shared/utils/downloadCsv'
import { FeatureMasterSwitch } from '@features/platform-config'
import { useOffers } from './hooks/use-offers'
import { offerTone, offerTypeBlurb, offerTypeLabel } from './offerHelpers'
import type { OfferListApi } from './types'

const HEADERS: TableHeader[] = [
  { key: 'name', label: 'OFFER' },
  { key: 'type', label: 'TYPE' },
  { key: 'summary', label: 'SUMMARY' },
  { key: 'created', label: 'CREATED' },
  { key: 'status', label: 'STATUS' },
]

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active — live in Wallet' },
  { value: 'PAUSED', label: 'Paused — hidden from new applies' },
  { value: 'DRAFT', label: 'Draft — not published' },
  { value: 'ENDED', label: 'Ended' },
]

const TYPE_OPTIONS = [
  { value: 'CREDIT', label: 'Credit' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'FINANCING', label: 'Financing' },
]

export function OffersPanel() {
  const navigate = useNavigate()
  const controls = useAdminModuleControls({
    scope: 'offers',
    statusOptions: STATUS_OPTIONS,
    extraFilterFields: [
      {
        type: 'select',
        key: 'type',
        label: 'Product type',
        placeholder: 'Any type',
        options: TYPE_OPTIONS,
      },
    ],
    filterTitle: 'Filter offers',
  })

  const statusFilter =
    controls.getFilter('status')

  const { offers, isPending, isPlaceholderData, count, totalPages } = useOffers({
    page: controls.page,
    page_size: controls.pageSize,
    status: statusFilter,
    search: controls.search || undefined,
  })

  const rows = useMemo(() => {
    return offers.filter((o) => controls.matchesFilter('type', o.offer_type))
  }, [offers, controls.filterValues])

  const active = offers.filter((o) => o.status === 'ACTIVE').length
  const paused = offers.filter((o) => o.status === 'PAUSED').length
  const draft = offers.filter((o) => o.status === 'DRAFT').length

  const statusDonut = [
    { name: 'Active', value: active || 0, color: ADMIN_CHART_COLORS.teal },
    { name: 'Paused', value: paused || 0, color: ADMIN_CHART_COLORS.amber },
    { name: 'Draft', value: draft || 0, color: ADMIN_CHART_COLORS.navy },
  ]

  return (
    <>
      <AdminModuleLayout
        title="Product Offers"
        subtitle="Credit, insurance, and financing for segments — not discount codes."
        dateRangeSlot={controls.dateRangeSlot}
        kpis={[
          {
            title: 'Catalog',
            value: isPending ? '—' : count,
            sub: 'All product types',
          },
          {
            title: 'Live in Wallet',
            value: isPending ? '—' : active,
            tone: 'success',
            sub: 'ACTIVE status',
          },
          {
            title: 'Paused',
            value: isPending ? '—' : paused,
            tone: 'warning',
            sub: 'Hidden from new applies',
          },
          {
            title: 'Draft',
            value: isPending ? '—' : draft,
            sub: 'Not published',
          },
        ]}
        chartsSlot={
          <div className="rounded-[12px] border border-[var(--bd)] bg-[var(--sf)] p-4 shadow-[var(--sh)] lg:max-w-md">
            <h3 className="mb-1 text-[14px] font-bold text-[var(--tx)]">
              Catalog mix
            </h3>
            <p className="mb-2 text-[12px] text-[var(--mu)]">By status (page)</p>
            {isPending ? (
              <Skeleton height={200} radius="md" />
            ) : (
              <AdminDonutChart
                data={statusDonut}
                height={200}
                centerValue={active}
                centerLabel="Active"
              />
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-4 p-4 pb-0">
          <FeatureMasterSwitch
            namespace="offers"
            title="Allow Offers"
            description="Master switch for product offers. Propose → second admin approves. Off by default."
          />
        </div>
        {isPending ? (
          <LoadingState cols={6} rows={8} />
        ) : (
          <DynamicTableSection<OfferListApi>
            variant="embedded"
            headers={HEADERS}
            data={rows}
            pagination={buildPagePagination({
              page: controls.page,
              setPage: controls.setPage,
              totalPages,
              isPlaceholderData,
              pageSize: controls.pageSize,
            })}
            getRowKey={(item) => item.id}
            toolbar={{
              title: 'All offers',
              searchQuery: controls.searchQuery,
              onSearchChange: controls.setSearchQuery,
              searchPlaceholder: 'Search name, type, summary…',
              onFilter: controls.openFilter,
              showFilter: true,
              showExport: true,
              onExport: () =>
                downloadCsv(
                  'offers.csv',
                  ['name', 'type', 'summary', 'status', 'created_at'],
                  rows.map((o) => [
                    o.name,
                    o.offer_type,
                    o.summary,
                    o.status,
                    o.created_at,
                  ]),
                ),
              actions: (
                <Button
                  leftSection={<PlusSignIcon size={16} />}
                  className="bg-[var(--pr)] hover:opacity-90"
                  onClick={() => navigate('/offers/new')}
                >
                  New offer
                </Button>
              ),
            }}
            onRowClick={(item) => navigate(`/offers/${item.id}`)}
            renderItems={(item) => [
              <div key="name" className="min-w-0">
                <p className="text-xs font-bold text-[var(--tx)]">{item.name}</p>
                <p className="mt-0.5 truncate text-[10.5px] text-[var(--mu)]">
                  {item.summary || '—'}
                </p>
              </div>,
              <div key="type" className="min-w-0">
                <p className="text-xs font-semibold text-[var(--tx)]">
                  {offerTypeLabel(item.offer_type)}
                </p>
                <p className="mt-0.5 text-[10.5px] text-[var(--mu)]">
                  {offerTypeBlurb(item.offer_type)}
                </p>
              </div>,
              <span key="sum" className="max-w-[14rem] truncate text-xs text-[var(--tx)]">
                {item.summary || '—'}
              </span>,
              <span key="created" className="text-xs text-[var(--mu)]">
                {new Date(item.created_at).toLocaleDateString()}
              </span>,
              <TableStatusBadge
                key="st"
                label={item.status}
                tone={offerTone(item.status)}
              />,
            ]}
          />
        )}
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
