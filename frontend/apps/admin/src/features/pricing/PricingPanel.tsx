import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Skeleton } from '@mantine/core'
import { PlusSignIcon } from 'hugeicons-react'
import {
  AdminModuleLayout,
  DynamicTableSection,
  TableStatusBadge,
  useAdminModuleControls,
} from '@shared/components'
import type { PriceRecord } from '@shared/mock/adminMockData'
import { formatNaira } from '@shared/utils/currency'
import { usePriceMatrices } from './hooks/use-pricing'
import { matrixApiToRecord } from './matrixLiveMap'
import {
  PRICE_HEADERS,
  PRICE_STATUS_OPTIONS,
  priceStatusLabel,
  priceTone,
} from './pricingPanelMeta'

export function PricingPanel() {
  const navigate = useNavigate()
  const {
    matrices,
    isPending: matricesPending,
    isError: matricesError,
  } = usePriceMatrices({ page: 1, page_size: 100 })
  const prices = useMemo(() => matrices.map(matrixApiToRecord), [matrices])

  const controls = useAdminModuleControls({
    scope: 'pricing',
    statusOptions: PRICE_STATUS_OPTIONS,
    filterTitle: 'Filter tariffs',
  })

  const filteredPrices = useMemo(() => {
    const q = controls.search.toLowerCase()
    return prices.filter(
      (p) =>
        controls.matchesStatus(p.status) &&
        p.vehicleType.toLowerCase().includes(q),
    )
  }, [prices, controls.search, controls.filterValues])

  const { pageRows, pagination } = controls.paginate(filteredPrices)

  const pendingSignOff = prices.filter((p) => p.status === 'PENDING').length
  const active = prices.filter((p) => p.status === 'ACTIVE').length
  const superseded = prices.filter((p) => p.status === 'SUPERSEDED').length

  return (
    <>
      <AdminModuleLayout
        title="Tariffs"
        subtitle="Price matrices by vehicle type. Propose a change to queue PENDING sign-off."
        dateRangeSlot={controls.dateRangeSlot}
        kpis={[
          {
            title: 'Price rows',
            value: String(prices.length),
            sub: 'All matrices',
            tone: 'default',
          },
          {
            title: 'Pending sign-off',
            value: String(pendingSignOff),
            sub: 'Awaiting activation',
            tone: 'warning',
          },
          {
            title: 'Active',
            value: String(active),
            sub: 'Live vehicle classes',
            tone: 'default',
          },
          {
            title: 'Superseded',
            value: String(superseded),
            sub: 'Replaced matrices',
            tone: 'default',
          },
        ]}
      >
        {matricesPending ? (
          <Skeleton height={280} radius="md" />
        ) : matricesError ? (
          <p className="text-[13px] text-[var(--mu)]">
            Could not load price matrices. Check tariffs:manage and retry.
          </p>
        ) : (
          <DynamicTableSection<PriceRecord>
            variant="embedded"
            headers={PRICE_HEADERS}
            data={pageRows}
            pagination={pagination}
            getRowKey={(item) => item.id}
            emptyTitle="No price matrices"
            emptyMessage="Add a tariff row to queue dual-control activation."
            toolbar={{
              title: 'Pricing matrix',
              searchQuery: controls.searchQuery,
              onSearchChange: controls.setSearchQuery,
              searchPlaceholder: 'Search vehicle type…',
              onFilter: controls.openFilter,
              showFilter: true,
              actions: (
                <Button
                  leftSection={<PlusSignIcon size={16} />}
                  className="bg-[var(--pr)] hover:opacity-90"
                  onClick={() => navigate('/pricing/new')}
                >
                  Add New Price
                </Button>
              ),
            }}
            onRowClick={(item) => navigate(`/pricing/${item.id}`)}
            renderItems={(item) => [
              <span key="vt" className="text-xs font-bold text-[var(--tx)]">
                {item.vehicleType}
              </span>,
              <span key="d" className="font-mono text-xs text-[var(--tx)]">
                {formatNaira(item.daily)}
              </span>,
              <span key="w" className="font-mono text-xs text-[var(--tx)]">
                {formatNaira(item.weekly)}
              </span>,
              <span key="m" className="font-mono text-xs text-[var(--tx)]">
                {formatNaira(item.monthly)}
              </span>,
              <span key="p" className="font-mono text-xs font-bold text-[var(--pr)]">
                {formatNaira(item.payPerSwap)}
              </span>,
              <span key="eff" className="text-xs text-[var(--mu)]">
                {item.effectiveDate}
              </span>,
              <TableStatusBadge
                key="st"
                label={priceStatusLabel(item.status)}
                tone={priceTone(item.status)}
              />,
            ]}
          />
        )}
      </AdminModuleLayout>
      {controls.filterModal}
    </>
  )
}
