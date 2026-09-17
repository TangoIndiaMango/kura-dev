import type { KuraIllustrationId } from '@shared/illustrations/catalog'
import type { AdminUserAuditEvent, AdminUserRecord } from '@shared/mock/adminMockData'

export type UserAction =
  | 'edit'
  | 'change-role'
  | 'suspend'
  | 'revoke'
  | 'reactivate'
  | 'reset-pin'
  | 'resend'
  | 'export'

export const USER_ACTION_META: Record<
  UserAction,
  {
    confirmTitle: string
    confirmBody: string
    illustrationId: KuraIllustrationId
    confirmTone?: 'primary' | 'danger'
    reasonRequired?: boolean
    successTitle: string
    successBody: (name: string) => string
  }
> = {
  edit: {
    confirmTitle: 'Edit this user?',
    confirmBody: 'Opens profile fields for name, email, phone, and scope.',
    illustrationId: 'record-saved',
    successTitle: 'Ready to edit',
    successBody: (name) => `Continue editing ${name}.`,
  },
  'change-role': {
    confirmTitle: 'Change role?',
    confirmBody: 'Permissions update on their next session refresh.',
    illustrationId: 'record-saved',
    successTitle: 'Role updated',
    successBody: (name) => `${name} role was updated.`,
  },
  suspend: {
    confirmTitle: 'Suspend this user?',
    confirmBody: 'Temporarily blocks console sign-in until reactivation.',
    illustrationId: 'account-suspended',
    confirmTone: 'danger',
    reasonRequired: true,
    successTitle: 'User suspended',
    successBody: (name) => `${name} cannot sign in until reactivated.`,
  },
  revoke: {
    confirmTitle: 'Revoke access?',
    confirmBody: 'Ends sessions and blocks console access.',
    illustrationId: 'record-deleted',
    confirmTone: 'danger',
    reasonRequired: true,
    successTitle: 'Access revoked',
    successBody: (name) => `${name} access was revoked.`,
  },
  reactivate: {
    confirmTitle: 'Reactivate this user?',
    confirmBody: 'Restores console access with the current role and scope.',
    illustrationId: 'operator-reactivated',
    successTitle: 'User reactivated',
    successBody: (name) => `${name} can sign in again.`,
  },
  'reset-pin': {
    confirmTitle: 'Reset password / PIN?',
    confirmBody: 'Sends a one-time reset link to the registered email.',
    illustrationId: 'pin-reset',
    successTitle: 'Reset sent',
    successBody: (name) => `Reset instructions queued for ${name}.`,
  },
  resend: {
    confirmTitle: 'Resend invite?',
    confirmBody: 'Sends a fresh invite email with a 72-hour acceptance window.',
    illustrationId: 'pending-approval',
    successTitle: 'Invite resent',
    successBody: (name) => `Invite resent to ${name}.`,
  },
  export: {
    confirmTitle: 'Export this user record?',
    confirmBody: 'Downloads a CSV of identity, role, scope, and status.',
    illustrationId: 'record-exported',
    successTitle: 'Export ready',
    successBody: (name) => `${name} record was downloaded.`,
  },
}

export function userStatusTone(status: AdminUserRecord['status']) {
  if (status === 'ACTIVE') return 'success' as const
  if (status === 'INVITED' || status === 'SUSPENDED') return 'warning' as const
  return 'danger' as const
}

export function userStatusLabel(status: AdminUserRecord['status']) {
  if (status === 'ACTIVE') return 'Active'
  if (status === 'INVITED') return 'Invited'
  if (status === 'SUSPENDED') return 'Suspended'
  return 'Revoked'
}

export function appendUserAudit(
  audit: AdminUserAuditEvent[],
  action: string,
  detail: string,
): AdminUserAuditEvent[] {
  return [
    ...audit,
    {
      id: `UA-${audit.length + 1}`,
      at: 'Just now',
      actor: 'You (Admin)',
      action,
      detail,
    },
  ]
}
