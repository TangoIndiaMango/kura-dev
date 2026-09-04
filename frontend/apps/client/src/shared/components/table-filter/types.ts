import type { DateRangeOutput } from '../date-range'

export type TableFilterOption = {
  value: string
  label: string
}

export type TableFilterSortOption = {
  value: 'asc' | 'desc'
  label: string
}

type TableFilterFieldBase = {
  key: string
  label: string
  required?: boolean
}

export type TableFilterSelectField = TableFilterFieldBase & {
  type: 'select'
  placeholder?: string
  options: TableFilterOption[]
}

export type TableFilterMultiCheckboxField = TableFilterFieldBase & {
  type: 'multiCheckbox'
  options: TableFilterOption[]
  presentation?: 'popover' | 'inline'
  placeholder?: string
}

export type TableFilterDateRangeField = TableFilterFieldBase & {
  type: 'dateRange'
  placeholder?: string
  /** Scoped URL key for range start. Defaults to global `start_date` when omitted. */
  startKey?: string
  /** Scoped URL key for range end. Defaults to global `end_date` when omitted. */
  endKey?: string
}

export type TableFilterSortOrderField = TableFilterFieldBase & {
  type: 'sortOrder'
  options: [TableFilterSortOption, TableFilterSortOption]
}

export type TableFilterFieldConfig =
  | TableFilterSelectField
  | TableFilterMultiCheckboxField
  | TableFilterDateRangeField
  | TableFilterSortOrderField

export type TableFilterValue =
  | string
  | string[]
  | DateRangeOutput
  | 'asc'
  | 'desc'
  | null

export type TableFilterValues = Record<string, TableFilterValue>

export type TableFilterModalProps = {
  opened: boolean
  onClose: () => void
  fields: TableFilterFieldConfig[]
  value?: TableFilterValues
  onApply: (values: TableFilterValues) => void
  onReset?: () => void
  title?: string
  applyLabel?: string
  resetLabel?: string
}
