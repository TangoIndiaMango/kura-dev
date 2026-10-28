import { notifications } from '@mantine/notifications'

type ToastTone = 'info' | 'success' | 'warning' | 'error'

const COLOR: Record<ToastTone, string> = {
  info: 'brand',
  success: 'teal',
  warning: 'yellow',
  error: 'red',
}

/** Lightweight action feedback — code sent, saved, etc. (inbox stays for durable items). */
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

/**
 * One toast per code request. When the API returns `dev_code`
 * (OTP_SHOW_IN_APP, no SMS yet) the code goes in the same toast and stays up
 * long enough to type it.
 */
export function notifyCodeSent(
  channel: 'sms' | 'email',
  destination: string,
  devCode?: string,
) {
  if (devCode) {
    notify({
      title: `Your code: ${devCode}`,
      message: destination,
      tone: 'success',
      autoClose: 60_000,
    })
    return
  }
  notify({
    title: channel === 'email' ? 'Code sent to email' : 'Code sent by SMS',
    message: destination,
    tone: 'success',
  })
}
