import { Box, Group, Text, UnstyledButton } from '@mantine/core'

export interface UnderlineTabItem<T extends string> {
  id: T
  label: string
}

interface UnderlineTabsProps<T extends string> {
  tabs: readonly UnderlineTabItem<T>[]
  activeTab: T
  onTabChange: (tab: T) => void
  px?: number | string
}

const ACTIVE_TAB_BORDER = '2px solid var(--mantine-color-brand-6)'
const INACTIVE_TAB_BORDER = '2px solid transparent'

export function UnderlineTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  px = 0,
}: UnderlineTabsProps<T>) {
  return (
    <Box pos="relative" px={px}>
      <Box pos="absolute" left={0} right={0} bottom={0} h={1} bg="gray.2" />
      <Group gap={0} pos="relative">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <UnstyledButton
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              px="md"
              py="sm"
              style={{
                position: 'relative',
                zIndex: 1,
                borderBottom: isActive ? ACTIVE_TAB_BORDER : INACTIVE_TAB_BORDER,
              }}
            >
              <Text fz="sm" c="dark.7" fw={isActive ? 600 : 400}>
                {tab.label}
              </Text>
            </UnstyledButton>
          )
        })}
      </Group>
    </Box>
  )
}
