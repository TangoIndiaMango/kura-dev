import type { DateRangeOutput } from '../../components/date-range'
import {
  DEFAULT_TABLE_FILTER_KEYS,
  DEFAULT_TABLE_PAGE,
  type ResolvedTableFilterKeys,
  type TableFilterFieldConfig,
  type TableFilterPatch,
  type TableFilterState,
} from './table-filters.types'

export function resolveTableFilterKeys(
  config: TableFilterFieldConfig,
): ResolvedTableFilterKeys {
  const search = config.search === true ? {} : (config.search ?? {})
  const page = config.page === true ? {} : (config.page ?? {})
  const dateRange =
    config.dateRange === true ? {} : (config.dateRange ?? {})

  return {
    tab: config.tab?.key ?? DEFAULT_TABLE_FILTER_KEYS.tab,
    search: search.key ?? DEFAULT_TABLE_FILTER_KEYS.search,
    page: page.key ?? DEFAULT_TABLE_FILTER_KEYS.page,
    startDate: dateRange.startKey ?? DEFAULT_TABLE_FILTER_KEYS.startDate,
    endDate: dateRange.endKey ?? DEFAULT_TABLE_FILTER_KEYS.endDate,
  }
}

export function parseTablePage(
  value: string | null,
  defaultPage = DEFAULT_TABLE_PAGE,
): number {
  const page = Number(value)
  if (!Number.isFinite(page) || page < 1) return defaultPage
  return Math.floor(page)
}

export function readTableFilters<TTab extends string>(
  params: URLSearchParams,
  config: TableFilterFieldConfig<TTab>,
): TableFilterState<TTab> {
  const keys = resolveTableFilterKeys(config)
  const defaultPage =
    config.page === true
      ? DEFAULT_TABLE_PAGE
      : (config.page?.defaultValue ?? DEFAULT_TABLE_PAGE)
  const defaultDates =
    config.dateRange === true
      ? { start_date: '', end_date: '' }
      : (config.dateRange?.defaultValue ?? {
          start_date: '',
          end_date: '',
        })

  const defaultTab = (config.tab?.defaultValue ?? '') as TTab
  const parseTab = config.tab?.parse ?? ((value: string | null) => (value ?? defaultTab) as TTab)

  return {
    tab: config.tab ? parseTab(params.get(keys.tab)) : defaultTab,
    search: config.search
      ? (params.get(keys.search)?.trim() ?? '')
      : '',
    page: config.page
      ? parseTablePage(params.get(keys.page), defaultPage)
      : defaultPage,
    start_date: config.dateRange
      ? (params.get(keys.startDate) ?? defaultDates.start_date)
      : defaultDates.start_date,
    end_date: config.dateRange
      ? (params.get(keys.endDate) ?? defaultDates.end_date)
      : defaultDates.end_date,
  }
}

/**
 * Patch URL params for table filters.
 * Empty / default values are omitted so shareable links stay clean.
 */
export function patchTableFilters<TTab extends string>(
  current: URLSearchParams,
  config: TableFilterFieldConfig<TTab>,
  patch: TableFilterPatch<TTab>,
): URLSearchParams {
  const next = new URLSearchParams(current)
  const keys = resolveTableFilterKeys(config)
  const state = { ...readTableFilters(current, config), ...patch }
  const defaultPage =
    config.page === true
      ? DEFAULT_TABLE_PAGE
      : (config.page?.defaultValue ?? DEFAULT_TABLE_PAGE)

  if (config.tab) {
    writeParam(
      next,
      keys.tab,
      state.tab === config.tab.defaultValue ? '' : state.tab,
    )
  }

  if (config.search) {
    writeParam(next, keys.search, state.search.trim())
  }

  if (config.page) {
    writeParam(
      next,
      keys.page,
      state.page <= defaultPage ? '' : String(state.page),
    )
  }

  if (config.dateRange) {
    writeParam(next, keys.startDate, state.start_date)
    writeParam(next, keys.endDate, state.end_date)
  }

  return next
}

export function writeParam(
  params: URLSearchParams,
  key: string,
  value: string,
) {
  if (!value) {
    params.delete(key)
    return
  }
  params.set(key, value)
}

export function toDateRangeOutput(
  state: Pick<TableFilterState, 'start_date' | 'end_date'>,
): DateRangeOutput {
  return {
    start_date: state.start_date,
    end_date: state.end_date,
  }
}
