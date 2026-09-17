import {
  Modal,
  Flex,
  Box,
  ActionIcon,
  Image,
  useMantineColorScheme,
} from '@mantine/core'
import { Cancel01Icon } from 'hugeicons-react'
import type { ReactNode } from 'react'

export interface IllustratedModalLayoutProps {
  opened: boolean
  onClose: () => void
  illustration: string | ReactNode
  /** Optional tint; defaults to theme-aware panel */
  illustrationBg?: string
  illustrationMaxWidth?: number
  children: ReactNode
  closeOnClickOutside?: boolean
  /** ~560 matches Admin Modal Illustrations action cards */
  size?: number | string
}

/**
 * Side illustrated shell (NHEF + KURA Admin hifi): tinted left panel + content.
 * Theme-aware for light/dark.
 */
export function IllustratedModalLayout({
  opened,
  onClose,
  illustration,
  illustrationBg,
  illustrationMaxWidth = 160,
  children,
  closeOnClickOutside = false,
  size = 560,
}: IllustratedModalLayoutProps) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme !== 'light'
  const panelBg =
    illustrationBg ?? (isDark ? 'var(--in)' : 'var(--prs)')

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      withCloseButton={false}
      padding={0}
      radius="lg"
      size={size}
      overlayProps={{ backgroundOpacity: 0.45, blur: 6 }}
      transitionProps={{ transition: 'pop', duration: 220 }}
      closeOnClickOutside={closeOnClickOutside}
      classNames={{
        content:
          'overflow-hidden border border-[var(--bd)] bg-[var(--sf)] text-[var(--tx)]',
      }}
    >
      <Flex direction={{ base: 'column', sm: 'row' }} mih={220}>
        <Flex
          align="center"
          justify="center"
          className="shrink-0 sm:w-[200px]"
          p="xl"
          style={{ background: panelBg }}
        >
          {typeof illustration === 'string' ? (
            <Image
              src={illustration}
              alt=""
              maw={illustrationMaxWidth}
              fit="contain"
            />
          ) : (
            illustration
          )}
        </Flex>

        <Box pos="relative" className="flex-1" p={{ base: 'lg', sm: 28 }}>
          <ActionIcon
            variant="subtle"
            color="gray"
            radius="md"
            size="md"
            onClick={onClose}
            aria-label="Close"
            pos="absolute"
            top={12}
            right={12}
            className="z-10"
          >
            <Cancel01Icon size={16} />
          </ActionIcon>

          {children}
        </Box>
      </Flex>
    </Modal>
  )
}
