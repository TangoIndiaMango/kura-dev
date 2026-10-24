import PaystackPop from '@paystack/inline-js'

export type PopupOutcome = 'success' | 'cancelled' | 'failed'

/**
 * Opens Paystack's in-app checkout for a transaction the server initialized
 * (resumeTransaction with its access_code) — no redirect. The outcome is
 * only a hint: the server verifies the payment with Paystack itself.
 */
export function openPaystackPopup(accessCode: string): Promise<PopupOutcome> {
  return new Promise((resolve) => {
    try {
      new PaystackPop().resumeTransaction(accessCode, {
        onSuccess: () => resolve('success'),
        onCancel: () => resolve('cancelled'),
        onError: () => resolve('failed'),
      })
    } catch {
      resolve('failed')
    }
  })
}
