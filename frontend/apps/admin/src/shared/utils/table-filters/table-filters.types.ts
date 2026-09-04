import type { DateRangeOutput } from '../../components/date-range'

export const DEFAULT_TABLE_FILTER_KEYS = {
  tab: 'tab',
  search: 'search',
  page: 'page',
  startDate: 'start_date',
  endDate: 'end_date',
} as const

export const DEFAULT_TABLE_PAGE = 1

export interface TableFilterFieldConfig<TTab extends string = string> {
  tab?: {
    key?: string
    defaultValue: TTab
    parse?: (value: string | null) => TTab
    /** Clear search when tab changes. Default: true. */
    clearSearchOnChange?: boolean
  }
  search?: {
    key?: string
  } | true
  page?: {
    key?: string
    defaultValue?: number
  } | true
  dateRange?: {
    startKey?: string
    endKey?: string
    defaultValue?: DateRangeOutput
  } | true
}

export interface TableFilterState<TTab extends string = string> {
  tab: TTab
  search: string
  page: number
  start_date: string
  end_date: string
}

export type TableFilterPatch<TTab extends string = string> = Partial<{
  tab: TTab
  search: string
  page: number
  start_date: string
  end_date: string
}>

export interface ResolvedTableFilterKeys {
  tab: string
  search: string
  page: string
  startDate: string
  endDate: string
}

export interface ListQueryParams {
  search?: string
  page?: number
  per_page?: number
  start_date?: string
  end_date?: string
  sort_by?: string
  sort_direction?: 'ASC' | 'DESC'
}
