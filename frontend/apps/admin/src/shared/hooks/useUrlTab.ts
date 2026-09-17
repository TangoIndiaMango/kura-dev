import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export type UseUrlTabOptions = {
  /** Query key. Default `tab`. */
  param?: string
  /** Allowed tab ids — unknown values fall back to default. */
  valid?: readonly string[]
  /**
   * `replace` (default) avoids flooding history on every tab click.
   * Set false if Back should walk through tabs.
   */
  replace?: boolean
}

/**
 * Keeps module / detail tabs in the URL (`?tab=…`) so refresh, share, and
 * deep-links restore the active pane instead of dropping to the default.
 */
export function useUrlTab(
  defaultTab: string,
  options: UseUrlTabOptions = {},
): readonly [string, (next: string) => void] {
  const param = options.param ?? 'tab'
  const replace = options.replace ?? true
  const [searchParams, setSearchParams] = useSearchParams()

  const raw = searchParams.get(param)
  const tab =
    raw && (!options.valid || options.valid.length === 0 || options.valid.includes(raw))
      ? raw
      : defaultTab

  const setTab = useCallback(
    (next: string) => {
      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev)
          if (!next || next === defaultTab) nextParams.delete(param)
          else nextParams.set(param, next)
          return nextParams
        },
        { replace },
      )
    },
    [defaultTab, param, replace, setSearchParams],
  )

  return [tab, setTab] as const
}
