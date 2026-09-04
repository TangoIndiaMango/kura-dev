import { useState } from 'react'
import { useDebouncedValue } from '@mantine/hooks'

export const SEARCH_DEBOUNCE_MS = 400

/** Immediate input value + debounced value for API requests. */
export function useDebouncedSearch(delayMs = SEARCH_DEBOUNCE_MS) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch] = useDebouncedValue(searchQuery, delayMs)

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearch: debouncedSearch.trim(),
  }
}
