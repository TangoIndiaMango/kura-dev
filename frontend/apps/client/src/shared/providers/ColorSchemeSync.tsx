import { useEffect } from 'react'
import { useMantineColorScheme } from '@mantine/core'

/** Keeps html[data-mantine-color-scheme] in sync for CSS variable themes. */
export function ColorSchemeSync() {
  const { colorScheme } = useMantineColorScheme()
  const resolved = colorScheme === 'auto' ? 'dark' : colorScheme

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-mantine-color-scheme',
      resolved,
    )
    document.documentElement.style.colorScheme = resolved
  }, [resolved])

  return null
}
