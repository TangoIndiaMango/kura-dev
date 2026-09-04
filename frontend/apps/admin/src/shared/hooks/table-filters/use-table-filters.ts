import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { DateRangeOutput } from '../../components/date-range'
import {
  patchTableFilters,
  readTableFilters,
  toDateRangeOutput,
  type TableFilterFieldConfig,
  type TableFilterPatch,
} from '../../utils/table-filters'

/**
 * URL-backed table filters. Pass a stable config (module-level constant).
 */
export function useTableFilters<TTab extends string = string>(
  config: TableFilterFieldConfig<TTab>,
) {
  const [searchParams, setSearchParams] = useSearchParams()

  const state = useMemo(
    () => readTableFilters(searchParams, config),
    // config is expected to be stable (module-level / useMemo in caller)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- schema is declarative
    [searchParams],
  )

  const patch = useCallback(
    (next: TableFilterPatch<TTab>, replace = false) => {
      setSearchParams(
        (current) => patchTableFilters(current, config, next),
        { replace },
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- schema is declarative
    [setSearchParams],
  )

  const setTab = useCallback(
    (tab: TTab) => {
      if (!config.tab) return
      const clearSearch = config.tab.clearSearchOnChange !== false
      patch({
        tab,
        page: 1,
        ...(clearSearch ? { search: '' } : {}),
      })
    },
    [config.tab, patch],
  )

  const setSearch = useCallback(
    (search: string, replace = true) => {
      if (!config.search) return
      patch({ search, page: 1 }, replace)
    },
    [config.search, patch],
  )

  const setPage = useCallback(
    (page: number) => {
      if (!config.page) return
      patch({ page })
    },
    [config.page, patch],
  )

  const setDateRange = useCallback(
    (value: DateRangeOutput) => {
      if (!config.dateRange) return
      patch({
        start_date: value.start_date,
        end_date: value.end_date,
        page: 1,
      })
    },
    [config.dateRange, patch],
  )

  const dateRange = useMemo(
    () => toDateRangeOutput(state),
    [state.end_date, state.start_date],
  )

  return {
    tab: state.tab,
    search: state.search,
    page: state.page,
    dateRange,
    patch,
    setTab,
    setSearch,
    setPage,
    setDateRange,
  }
}
