import type { KuraIllustrationId } from '@shared/illustrations/catalog'

export type OperatorAction =
  | 'suspend'
  | 'reactivate'
  | 'reset-pin'
  | 'message'
  | 'create-swap'
  | 'export-history'
  | 'resend-invite'
  | 'verify-identity'
  | 'request-id-photos'
  | 'reject-identity'

export const OPERATOR_ACTION_META: Record<
  OperatorAction,
  {
    confirmTitle: string
    confirmBody: string
    confirmTone: 'primary' | 'danger'
    reasonRequired?: boolean
    reasonLabel?: string
    reasonPlaceholder?: string
    confirmLabel?: string
    illustrationId: KuraIllustrationId
    successTitle: string
    successBody: (name: string, phone: string) => string
  }
> = {
  suspend: {
    confirmTitle: 'Suspend operator?',
    confirmBody: 'Swaps and payments are blocked until reactivation.',
    confirmTone: 'danger',
    reasonRequired: true,
    illustrationId: 'operator-suspended',
    successTitle: 'Suspended',
    successBody: (name) =>
      `You have successfully suspended ${name}. Reason logged to the audit trail.`,
  },
  reactivate: {
    confirmTitle: 'Reactivate operator?',
    confirmBody: 'Restores swap and payment access immediately.',
    confirmTone: 'primary',
    illustrationId: 'operator-reactivated',
    successTitle: 'Reactivated',
    successBody: (name) =>
      `You have successfully reactivated ${name}. Swaps and payments are available again.`,
  },
  'reset-pin': {
    confirmTitle: 'Reset PIN?',
    confirmBody:
      'A one-time PIN is sent to the registered mobile. The operator must enter it in the app and set a new PIN.',
    confirmTone: 'primary',
    illustrationId: 'pin-reset',
    successTitle: 'PIN reset',
    successBody: (_name, phone) =>
      `One-time PIN sent to ${phone}. Next: they open the KURA app, enter the PIN, and set a new one. Expires in 15 minutes.`,
  },
  message: {
    confirmTitle: 'Send in-app note?',
    confirmBody:
      'Opens as a notification for the rider. Tap opens Identity so they can fix name or photos. No SMS.',
    confirmTone: 'primary',
    reasonRequired: true,
    reasonLabel: 'Note',
    reasonPlaceholder: 'e.g. Full name must match NIN — edit Identity and resubmit.',
    confirmLabel: 'Send note',
    illustrationId: 'note-added',
    successTitle: 'Note sent',
    successBody: (name) =>
      `${name} got an in-app notification. They can open Identity from the bell.`,
  },
  'create-swap': {
    confirmTitle: 'Create swap for this operator?',
    confirmBody:
      'Opens a manual swap session at their home hub. Agent on duty will complete battery handoff.',
    confirmTone: 'primary',
    reasonRequired: true,
    reasonLabel: 'Hub / note',
    reasonPlaceholder: 'Hub name or reason for manual swap…',
    confirmLabel: 'Create swap',
    illustrationId: 'swap-complete',
    successTitle: 'Swap created',
    successBody: (name) =>
      `Manual swap reserved for ${name}. Track it under Swaps — status starts as Reserved.`,
  },
  'export-history': {
    confirmTitle: 'Export operator history?',
    confirmBody:
      'Downloads swaps, payments, renewals and funding events for this operator as CSV.',
    confirmTone: 'primary',
    confirmLabel: 'Export CSV',
    illustrationId: 'record-exported',
    successTitle: 'History exported',
    successBody: (name) => `Activity history for ${name} was downloaded.`,
  },
  'resend-invite': {
    confirmTitle: 'Resend invite link?',
    confirmBody:
      'Sends a fresh email so the operator can set or reset their app password. Link expires in 72 hours.',
    confirmTone: 'primary',
    confirmLabel: 'Resend invite',
    illustrationId: 'pending-approval',
    successTitle: 'Invite resent',
    successBody: (_name, phone) =>
      `A new invite was sent to their registered email. SMS notice also queued to ${phone}.`,
  },
  'verify-identity': {
    confirmTitle: 'Verify identity?',
    confirmBody:
      'Marks identity VERIFIED when face + ID front/back photos are on file. Pick the verification channel in the next step.',
    confirmTone: 'primary',
    illustrationId: 'account-verified',
    successTitle: 'Identity verified',
    successBody: (name) =>
      `${name} is verified. Full wallet funding and credit unlock when risk allows.`,
  },
  'request-id-photos': {
    confirmTitle: 'Ask operator to update photos?',
    confirmBody:
      'Keeps KYC PENDING and notifies the operator in-app. They open the same Identity screen with your note — existing photos stay until replaced.',
    confirmTone: 'primary',
    reasonRequired: true,
    reasonLabel: 'What should they fix?',
    reasonPlaceholder: 'e.g. ID front is blurry — retake in good light, full card in frame',
    confirmLabel: 'Send request',
    illustrationId: 'pending-approval',
    successTitle: 'Photo update requested',
    successBody: (name) =>
      `${name} was notified. They update Identity in the app; review continues after they submit.`,
  },
  'reject-identity': {
    confirmTitle: 'Reject identity?',
    confirmBody:
      'Sets KYC to REJECTED and asks the operator to resubmit ID number + photos. Prefer “Ask for photo update” if only images need fixing.',
    confirmTone: 'danger',
    reasonRequired: true,
    reasonLabel: 'Rejection reason',
    reasonPlaceholder: 'e.g. Name on ID does not match account',
    confirmLabel: 'Reject',
    illustrationId: 'operator-suspended',
    successTitle: 'Identity rejected',
    successBody: (name) =>
      `${name} must resubmit identity. They were notified with your reason.`,
  },
}
