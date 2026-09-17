import { Box, List, Text, ThemeIcon } from '@mantine/core'

interface SidebarTipsListProps {
  tips: string[]
}

/** Tips under form aside — must stay readable on light and dark `--prs`. */
export function SidebarTipsList({ tips }: SidebarTipsListProps) {
  return (
    <div>
      <Text fw={700} size="sm" mb="sm" className="text-[var(--tx)]">
        Tips
      </Text>
      <List
        spacing="sm"
        size="sm"
        className="[&_.mantine-List-itemLabel]:text-[color-mix(in_srgb,var(--tx)_82%,var(--mu))] [&_.mantine-List-itemLabel]:leading-relaxed"
        icon={
          <ThemeIcon size={6} radius="xl" color="brand.6" mt={6}>
            <Box />
          </ThemeIcon>
        }
      >
        {tips.map((tip) => (
          <List.Item key={tip}>{tip}</List.Item>
        ))}
      </List>
    </div>
  )
}
