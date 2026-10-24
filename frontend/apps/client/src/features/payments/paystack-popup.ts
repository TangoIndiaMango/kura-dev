/**
 * Paystack's in-app checkout (InlineJS v2), loaded on demand from Paystack's
 * own CDN — their documented setup, so there is no npm package to keep in
 * step with the build's Node version.
 */
const PAYSTACK_SRC = 'https://js.paystack.co/v2/inline.js'

type Callbacks = {
  onSuccess?: (tx: { reference: string }) => void
  onCancel?: () => void
  onError?: (err: { message: string }) => void
}
type PaystackPopCtor = new () => {
  resumeTransaction: (accessCode: string, callbacks?: Callbacks) => unknown
}

declare global {
  interface Window {
    PaystackPop?: PaystackPopCtor
  }
}

let loading: Promise<PaystackPopCtor> | null = null

function loadPaystack(): Promise<PaystackPopCtor> {
  if (window.PaystackPop) return Promise.resolve(window.PaystackPop)
  loading ??= new Promise<PaystackPopCtor>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = PAYSTACK_SRC
    script.async = true
    script.onload = () =>
      window.PaystackPop ? resolve(window.PaystackPop) : reject(new Error('Paystack did not load'))
    script.onerror = () => {
      loading = null // allow a retry (e.g. after reconnecting)
      script.remove()
      reject(new Error('Paystack did not load'))
    }
    document.head.appendChild(script)
  })
  return loading
}

export type PopupOutcome = 'success' | 'cancelled' | 'failed'

/**
 * Opens Paystack's in-app checkout for a transaction the server initialized
 * (resumeTransaction with its access_code) — no redirect. The outcome is
 * only a hint: the server verifies the payment with Paystack itself.
 */
export async function openPaystackPopup(accessCode: string): Promise<PopupOutcome> {
  let Pop: PaystackPopCtor
  try {
    Pop = await loadPaystack()
  } catch {
    return 'failed'
  }
  return new Promise((resolve) => {
    try {
      new Pop().resumeTransaction(accessCode, {
        onSuccess: () => resolve('success'),
        onCancel: () => resolve('cancelled'),
        onError: () => resolve('failed'),
      })
    } catch {
      resolve('failed')
    }
  })
}
