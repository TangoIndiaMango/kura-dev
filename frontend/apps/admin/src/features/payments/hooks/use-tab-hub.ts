import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useHubs } from '@features/hubs/hooks/use-hubs'

/** URL key that holds one Payments tab's hub (`<key>_label` keeps its name). */
export type TabHubKey = 'hub' | 'cash_hub'

/**
 * Hub pickers for the Payments page. Each tab keeps its own hub in the URL so
 * a filter set on one tab never silently narrows another.
 */
export function useTabHubs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { hubs } = useHubs({ page_size: 200 })
  const hubOptions = useMemo(
    () => hubs.map((h) => ({ value: h.id, label: h.name })),
    [hubs],
  )

  const hubOf = (key: TabHubKey) => searchParams.get(key)?.trim() || undefined

  // A hub opened from a link stays labelled even before the hub list loads.
  const optionsFor = (key: TabHubKey) => {
    const id = hubOf(key)
    const label = searchParams.get(`${key}_label`)?.trim()
    return id && !hubOptions.some((o) => o.value === id)
      ? [...hubOptions, { value: id, label: label ?? 'Selected hub' }]
      : hubOptions
  }

  const setHub = (key: TabHubKey, id: string | null, label: string | null) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (id) {
          next.set(key, id)
          if (label) next.set(`${key}_label`, label)
        } else {
          next.delete(key)
          next.delete(`${key}_label`)
        }
        return next
      },
      { replace: true },
    )

  return { hubOf, optionsFor, setHub }
}
