import { notifications } from '@mantine/notifications'

type ToastTone = 'info' | 'success' | 'warning' | 'error'

const COLOR: Record<ToastTone, string> = {
  info: 'brand',
  success: 'teal',
  warning: 'yellow',
  error: 'red',
}

/** Lightweight action feedback — saved, emailed, etc. (inbox stays for durable items). */
export function notify(input: {
  title: string
  message?: string
  tone?: ToastTone
  autoClose?: number | false
}) {
  const tone = input.tone ?? 'info'
  notifications.show({
    title: input.title,
    message: input.message,
    color: COLOR[tone],
    autoClose: input.autoClose ?? 3500,
    withBorder: true,
  })
}
