import type { AdminDetailAction } from '@shared/components'
import type { KycPayload } from './utils/map-account'
import type { OperatorRecord } from './types'
import type { useOperatorDetailActions } from './hooks/use-operator-detail-actions'

type ActionsApi = ReturnType<typeof useOperatorDetailActions>

export function buildOperatorDetailActions(opts: {
  operator: OperatorRecord
  liveStatus: string
  liveKycStatus: string
  kyc: KycPayload | undefined
  hubOptions: Array<{ name: string }>
  discountId: string | undefined
  activityExport: () => void
  actionsApi: ActionsApi
  onCreateSwap: (hubName: string | null) => void
  onAssignDiscount: (id: string | null) => void
  onEdit: () => void
}): AdminDetailAction[] {
  const {
    operator,
    liveStatus,
    liveKycStatus,
    kyc,
    hubOptions,
    discountId,
    activityExport,
    actionsApi,
    onCreateSwap,
    onAssignDiscount,
    onEdit,
  } = opts

  const canVerify =
    liveKycStatus !== 'VERIFIED' &&
    Boolean(kyc?.id_type || kyc?.id_last4 || operator.idType || operator.idLast4) &&
    Boolean(kyc?.id_front_url && kyc?.id_back_url && kyc?.photo_url)
  const canRequestPhotos =
    liveKycStatus === 'PENDING' &&
    Boolean(kyc?.id_type || kyc?.id_last4 || operator.idType || operator.idLast4)
  const canRejectIdentity =
    liveKycStatus === 'PENDING' || liveKycStatus === 'PROVISIONAL'

  return [
    {
      id: 'create-swap',
      label: 'Create Swap',
      disabled: liveStatus !== 'ACTIVE',
      onClick: () => onCreateSwap(hubOptions[0]?.name ?? null),
    },
    {
      id: 'assign-discount',
      label: 'Issue discount code',
      onClick: () => onAssignDiscount(discountId ?? null),
    },
    {
      id: 'verify-identity',
      label: 'Verify identity',
      disabled: !canVerify,
      onClick: () => actionsApi.setPending('verify-identity'),
    },
    {
      id: 'request-id-photos',
      label: 'Ask for photo update',
      disabled: !canRequestPhotos,
      onClick: () => actionsApi.setPending('request-id-photos'),
    },
    {
      id: 'reject-identity',
      label: 'Reject identity',
      tone: 'danger',
      disabled: !canRejectIdentity,
      onClick: () => actionsApi.setPending('reject-identity'),
    },
    {
      id: 'message',
      label: 'Send note',
      onClick: () => actionsApi.setPending('message'),
    },
    {
      id: 'export-history',
      label: 'Export History',
      onClick: () => {
        activityExport()
        actionsApi.setSuccess('export-history')
      },
    },
    {
      id: 'edit',
      label: 'Edit',
      onClick: onEdit,
    },
    {
      id: 'suspend',
      label: 'Suspend',
      tone: 'danger',
      disabled: liveStatus !== 'ACTIVE',
      onClick: () => actionsApi.setPending('suspend'),
    },
    {
      id: 'reactivate',
      label: 'Reactivate',
      disabled: liveStatus !== 'SUSPENDED',
      onClick: () => actionsApi.setPending('reactivate'),
    },
  ]
}
