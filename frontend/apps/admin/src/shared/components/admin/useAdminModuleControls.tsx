import { useMemo, type ReactNode } from 'react'
import dayjs from 'dayjs'
import { DateRangePicker } from '../date-range/DateRangePicker'
import type { DateRangeOutput } from '../date-range/date-range.utils'
import { TableFilterModal } from '../table-filter/TableFilterModal'
import { buildGeneralTableFilters } from '../table-filter/build-general-table-filters'
import { useTableFilterModal } from '../table-filter/use-table-filter-modal'
import type {
  TableFilterFieldConfig,
  TableFilterValues,
} from '../table-filter/types'
import type { TablePaginationConfig } from '../table/types'
import { useTableFilters } from '../../hooks/table-filters/use-table-filters'
import { useSearchDraft } from '../../hooks/table-filters/use-search-draft'
import {
  createScopedFilters,
  createScopedTableFilterFields,
  scopeFilterKey,
} from '../../utils/table-filters/create-scoped-filters'

export interface AdminModuleControlsOptions {
  /** URL namespace so module filters don’t collide (e.g. `hubs`). */
  scope: string
  statusOptions: { value: string; label: string }[]
  filterTitle?: string
  includeDateRangeInFilter?: boolean
  includeNameSort?: boolean
  includeValueSort?: boolean
  /** Module-level overview date range (URL-scoped). */
  showDateRange?: boolean
  /** Rows per page for list tables. Default 10. */
  pageSize?: number
  /**
   * Extra drawer fields (duty, telemetry, SOH band, etc.).
   * Prefer these over page tabs when the table anatomy does not change.
   */
  extraFilterFields?: TableFilterFieldConfig[]
}

export function defaultModuleDateRange(): DateRangeOutput {
  return {
    start_date: dayjs().startOf('month').format('YYYY-MM-DD'),
    end_date: dayjs().endOf('month').format('YYYY-MM-DD'),
  }
}

function readScopedFilter(
  values: TableFilterValues,
  logicalKey: string,
): unknown {
  if (logicalKey in values) return values[logicalKey]
  const key = Object.keys(values).find(
    (k) => k === logicalKey || k.endsWith(`_${logicalKey}`),
  )
  return key ? values[key] : null
}

/** Resolve a scoped drawer value (`operators_status` or `status`) for API params. */
export function readAdminFilter(
  values: TableFilterValues | Record<string, unknown>,
  logicalKey: string,
): string | undefined {
  const raw = readScopedFilter(values as TableFilterValues, logicalKey)
  if (raw == null || raw === '' || raw === 'all') return undefined
  if (Array.isArray(raw)) return raw.length ? String(raw[0]) : undefined
  return String(raw)
}

/** True when no status filter is set, or the row status is included. */
export function matchesStatusFilter(
  values: TableFilterValues,
  status: string,
): boolean {
  const raw = readScopedFilter(values, 'status')
  if (raw == null || raw === '') return true
  if (Array.isArray(raw)) return raw.length === 0 || raw.includes(status)
  return String(raw) === status
}

/** Match a select / multiCheckbox filter by logical key (works with scoped URL keys). */
export function matchesSelectFilter(
  values: TableFilterValues,
  logicalKey: string,
  candidate: string,
): boolean {
  const raw = readScopedFilter(values, logicalKey)
  if (raw == null || raw === '') return true
  if (Array.isArray(raw)) return raw.length === 0 || raw.includes(candidate)
  return String(raw) === candidate
}

export function sliceTablePage<T>(
  rows: T[],
  page: number,
  pageSize: number,
): { pageRows: T[]; totalPages: number; safePage: number } {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    pageRows: rows.slice(start, start + pageSize),
    totalPages,
    safePage,
  }
}

/**
 * NHEF-style list controls: scoped URL search/page/dateRange + filter drawer.
 * Each `scope` owns its own query keys so hubs never bleed into swaps.
 */
export function useAdminModuleControls(options: AdminModuleControlsOptions) {
  const {
    scope,
    statusOptions,
    filterTitle = 'Filter table data',
    includeDateRangeInFilter = true,
    includeNameSort = true,
    includeValueSort = false,
    showDateRange = true,
    pageSize = 10,
    extraFilterFields = [],
  } = options

  const listConfig = useMemo(
    () =>
      createScopedFilters(scope, {
        search: true,
        page: true,
        ...(showDateRange
          ? { dateRange: { defaultValue: defaultModuleDateRange() } }
          : {}),
      }),
    [scope, showDateRange],
  )

  const list = useTableFilters(listConfig)
  const searchDraft = useSearchDraft({
    search: list.search,
    setSearch: list.setSearch,
  })

  const fields = useMemo(() => {
    const base = buildGeneralTableFilters(statusOptions, {
      scope,
      includeDateRange: includeDateRangeInFilter,
      includeNameSort,
      includeValueSort,
      includeStatus: statusOptions.length > 0,
    })
    if (extraFilterFields.length === 0) return base
    const extras = createScopedTableFilterFields(scope, extraFilterFields)
    const statusIdx = base.findIndex(
      (f) => f.key === scopeFilterKey(scope, 'status') || f.key === 'status',
    )
    if (statusIdx >= 0) {
      return [
        ...base.slice(0, statusIdx + 1),
        ...extras,
        ...base.slice(statusIdx + 1),
      ]
    }
    return [...extras, ...base]
  }, [
    scope,
    statusOptions,
    includeDateRangeInFilter,
    includeNameSort,
    includeValueSort,
    extraFilterFields,
  ])

  const pageKey = scopeFilterKey(scope, 'page')
  const tableFilter = useTableFilterModal(fields, { resetPageKey: pageKey })

  const effectiveDateRange: DateRangeOutput =
    list.dateRange.start_date || list.dateRange.end_date
      ? list.dateRange
      : defaultModuleDateRange()

  const dateRangeSlot: ReactNode = showDateRange ? (
    <DateRangePicker date={effectiveDateRange} onChange={list.setDateRange} />
  ) : null

  const filterModal: ReactNode = (
    <TableFilterModal {...tableFilter.modalProps} title={filterTitle} />
  )

  const paginate = <T,>(rows: T[]) => {
    const { pageRows, totalPages, safePage } = sliceTablePage(
      rows,
      list.page,
      pageSize,
    )
    const pagination: TablePaginationConfig = {
      page: safePage,
      totalPages,
      onPageChange: list.setPage,
      variant: 'controls',
      pageSize: String(pageSize).padStart(2, '0'),
      hasNext: safePage < totalPages,
      hasPrevious: safePage > 1,
    }
    return { pageRows, pagination, totalPages, page: safePage }
  }

  return {
    scope,
    pageSize,
    dateRange: effectiveDateRange,
    setDateRange: list.setDateRange,
    dateRangeSlot,
    searchQuery: searchDraft.searchQuery,
    setSearchQuery: searchDraft.setSearchQuery,
    search: list.search,
    page: list.page,
    setPage: list.setPage,
    paginate,
    openFilter: tableFilter.open,
    filterModal,
    filterValues: tableFilter.values,
    applyFilters: tableFilter.apply,
    resetFilters: tableFilter.reset,
    getFilter: (logicalKey: string) =>
      readAdminFilter(tableFilter.values, logicalKey),
    matchesStatus: (status: string) =>
      matchesStatusFilter(tableFilter.values, status),
    matchesFilter: (logicalKey: string, candidate: string) =>
      matchesSelectFilter(tableFilter.values, logicalKey, candidate),
  }
}
