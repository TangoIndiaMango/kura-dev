import type { DateRangeOutput } from '../../components/date-range'
import type { ListQueryParams } from './table-filters.types'

/** Compact list/stats query object for API requests (omits empties). */
export function buildListQueryParams(
  params: ListQueryParams = {},
): Record<string, string | number> {
  const query: Record<string, string | number> = {}

  const search = params.search?.trim()
  if (search) query.search = search
  if (params.page != null) query.page = params.page
  if (params.per_page != null) query.per_page = params.per_page
  if (params.start_date) query.start_date = params.start_date
  if (params.end_date) query.end_date = params.end_date
  if (params.sort_by) query.sort_by = params.sort_by
  if (params.sort_direction) query.sort_direction = params.sort_direction

  return query
}

export function dateRangeToQuery(
  dateRange: DateRangeOutput,
): Pick<ListQueryParams, 'start_date' | 'end_date'> {
  return {
    ...(dateRange.start_date ? { start_date: dateRange.start_date } : {}),
    ...(dateRange.end_date ? { end_date: dateRange.end_date } : {}),
  }
}
