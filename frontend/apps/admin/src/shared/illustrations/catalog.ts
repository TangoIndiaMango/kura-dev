export type KuraIllustrationTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'progress'

export type KuraIllustrationId =
  // Operator / shared plan set (22)
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
  // Admin console action set
  | 'confirm-action'
  | 'confirm-delete'
  | 'applying'
  | 'action-failed'
  | 'pending-approval'
  | 'success'
  | 'record-saved'
  | 'record-created'
  | 'record-deleted'
  | 'operator-suspended'
  | 'operator-reactivated'
  | 'pin-reset'
  | 'record-exported'
  | 'note-added'
  | 'hub-maintenance'
  | 'hub-deactivated'
  | 'alert-acknowledged'
  | 'alert-resolved'
  | 'alert-escalated'
  | 'assigned-agent'
  | 'refunded'
  | 'webhook-retried'
  | 'dispute-opened'
  | 'reservation-cancelled'
  | 'hold-extended'
  | 'battery-retired'
  | 'health-flagged'
  | 'battery-transferred'
  | 'approved'
  | 'rejected'
  | 'offer-published'
  | 'offer-paused'
  | 'offer-ended'
  | 'duplicated'
  | 'scheduled'
  | 'case-closed'
  | 'case-reopened'
  | 'score-recomputed'
  | 'manual-override'
  | 'limit-adjusted'
  | 'engine-released'
  | 'exporting'
  | 'syncing-partner'
  | 'recomputing'
  | 'awaiting-partner'

export interface KuraIllustrationMeta {
  id: KuraIllustrationId
  title: string
  description: string
  actionLabel: string
  tone: KuraIllustrationTone
}

/** Copy + asset map from Admin Modal Illustrations (+ operator shared set). */
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
    title: "You're verified",
    description: 'Your NIN matched. A bank account for your wallet has been opened.',
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
    description:
      'BAT-100351 has not been returned for 48 hours. Return it at any hub to lift the hold.',
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
    title: 'Syncing',
    description: 'Updating your balance and reservations with the server.',
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

  'confirm-action': {
    id: 'confirm-action',
    title: 'Suspend operator?',
    description:
      'Yusuf Abdullahi will lose access to swaps and payments until reactivated. A reason is required.',
    actionLabel: 'Suspend',
    tone: 'warning',
  },
  'confirm-delete': {
    id: 'confirm-delete',
    title: 'Delete hub?',
    description:
      'Are you sure you want to delete Yaba Motor Park? Once deleted, all records will be gone and this cannot be undone.',
    actionLabel: 'Delete',
    tone: 'danger',
  },
  applying: {
    id: 'applying',
    title: 'Applying…',
    description: 'Working on Yusuf Abdullahi. Nothing is marked done until the system confirms it.',
    actionLabel: 'Please wait',
    tone: 'progress',
  },
  'action-failed': {
    id: 'action-failed',
    title: 'Suspend failed',
    description: 'Yusuf Abdullahi was not changed. You can retry or open a support case.',
    actionLabel: 'Retry',
    tone: 'danger',
  },
  'pending-approval': {
    id: 'pending-approval',
    title: 'Sent for approval',
    description:
      'Suspend on Yusuf Abdullahi is pending super admin approval. You’ll be notified when it is applied.',
    actionLabel: 'View operator',
    tone: 'info',
  },
  success: {
    id: 'success',
    title: 'Success',
    description: 'You have successfully suspended Yusuf Abdullahi.',
    actionLabel: 'View operator',
    tone: 'success',
  },
  'record-saved': {
    id: 'record-saved',
    title: 'Changes saved',
    description: 'You have successfully updated Yaba Motor Park.',
    actionLabel: 'View hub',
    tone: 'success',
  },
  'record-created': {
    id: 'record-created',
    title: 'Operator added',
    description:
      'Yusuf Abdullahi is registered. KURA ID KR-10432 and a virtual account were created.',
    actionLabel: 'View operator',
    tone: 'success',
  },
  'record-deleted': {
    id: 'record-deleted',
    title: 'Deleted',
    description: 'You have successfully deleted Promo · September Boost.',
    actionLabel: 'Back to Promotions',
    tone: 'success',
  },
  'operator-suspended': {
    id: 'operator-suspended',
    title: 'Suspended',
    description:
      'You have successfully suspended Yusuf Abdullahi. Reason logged to the audit trail.',
    actionLabel: 'View operator',
    tone: 'success',
  },
  'operator-reactivated': {
    id: 'operator-reactivated',
    title: 'Reactivated',
    description:
      'You have successfully reactivated Yusuf Abdullahi. Swaps and payments are available again.',
    actionLabel: 'View operator',
    tone: 'success',
  },
  'pin-reset': {
    id: 'pin-reset',
    title: 'PIN reset',
    description: 'A one-time PIN was sent to +234 803 412 1000. It expires in 15 minutes.',
    actionLabel: 'View operator',
    tone: 'success',
  },
  'record-exported': {
    id: 'record-exported',
    title: 'Exported',
    description: 'A CSV of 1,284 operators is ready. The download starts automatically.',
    actionLabel: 'Download again',
    tone: 'success',
  },
  'note-added': {
    id: 'note-added',
    title: 'Note added',
    description: 'Your note on Swap KB-4820 is visible to Ops managers and agents.',
    actionLabel: 'View swap',
    tone: 'success',
  },
  'hub-maintenance': {
    id: 'hub-maintenance',
    title: 'Set to maintenance',
    description: 'Oshodi Terminal is hidden from operators until it is set back online.',
    actionLabel: 'View hub',
    tone: 'warning',
  },
  'hub-deactivated': {
    id: 'hub-deactivated',
    title: 'Deactivated',
    description: 'Ikeja Along is offline. Agents assigned to it were unassigned.',
    actionLabel: 'View hubs',
    tone: 'warning',
  },
  'alert-acknowledged': {
    id: 'alert-acknowledged',
    title: 'Acknowledged',
    description: 'Low stock at Oshodi is assigned to you. It stays open until resolved.',
    actionLabel: 'View alert',
    tone: 'success',
  },
  'alert-resolved': {
    id: 'alert-resolved',
    title: 'Resolved',
    description: 'Low stock at Oshodi is closed. Resolution time: 42 minutes.',
    actionLabel: 'View alerts',
    tone: 'success',
  },
  'alert-escalated': {
    id: 'alert-escalated',
    title: 'Escalated',
    description: 'Battery health BAT-100351 was sent to the Ops manager on duty.',
    actionLabel: 'View alert',
    tone: 'warning',
  },
  'assigned-agent': {
    id: 'assigned-agent',
    title: 'Assigned',
    description: 'Tunde Bakare now owns this ticket and was notified on the hub tablet.',
    actionLabel: 'View ticket',
    tone: 'success',
  },
  refunded: {
    id: 'refunded',
    title: 'Refunded to wallet',
    description:
      '₦1,200 was returned to Yusuf Abdullahi’s wallet. PSP-9F3A2C is marked reversed.',
    actionLabel: 'View payment',
    tone: 'success',
  },
  'webhook-retried': {
    id: 'webhook-retried',
    title: 'Webhook retried',
    description: 'The payment partner re-sent PSP-9F3A2C. Status will update within a minute.',
    actionLabel: 'View payment',
    tone: 'success',
  },
  'dispute-opened': {
    id: 'dispute-opened',
    title: 'Dispute opened',
    description: 'Case DS-2041 is open against PSP-9F3A2C. The partner has 48 hours to respond.',
    actionLabel: 'View case',
    tone: 'warning',
  },
  'reservation-cancelled': {
    id: 'reservation-cancelled',
    title: 'Reservation cancelled',
    description:
      'KB-4820 was released. The battery is back in Yaba stock and the operator was notified.',
    actionLabel: 'View reservations',
    tone: 'success',
  },
  'hold-extended': {
    id: 'hold-extended',
    title: 'Hold extended',
    description: 'KB-4820 is now held until 09:56 (+10 minutes).',
    actionLabel: 'View reservation',
    tone: 'success',
  },
  'battery-retired': {
    id: 'battery-retired',
    title: 'Battery retired',
    description: 'BAT-100351 is out of rotation and flagged for recycling pickup.',
    actionLabel: 'View batteries',
    tone: 'warning',
  },
  'health-flagged': {
    id: 'health-flagged',
    title: 'Health flagged',
    description: 'BAT-100351 is marked for inspection at its next hub visit.',
    actionLabel: 'View battery',
    tone: 'warning',
  },
  'battery-transferred': {
    id: 'battery-transferred',
    title: 'Transferred',
    description: '12 batteries are in transit from Yaba Motor Park to Oshodi Terminal.',
    actionLabel: 'View transfer',
    tone: 'success',
  },
  approved: {
    id: 'approved',
    title: 'Approved',
    description: 'Credit request CR-0931 is approved. ₦20,000 is disbursed as swap credit.',
    actionLabel: 'View request',
    tone: 'success',
  },
  rejected: {
    id: 'rejected',
    title: 'Rejected',
    description: 'Credit request CR-0931 was rejected. The operator sees your reason in the app.',
    actionLabel: 'View requests',
    tone: 'danger',
  },
  'offer-published': {
    id: 'offer-published',
    title: 'Published',
    description: 'September Boost is live for 1,196 active operators.',
    actionLabel: 'View promotion',
    tone: 'success',
  },
  'offer-paused': {
    id: 'offer-paused',
    title: 'Paused',
    description: 'September Boost is hidden. Existing redemptions stay valid.',
    actionLabel: 'View promotion',
    tone: 'warning',
  },
  'offer-ended': {
    id: 'offer-ended',
    title: 'Offer ended',
    description: 'September Boost closed early. 412 redemptions recorded.',
    actionLabel: 'View promotions',
    tone: 'info',
  },
  duplicated: {
    id: 'duplicated',
    title: 'Duplicated',
    description: 'A draft copy of Monthly · Unlimited was created. Edit it before publishing.',
    actionLabel: 'Open draft',
    tone: 'success',
  },
  scheduled: {
    id: 'scheduled',
    title: 'Scheduled',
    description:
      'The new price takes effect Oct 1, 2026 at 00:00 WAT. Operators are notified 7 days before.',
    actionLabel: 'View plan',
    tone: 'info',
  },
  'case-closed': {
    id: 'case-closed',
    title: 'Case closed',
    description: 'DS-2041 is closed as resolved. Reopen within 30 days if needed.',
    actionLabel: 'View cases',
    tone: 'success',
  },
  'case-reopened': {
    id: 'case-reopened',
    title: 'Case reopened',
    description: 'DS-2041 is active again and assigned to its previous owner.',
    actionLabel: 'View case',
    tone: 'warning',
  },
  'score-recomputed': {
    id: 'score-recomputed',
    title: 'Score recomputed',
    description:
      'Yusuf Abdullahi’s credit score moved from 612 to 648 using the latest 90 days.',
    actionLabel: 'View score',
    tone: 'success',
  },
  'manual-override': {
    id: 'manual-override',
    title: 'Override applied',
    description: 'Swap KB-4820 was completed without payment. This is flagged in the audit log.',
    actionLabel: 'View swap',
    tone: 'warning',
  },
  'limit-adjusted': {
    id: 'limit-adjusted',
    title: 'Limit adjusted',
    description: 'Yusuf Abdullahi’s credit limit is now ₦50,000 (was ₦35,000).',
    actionLabel: 'View operator',
    tone: 'success',
  },
  'engine-released': {
    id: 'engine-released',
    title: 'Engine released',
    description:
      'Yamaha 15HP · ENG-IGB-103 is released from storage. Pickup scheduled at Igbokoda.',
    actionLabel: 'View retrofit',
    tone: 'success',
  },
  exporting: {
    id: 'exporting',
    title: 'Exporting…',
    description: 'Preparing 1,284 rows as CSV. Large exports can take up to a minute.',
    actionLabel: 'Please wait',
    tone: 'progress',
  },
  'syncing-partner': {
    id: 'syncing-partner',
    title: 'Syncing with payment partner',
    description: 'Re-fetching PSP-9F3A2C. This usually takes a few seconds.',
    actionLabel: 'Cancel',
    tone: 'progress',
  },
  recomputing: {
    id: 'recomputing',
    title: 'Recomputing score',
    description: 'Reading 90 days of swaps, payments and repayments.',
    actionLabel: 'Please wait',
    tone: 'progress',
  },
  'awaiting-partner': {
    id: 'awaiting-partner',
    title: 'Awaiting partner response',
    description: 'Case DS-2041 is with the payment partner. Deadline: Sep 6, 09:00.',
    actionLabel: 'View case',
    tone: 'info',
  },
}

export function getIllustrationMeta(id: KuraIllustrationId): KuraIllustrationMeta {
  return KURA_ILLUSTRATIONS[id]
}

/** Motion GIFs present under public/illustrations/{theme}/ */
const ILLUSTRATION_GIFS = new Set<KuraIllustrationId>([
  'finding-hubs',
  'processing-payment',
  'reconnecting',
  'reservation-countdown',
  'success-check',
  'swap-in-progress',
  'syncing',
  'exporting',
  'syncing-partner',
  'recomputing',
  'awaiting-partner',
])

/** Success completions without their own GIF → shared success-check. */
export function resolveIllustrationAssetId(
  id: KuraIllustrationId,
): KuraIllustrationId {
  if (ILLUSTRATION_GIFS.has(id)) return id
  if (KURA_ILLUSTRATIONS[id]?.tone === 'success') return 'success-check'
  return id
}

export function illustrationHasGif(id: KuraIllustrationId): boolean {
  return ILLUSTRATION_GIFS.has(resolveIllustrationAssetId(id))
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
  return `/illustrations/${theme}/${id}.png`
}
