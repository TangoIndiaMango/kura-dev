import { notifications } from '@mantine/notifications'

/**
 * Test servers without SMS (OTP_SHOW_IN_APP on the API) return the sign-in
 * code as `dev_code`; show it so testers can finish signing up. Production
 * never sends the field, so this never fires there.
 */
export function showDevOtp(url: string | undefined, data: unknown) {
  if (!url?.includes('/auth/otp/request/')) return
  const code = (data as { dev_code?: unknown } | null)?.dev_code
  if (typeof code !== 'string' || !code) return
  notifications.show({
    id: 'dev-otp',
    title: `Your code: ${code}`,
    message: 'Test server — the code is shown here because SMS is off.',
    color: 'teal',
    autoClose: 60_000,
  })
}
