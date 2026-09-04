import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createEmptyFilterValues } from './TableFilterFields'
import {
  clearFilterParams,
  readFilterValuesFromParams,
  toTableFilterQueryParams,
  writeFilterValuesToParams,
} from './table-filter-url'
import type {
  TableFilterFieldConfig,
  TableFilterValues,
} from './types'

export interface UseTableFilterModalOptions {
  /** Clears this page URL key when filters are applied or reset. */
  resetPageKey?: string
}

export function useTableFilterModal(
  fields: TableFilterFieldConfig[],
  options?: UseTableFilterModalOptions,
) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [opened, setOpened] = useState(false)

  const values = useMemo(
    () => readFilterValuesFromParams(fields, searchParams),
    [fields, searchParams],
  )

  const open = useCallback(() => setOpened(true), [])
  const close = useCallback(() => setOpened(false), [])

  const apply = useCallback(
    (next: TableFilterValues) => {
      setSearchParams(
        (current) =>
          writeFilterValuesToParams(fields, next, current, {
            resetPageKey: options?.resetPageKey,
          }),
        { replace: true },
      )
    },
    [fields, options?.resetPageKey, setSearchParams],
  )

  const reset = useCallback(() => {
    setSearchParams(
      (current) =>
        clearFilterParams(fields, current, {
          resetPageKey: options?.resetPageKey,
        }),
      { replace: true },
    )
  }, [fields, options?.resetPageKey, setSearchParams])

  const queryParams = useMemo(
    () => toTableFilterQueryParams(fields, values),
    [fields, values],
  )

  return {
    opened,
    open,
    close,
    values,
    apply,
    reset,
    queryParams,
    modalProps: {
      opened,
      onClose: close,
      fields,
      value: values,
      onApply: apply,
      onReset: reset,
    },
  }
}

export { toTableFilterQueryParams, createEmptyFilterValues }
