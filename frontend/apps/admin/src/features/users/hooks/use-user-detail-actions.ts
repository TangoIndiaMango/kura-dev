import { useEffect, useState } from 'react'
import { notifications } from '@mantine/notifications'
import { apiErrorMessage } from '@lib/api/auth'
import { downloadCsv } from '@shared/utils/downloadCsv'
import type { AdminUserRecord } from '@shared/mock/adminMockData'
import { appendUserAudit, type UserAction } from '../userDetailHelpers'
import {
  useActivateStaff,
  useDeactivateStaff,
  useUpdateStaff,
} from './use-users'

/**
 * Confirm / role-change actions for staff user detail — loading from mutation.isPending.
 */
export function useUserDetailActions(id: string, record: AdminUserRecord | null) {
  const deactivate = useDeactivateStaff(id)
  const activate = useActivateStaff(id)
  const updateStaff = useUpdateStaff(id)

  const [live, setLive] = useState<AdminUserRecord | null>(record)
  const [pending, setPending] = useState<UserAction | null>(null)
  const [success, setSuccess] = useState<UserAction | null>(null)

  useEffect(() => {
    setLive(record)
  }, [record])

  const isPending =
    deactivate.isPending || activate.isPending || updateStaff.isPending

  const changeRole = async (roleCode: string) => {
    if (!live) return
    try {
      const updated = await updateStaff.mutateAsync({ role: roleCode })
      const nextRole = updated.assigned_role_name || updated.role
      setLive({
        ...live,
        role: nextRole,
        audit: appendUserAudit(
          live.audit,
          'Role changed',
          `${live.role} → ${nextRole}`,
        ),
      })
      setSuccess('change-role')
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Could not change role'),
      })
      throw err
    }
  }

  const runConfirm = async (reason?: string) => {
    const action = pending
    if (!action || !live) return

    if (action === 'edit') {
      setPending(null)
      return
    }

    if (action === 'export') {
      downloadCsv(
        `${live.id}.csv`,
        ['id', 'name', 'email', 'role', 'scope', 'status', 'lastLogin'],
        [
          [
            live.id,
            live.name,
            live.email,
            live.role,
            live.scope,
            live.status,
            live.lastLogin,
          ],
        ],
      )
      setPending(null)
      setSuccess(action)
      return
    }

    try {
      if (action === 'suspend' || action === 'revoke') {
        await deactivate.mutateAsync({})
        setLive({
          ...live,
          status: action === 'revoke' ? 'REVOKED' : 'SUSPENDED',
          audit: appendUserAudit(
            live.audit,
            action === 'revoke' ? 'Access revoked' : 'Account suspended',
            reason?.trim() || 'Temporary block',
          ),
        })
      } else if (action === 'reactivate') {
        await activate.mutateAsync({})
        setLive({
          ...live,
          status: 'ACTIVE',
          audit: appendUserAudit(
            live.audit,
            'Account reactivated',
            reason?.trim() || 'Console access restored',
          ),
        })
      } else if (action === 'resend') {
        setLive({
          ...live,
          status: 'INVITED',
          audit: appendUserAudit(
            live.audit,
            'Invite resent',
            reason?.trim() || 'Fresh invite',
          ),
        })
      } else if (action === 'reset-pin') {
        setLive({
          ...live,
          audit: appendUserAudit(
            live.audit,
            'Password reset sent',
            reason?.trim() || 'Reset link queued',
          ),
        })
      }
      setPending(null)
      setSuccess(action)
    } catch (err) {
      notifications.show({
        color: 'red',
        message: apiErrorMessage(err, 'Action failed'),
      })
      setPending(null)
    }
  }

  return {
    live: live ?? record,
    pending,
    setPending,
    success,
    setSuccess,
    isPending,
    runConfirm,
    changeRole,
  }
}
