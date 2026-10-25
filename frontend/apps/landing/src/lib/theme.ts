import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'
const KEY = 'kura-theme'

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

function system(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Follows the phone's setting until the visitor picks one; the choice is
 * remembered. index.html applies it before first paint (no flash).
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as Theme) || stored() || system())
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (stored()) return
      const next = system()
      document.documentElement.dataset.theme = next
      setTheme(next)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.dataset.theme = next
      try {
        localStorage.setItem(KEY, next)
      } catch {
        // private mode: the choice lasts for this visit only
      }
      return next
    })
  }, [])

  return { theme, toggle }
}
