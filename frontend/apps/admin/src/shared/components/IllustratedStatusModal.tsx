import { Stack, Title, Text, Button } from '@mantine/core'
import { IllustratedModalLayout } from './IllustratedModalLayout'
import type { IllustratedModalLayoutProps } from './IllustratedModalLayout'
import {
  illustrationSrc,
  type KuraIllustrationId,
} from '../illustrations/catalog'
import { useMantineColorScheme } from '@mantine/core'

export interface IllustratedStatusModalProps
  extends Pick<
    IllustratedModalLayoutProps,
    'opened' | 'onClose' | 'illustrationBg' | 'closeOnClickOutside'
  > {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
  illustration?: IllustratedModalLayoutProps['illustration']
  illustrationId?: KuraIllustrationId
  secondaryLabel?: string
  onSecondary?: () => void
  actionTone?: 'primary' | 'danger'
}

export function IllustratedStatusModal({
  opened,
  onClose,
  illustration,
  illustrationId,
  title,
  description,
  actionLabel,
  onAction,
  illustrationBg,
  closeOnClickOutside,
  secondaryLabel,
  onSecondary,
  actionTone = 'primary',
}: IllustratedStatusModalProps) {
  const { colorScheme } = useMantineColorScheme()
  const theme = colorScheme === 'dark' ? 'dark' : 'light'
  const src =
    illustration ??
    (illustrationId ? illustrationSrc(illustrationId, theme) : '')

  return (
    <IllustratedModalLayout
      opened={opened}
      onClose={onClose}
      illustration={src}
      illustrationBg={illustrationBg}
      illustrationMaxWidth={160}
      closeOnClickOutside={closeOnClickOutside}
      size={560}
    >
      <Stack gap="xl" justify="space-between" mih={180} align="flex-start">
        <Stack gap="xs" align="flex-start" pr={28}>
          <Title order={3} className="text-[var(--tx)]" fz={18} ta="left">
            {title}
          </Title>
          <Text className="text-[var(--mu)]" fz="sm" lh={1.6} ta="left">
            {description}
          </Text>
        </Stack>

        <div className="flex w-full flex-wrap justify-end gap-2">
          {secondaryLabel && onSecondary ? (
            <Button variant="default" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          ) : null}
          <Button
            color={actionTone === 'danger' ? 'red' : 'brand'}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </div>
      </Stack>
    </IllustratedModalLayout>
  )
}
