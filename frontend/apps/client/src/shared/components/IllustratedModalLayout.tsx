import {
  Modal,
  Flex,
  Box,
  ActionIcon,
  Image,
} from '@mantine/core'
import { Cancel01Icon } from 'hugeicons-react'
import type { MantineColor } from '@mantine/core'
import { themeColors } from '@/lib/config/theme'

export interface IllustratedModalLayoutProps {
  opened: boolean
  onClose: () => void
  illustration: string | React.ReactNode
  illustrationBg?: MantineColor
  illustrationMaxWidth?: number
  children: React.ReactNode
  closeOnClickOutside?: boolean
  zIndex?: number
}

export function IllustratedModalLayout({
  opened,
  onClose,
  illustration,
  illustrationBg = themeColors.lightGreenBg,
  illustrationMaxWidth = 220,
  children,
  closeOnClickOutside = false,
  zIndex,
}: IllustratedModalLayoutProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      withCloseButton={false}
      padding={0}
      radius="lg"
      size={700}
      zIndex={zIndex}
      overlayProps={{ backgroundOpacity: 0.45, blur: 8 }}
      transitionProps={{ transition: 'pop', duration: 220 }}
      closeOnClickOutside={closeOnClickOutside}
    >
      <Flex direction={{ base: 'column', sm: 'row' }} mih={400}>
        <Flex
          align="center"
          justify="center"
          bg={illustrationBg}
          className="shrink-0 sm:w-[42%]"
          p="xl"
        >
          {typeof illustration === 'string' ? (
            <Image src={illustration} alt="" maw={illustrationMaxWidth} fit="contain" />
          ) : (
            illustration
          )}
        </Flex>

        <Box pos="relative" className="flex-1" p={{ base: 'lg', sm: 40 }}>
          <ActionIcon
            variant="filled"
            color="teal.0"
            c="teal.9"
            radius="xl"
            size="md"
            onClick={onClose}
            aria-label="Close"
            pos="absolute"
            top={16}
            right={16}
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
