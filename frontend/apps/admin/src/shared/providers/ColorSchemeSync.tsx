import { useEffect } from 'react'
import { useMantineColorScheme } from '@mantine/core'

/**
 * Keeps html[data-mantine-color-scheme], data-theme, and .dark in sync
 * so admin CSS vars (--bg, --sf, …) follow Mantine color scheme.
 */
export function ColorSchemeSync() {
  const { colorScheme } = useMantineColorScheme()
  const resolved = colorScheme === 'auto' ? 'light' : colorScheme

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-mantine-color-scheme', resolved)
    root.setAttribute('data-theme', resolved)
    root.style.colorScheme = resolved

    if (resolved === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [resolved])

  return null
}
