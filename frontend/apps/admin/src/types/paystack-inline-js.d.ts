// Minimal types for @paystack/inline-js (the package ships none).
declare module '@paystack/inline-js' {
  export interface PaystackSuccess {
    id: number
    reference: string
    message: string
  }
  export interface PaystackCallbacks {
    onSuccess?: (tx: PaystackSuccess) => void
    onCancel?: () => void
    onError?: (err: { message: string }) => void
    onLoad?: (tx: { id: number; accessCode: string }) => void
  }
  export default class PaystackPop {
    resumeTransaction(accessCode: string, callbacks?: PaystackCallbacks): unknown
  }
}
