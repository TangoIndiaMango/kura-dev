import { createScopedTableFilterFields } from '../../utils/table-filters/create-scoped-filters'
import { NAME_SORT_OPTIONS, VALUE_SORT_OPTIONS } from './TableFilterFields'
import type { TableFilterFieldConfig } from './types'

export function buildGeneralTableFilters(
  statusOptions: { value: string; label: string }[],
  options?: {
    /** Namespace URL keys for this filter set (e.g. `campaigns.donations`). */
    scope?: string
    statusType?: 'select' | 'multiCheckbox'
    includeNameSort?: boolean
    includeValueSort?: boolean
    includeDateRange?: boolean
    includeStatus?: boolean
  },
): TableFilterFieldConfig[] {
  const {
    statusType = 'select',
    includeNameSort = true,
    includeValueSort = true,
    includeDateRange = true,
    includeStatus = true,
  } = options ?? {}

  const fields: TableFilterFieldConfig[] = []

  if (includeStatus) {
    if (statusType === 'multiCheckbox') {
      fields.push({
        type: 'multiCheckbox',
        key: 'status',
        label: 'Status',
        required: false,
        presentation: 'popover',
        placeholder: 'Select an Option',
        options: statusOptions,
      })
    } else {
      fields.push({
        type: 'select',
        key: 'status',
        label: 'Status',
        required: false,
        placeholder: 'Select an Option',
        options: statusOptions,
      })
    }
  }

  if (includeDateRange) {
    fields.push({
      type: 'dateRange',
      key: 'dateRange',
      label: 'Start Date - End Date',
      required: false,
      placeholder: 'DD/MM/YYYY - DD/MM/YYYY',
    })
  }

  if (includeNameSort) {
    fields.push({
      type: 'sortOrder',
      key: 'nameSort',
      label: 'Order Arrangement (Name)',
      required: false,
      options: NAME_SORT_OPTIONS,
    })
  }

  if (includeValueSort) {
    fields.push({
      type: 'sortOrder',
      key: 'valueSort',
      label: 'Order Arrangement (Value)',
      required: false,
      options: VALUE_SORT_OPTIONS,
    })
  }

  if (options?.scope) {
    return createScopedTableFilterFields(options.scope, fields)
  }

  return fields
}
