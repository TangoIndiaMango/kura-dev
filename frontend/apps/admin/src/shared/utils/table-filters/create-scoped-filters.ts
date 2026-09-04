import { DEFAULT_TABLE_PAGE } from './table-filters.types'
import type { TableFilterFieldConfig } from './table-filters.types'
import type { TableFilterFieldConfig as ModalFilterFieldConfig } from '../../components/table-filter/types'

/** Normalize scope segments into a URL-safe prefix (e.g. `programs.cohort` → `programs_cohort`). */
export function normalizeFilterScope(scope: string): string {
  return scope.trim().replace(/[.\-/]+/g, '_').replace(/_+/g, '_')
}

/** Build a scoped URL query key: `{scope}_{field}`. */
export function scopeFilterKey(scope: string, field: string): string {
  return `${normalizeFilterScope(scope)}_${field}`
}

/**
 * Prefix all table-filter URL keys with a module scope so filters do not leak
 * across routes. API query params (`start_date`, `page`, etc.) stay unchanged —
 * only browser URL keys are namespaced.
 */
export function createScopedFilters<TTab extends string = string>(
  scope: string,
  config: TableFilterFieldConfig<TTab>,
): TableFilterFieldConfig<TTab> {
  const result: TableFilterFieldConfig<TTab> = {}

  if (config.tab) {
    result.tab = {
      ...config.tab,
      key: scopeFilterKey(scope, 'tab'),
    }
  }

  if (config.search) {
    result.search =
      config.search === true
        ? { key: scopeFilterKey(scope, 'search') }
        : { ...config.search, key: scopeFilterKey(scope, 'search') }
  }

  if (config.page) {
    result.page =
      config.page === true
        ? { key: scopeFilterKey(scope, 'page'), defaultValue: DEFAULT_TABLE_PAGE }
        : {
            ...config.page,
            key: scopeFilterKey(scope, 'page'),
          }
  }

  if (config.dateRange) {
    result.dateRange =
      config.dateRange === true
        ? {
            startKey: scopeFilterKey(scope, 'start_date'),
            endKey: scopeFilterKey(scope, 'end_date'),
          }
        : {
            ...config.dateRange,
            startKey: scopeFilterKey(scope, 'start_date'),
            endKey: scopeFilterKey(scope, 'end_date'),
          }
  }

  return result
}

/** Prefix modal filter field keys (including date range start/end) with a scope. */
export function createScopedTableFilterFields(
  scope: string,
  fields: ModalFilterFieldConfig[],
): ModalFilterFieldConfig[] {
  return fields.map((field) => {
    if (field.type === 'dateRange') {
      return {
        ...field,
        startKey: scopeFilterKey(scope, 'start_date'),
        endKey: scopeFilterKey(scope, 'end_date'),
      }
    }

    return {
      ...field,
      key: scopeFilterKey(scope, field.key),
    }
  })
}
