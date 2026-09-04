import { Stack, Title, Text } from '@mantine/core'
import { IllustratedModalLayout } from './IllustratedModalLayout'
import type { IllustratedModalLayoutProps } from './IllustratedModalLayout'

export interface IllustratedFormModalProps
  extends Pick<
    IllustratedModalLayoutProps,
    | 'opened'
    | 'onClose'
    | 'illustration'
    | 'illustrationBg'
    | 'illustrationMaxWidth'
    | 'closeOnClickOutside'
  > {
  title: string
  description: string
  children: React.ReactNode
}

export function IllustratedFormModal({
  opened,
  onClose,
  illustration,
  title,
  description,
  children,
  illustrationBg,
  illustrationMaxWidth,
  closeOnClickOutside,
}: IllustratedFormModalProps) {
  return (
    <IllustratedModalLayout
      opened={opened}
      onClose={onClose}
      illustration={illustration}
      illustrationBg={illustrationBg}
      illustrationMaxWidth={illustrationMaxWidth}
      closeOnClickOutside={closeOnClickOutside}
    >
      <Stack gap="xl" justify="center" mih={320} align="flex-start">
        <Stack gap="xs" align="flex-start">
          <Title order={3} c="brand.9" fz={24} ta="left">
            {title}
          </Title>
          <Text c="gray.7" fz="sm" lh={1.6} ta="left">
            {description}
          </Text>
        </Stack>

        {children}
      </Stack>
    </IllustratedModalLayout>
  )
}
