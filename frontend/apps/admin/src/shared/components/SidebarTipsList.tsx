import { Box, List, ThemeIcon } from '@mantine/core'

interface SidebarTipsListProps {
  tips: string[]
}

export function SidebarTipsList({ tips }: SidebarTipsListProps) {
  return (
    <List
      spacing="sm"
      size="sm"
      c="gray.7"
      icon={
        <ThemeIcon size={6} radius="xl" color="brand.6">
          <Box />
        </ThemeIcon>
      }
    >
      {tips.map((tip) => (
        <List.Item key={tip}>{tip}</List.Item>
      ))}
    </List>
  )
}
