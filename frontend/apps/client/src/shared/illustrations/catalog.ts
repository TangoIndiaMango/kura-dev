export type KuraIllustrationId =
  | 'battery-reserved'
  | 'swap-complete'
  | 'wallet-funded'
  | 'plan-renewed'
  | 'credit-approved'
  | 'account-verified'
  | 'pin-set'
  | 'vehicle-added'
  | 'payment-declined'
  | 'reservation-expired'
  | 'account-suspended'
  | 'pin-locked'
  | 'offline'
  | 'payments-down'
  | 'no-activity'
  | 'hub-out-of-stock'
  | 'processing-payment'
  | 'finding-hubs'
  | 'swap-in-progress'
  | 'success-check'
  | 'syncing'
  | 'reservation-countdown'
  | 'reconnecting'

export interface KuraIllustrationMeta {
  id: KuraIllustrationId
  title: string
  description: string
  actionLabel: string
  tone: 'success' | 'warning' | 'danger' | 'info' | 'progress'
}

/** Copy + asset map from Operator Modal Illustrations hifi. */
export const KURA_ILLUSTRATIONS: Record<KuraIllustrationId, KuraIllustrationMeta> = {
  'battery-reserved': {
    id: 'battery-reserved',
    title: 'Battery reserved',
    description: 'Code KB-4820 is held for you at Yaba Motor Park for 15 minutes.',
    actionLabel: 'Show code',
    tone: 'success',
  },
  'swap-complete': {
    id: 'swap-complete',
    title: 'Swap complete',
    description: 'BAT-100351 is in. Charged to 100% and ready for the road.',
    actionLabel: 'Done',
    tone: 'success',
  },
  'wallet-funded': {
    id: 'wallet-funded',
    title: 'Wallet funded',
    description: '₦5,000 arrived from GTBank ****4412. Your balance is updated.',
    actionLabel: 'View receipt',
    tone: 'success',
  },
  'plan-renewed': {
    id: 'plan-renewed',
    title: 'Plan renewed',
    description: 'Monthly unlimited runs until Oct 28. Auto-renew is on.',
    actionLabel: 'Back to home',
    tone: 'success',
  },
  'credit-approved': {
    id: 'credit-approved',
    title: 'Credit approved',
    description: '₦20,000 working capital is in your swap credit. Repay daily over 30 days.',
    actionLabel: 'See schedule',
    tone: 'success',
  },
  'account-verified': {
    id: 'account-verified',
    title: "You're in",
    description: 'Your KURA wallet is ready. Book a swap when you need power.',
    actionLabel: 'Continue',
    tone: 'success',
  },
  'pin-set': {
    id: 'pin-set',
    title: 'PIN set',
    description: 'Use it to confirm swaps, payments and plan changes.',
    actionLabel: 'Continue',
    tone: 'success',
  },
  'vehicle-added': {
    id: 'vehicle-added',
    title: 'Vehicle added',
    description: 'Spiro E-Moto · LSR-482-XA is now on your account.',
    actionLabel: 'Choose a plan',
    tone: 'success',
  },
  'payment-declined': {
    id: 'payment-declined',
    title: 'Payment declined',
    description: 'Your bank refused ₦1,200 for this swap. No money left your account.',
    actionLabel: 'Try another way',
    tone: 'danger',
  },
  'reservation-expired': {
    id: 'reservation-expired',
    title: 'Reservation expired',
    description: 'Code KB-4820 was released after 15 minutes. No charge was made.',
    actionLabel: 'Book again',
    tone: 'warning',
  },
  'account-suspended': {
    id: 'account-suspended',
    title: 'Account suspended',
    description: 'BAT-100351 has not been returned for 48 hours. Return it at any hub to lift the hold.',
    actionLabel: 'Find a hub',
    tone: 'danger',
  },
  'pin-locked': {
    id: 'pin-locked',
    title: 'PIN locked',
    description: '3 wrong attempts. Try again in 0:27, or reset it at any hub.',
    actionLabel: 'Back',
    tone: 'warning',
  },
  offline: {
    id: 'offline',
    title: "You're offline",
    description: 'Showing your last synced balance. Hubs still accept plan-covered swaps.',
    actionLabel: 'OK',
    tone: 'danger',
  },
  'payments-down': {
    id: 'payments-down',
    title: 'Payments are down',
    description: 'Our payment partner is unreachable. Plan-covered swaps still work.',
    actionLabel: 'Use plan instead',
    tone: 'warning',
  },
  'no-activity': {
    id: 'no-activity',
    title: 'No activity yet',
    description: 'Your swaps, payments and plan changes will show up here.',
    actionLabel: 'Book a swap',
    tone: 'info',
  },
  'hub-out-of-stock': {
    id: 'hub-out-of-stock',
    title: 'No batteries here',
    description: 'Oshodi hub has 0 ready batteries for Keke 60V. Nearest stock: Yaba, 2.1 km.',
    actionLabel: 'Go to Yaba',
    tone: 'warning',
  },
  'processing-payment': {
    id: 'processing-payment',
    title: 'Processing payment',
    description: 'Confirming ₦1,200 with your bank. This usually takes a few seconds.',
    actionLabel: 'Cancel',
    tone: 'progress',
  },
  'finding-hubs': {
    id: 'finding-hubs',
    title: 'Finding hubs near you',
    description: 'Checking live battery stock within 5 km.',
    actionLabel: 'Cancel',
    tone: 'progress',
  },
  'swap-in-progress': {
    id: 'swap-in-progress',
    title: 'Swap in progress',
    description: 'The agent is fitting BAT-100351. Keep this screen open.',
    actionLabel: 'Contact agent',
    tone: 'progress',
  },
  'success-check': {
    id: 'success-check',
    title: 'Done',
    description: 'Generic completion. Use when the modal has no object of its own.',
    actionLabel: 'Continue',
    tone: 'success',
  },
  syncing: {
    id: 'syncing',
    title: 'Updating',
    description: 'Refreshing your wallet balance and reservations.',
    actionLabel: 'Hide',
    tone: 'progress',
  },
  'reservation-countdown': {
    id: 'reservation-countdown',
    title: 'Reservation held',
    description: 'Show code KB-4820 at the hub before the timer runs out.',
    actionLabel: 'Show code',
    tone: 'progress',
  },
  reconnecting: {
    id: 'reconnecting',
    title: 'Reconnecting',
    description: 'Trying to reach KURA. Your reservation is safe.',
    actionLabel: 'Work offline',
    tone: 'progress',
  },
}

export function getIllustrationMeta(id: KuraIllustrationId): KuraIllustrationMeta {
  return KURA_ILLUSTRATIONS[id]
}

/** Progress / motion GIFs present under public/illustrations/{theme}/ */
const ILLUSTRATION_GIFS = new Set<KuraIllustrationId>([
  'finding-hubs',
  'processing-payment',
  'reconnecting',
  'reservation-countdown',
  'success-check',
  'swap-in-progress',
  'syncing',
])

/** Success states without their own GIF reuse the shared success-check animation. */
const SUCCESS_GIF_ALIAS = new Set<KuraIllustrationId>([
  'battery-reserved',
  'swap-complete',
  'wallet-funded',
  'plan-renewed',
  'credit-approved',
  'account-verified',
  'pin-set',
  'vehicle-added',
  'success-check',
])

export function resolveIllustrationAssetId(
  id: KuraIllustrationId,
): KuraIllustrationId {
  if (ILLUSTRATION_GIFS.has(id)) return id
  if (SUCCESS_GIF_ALIAS.has(id)) return 'success-check'
  return id
}

export function illustrationHasGif(id: KuraIllustrationId): boolean {
  const assetId = resolveIllustrationAssetId(id)
  return ILLUSTRATION_GIFS.has(assetId)
}

export function illustrationSrc(
  id: KuraIllustrationId,
  theme: 'dark' | 'light' = 'dark',
): string {
  const assetId = resolveIllustrationAssetId(id)
  if (ILLUSTRATION_GIFS.has(assetId)) {
    return `/illustrations/${theme}/${assetId}.gif`
  }
  return `/illustrations/${theme}/${assetId}.png`
}

export function illustrationPngFallback(
  id: KuraIllustrationId,
  theme: 'dark' | 'light' = 'dark',
): string {
  /** Prefer the original id's PNG (static art) over aliased success GIF. */
  return `/illustrations/${theme}/${id}.png`
}
