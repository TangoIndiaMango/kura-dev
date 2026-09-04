import { useEffect, useState } from 'react'
import { useDebouncedValue } from '@mantine/hooks'

/**
 * 1000ms: debounce must exceed slow typists’ inter-key interval (~300–800ms
 * for ~25–30 WPM / older adults) so search doesn’t fire mid-word.
 */
export const TABLE_SEARCH_DEBOUNCE_MS = 1000

interface UseSearchDraftOptions {
  search: string
  setSearch: (value: string, replace?: boolean) => void
  debounceMs?: number
}

export function useSearchDraft({
  search,
  setSearch,
  debounceMs = TABLE_SEARCH_DEBOUNCE_MS,
}: UseSearchDraftOptions) {
  const [draft, setDraft] = useState(search)
  const [debouncedDraft] = useDebouncedValue(draft, debounceMs)

  useEffect(() => {
    setDraft(search)
  }, [search])

  useEffect(() => {
    const next = debouncedDraft.trim()
    if (next === search.trim()) return
    setSearch(debouncedDraft)
  }, [debouncedDraft, search, setSearch])

  return {
    searchQuery: draft,
    setSearchQuery: setDraft,
  }
}
