import type { DateRangeOutput } from '../date-range'
import { createEmptyFilterValues } from './TableFilterFields'
import type {
  TableFilterDateRangeField,
  TableFilterFieldConfig,
  TableFilterValue,
  TableFilterValues,
} from './types'

const DEFAULT_DATE_START_KEY = 'start_date'
const DEFAULT_DATE_END_KEY = 'end_date'

function dateRangeParamKeys(field: TableFilterDateRangeField): [string, string] {
  return [
    field.startKey ?? DEFAULT_DATE_START_KEY,
    field.endKey ?? DEFAULT_DATE_END_KEY,
  ]
}

function paramKeyForField(field: TableFilterFieldConfig): string[] {
  if (field.type === 'dateRange') return dateRangeParamKeys(field)
  return [field.key]
}

export function filterParamKeys(fields: TableFilterFieldConfig[]): string[] {
  return [...new Set(fields.flatMap(paramKeyForField))]
}

export function readFilterValuesFromParams(
  fields: TableFilterFieldConfig[],
  params: URLSearchParams,
): TableFilterValues {
  const values = createEmptyFilterValues(fields)

  for (const field of fields) {
    if (field.type === 'select') {
      const raw = params.get(field.key)
      values[field.key] = raw && raw.length > 0 ? raw : null
      continue
    }

    if (field.type === 'multiCheckbox') {
      const raw = params.get(field.key)
      values[field.key] = raw
        ? raw.split(',').map((item) => item.trim()).filter(Boolean)
        : []
      continue
    }

    if (field.type === 'dateRange') {
      const [startKey, endKey] = dateRangeParamKeys(field)
      values[field.key] = {
        start_date: params.get(startKey) ?? '',
        end_date: params.get(endKey) ?? '',
      }
      continue
    }

    if (field.type === 'sortOrder') {
      const raw = params.get(field.key)
      values[field.key] =
        raw === 'asc' || raw === 'desc' ? raw : null
    }
  }

  return values
}

function isEmptyValue(value: TableFilterValue): boolean {
  if (value == null) return true
  if (typeof value === 'string') return value.length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') {
    const range = value as DateRangeOutput
    return !range.start_date && !range.end_date
  }
  return false
}

/** Map a scoped URL field key back to its API/query param name. */
function apiParamKey(fieldKey: string): string {
  const known = ['status', 'nameSort', 'valueSort', 'crm_stage', 'sort_by'] as const
  for (const name of known) {
    if (fieldKey === name || fieldKey.endsWith(`_${name}`)) return name
  }
  return fieldKey
}

export interface WriteFilterValuesOptions {
  /** When set, clears this page param after apply (use scoped page keys from createScopedFilters). */
  resetPageKey?: string
}

export function writeFilterValuesToParams(
  fields: TableFilterFieldConfig[],
  values: TableFilterValues,
  current: URLSearchParams,
  options?: WriteFilterValuesOptions,
): URLSearchParams {
  const next = new URLSearchParams(current)

  for (const key of filterParamKeys(fields)) {
    next.delete(key)
  }

  for (const field of fields) {
    const value = values[field.key]
    if (isEmptyValue(value)) continue

    if (field.type === 'select' && typeof value === 'string') {
      next.set(field.key, value)
      continue
    }

    if (field.type === 'multiCheckbox' && Array.isArray(value)) {
      next.set(field.key, value.join(','))
      continue
    }

    if (field.type === 'dateRange') {
      const range = value as DateRangeOutput
      const [startKey, endKey] = dateRangeParamKeys(field)
      if (range.start_date) next.set(startKey, range.start_date)
      if (range.end_date) next.set(endKey, range.end_date)
      continue
    }

    if (field.type === 'sortOrder' && (value === 'asc' || value === 'desc')) {
      next.set(field.key, value)
    }
  }

  if (options?.resetPageKey) {
    next.delete(options.resetPageKey)
  }

  return next
}

export function clearFilterParams(
  fields: TableFilterFieldConfig[],
  current: URLSearchParams,
  options?: WriteFilterValuesOptions,
): URLSearchParams {
  return writeFilterValuesToParams(
    fields,
    createEmptyFilterValues(fields),
    current,
    options,
  )
}

export function toTableFilterQueryParams(
  fields: TableFilterFieldConfig[],
  values: TableFilterValues,
): Record<string, string> {
  const params: Record<string, string> = {}

  for (const field of fields) {
    const value = values[field.key]
    if (isEmptyValue(value)) continue

    if (field.type === 'select' && typeof value === 'string') {
      params[apiParamKey(field.key)] = value
      continue
    }

    if (field.type === 'multiCheckbox' && Array.isArray(value)) {
      params[apiParamKey(field.key)] = value.join(',')
      continue
    }

    if (field.type === 'dateRange') {
      const range = value as DateRangeOutput
      if (range.start_date) params.start_date = range.start_date
      if (range.end_date) params.end_date = range.end_date
      continue
    }

    if (field.type === 'sortOrder' && (value === 'asc' || value === 'desc')) {
      const logicalKey = apiParamKey(field.key)
      if (logicalKey === 'nameSort') {
        params.sort_by = 'name'
        params.sort_direction = value === 'asc' ? 'ASC' : 'DESC'
      } else if (logicalKey === 'valueSort') {
        params.sort_by = 'value'
        params.sort_direction = value === 'asc' ? 'ASC' : 'DESC'
      } else {
        params[field.key] = value
      }
    }
  }

  return params
}
