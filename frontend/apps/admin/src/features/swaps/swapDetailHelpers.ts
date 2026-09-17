import type { KuraIllustrationId } from '@shared/illustrations/catalog'
import {
  expiresInLabel,
  formatSwapWhen,
  reservationUiStatus,
  type ReservationListApi,
} from './types'

export type SwapActionKind = 'cancel_rsv' | 'extend_rsv'

export const SWAP_ACTION_META: Record<
  SwapActionKind,
  {
    confirmTitle: string
    confirmBody: string
    confirmTone: 'primary' | 'danger'
    reasonRequired?: boolean
    reasonLabel?: string
    reasonPlaceholder?: string
    confirmLabel?: string
    successId: KuraIllustrationId
    successTitle: string
    successBody: (code: string) => string
  }
> = {
  cancel_rsv: {
    confirmTitle: 'Cancel reservation?',
    confirmBody: 'The bay hold is released. Audit records the cancellation.',
    confirmTone: 'danger',
    reasonRequired: true,
    confirmLabel: 'Cancel hold',
    successId: 'reservation-cancelled',
    successTitle: 'Reservation cancelled',
    successBody: (code) => `${code} was cancelled. Bay returned to inventory.`,
  },
  extend_rsv: {
    confirmTitle: 'Extend hold?',
    confirmBody: 'Add minutes to this hold. Max is set in Pricing Hold limits.',
    confirmTone: 'primary',
    reasonRequired: true,
    reasonLabel: 'Extend by',
    reasonPlaceholder: 'Minutes',
    confirmLabel: 'Extend hold',
    successId: 'hold-extended',
    successTitle: 'Hold extended',
    successBody: (code) => `${code} now expires later. Inventory stays reserved.`,
  },
}

export type SwapStep = {
  id: string
  title: string
  detail: string
  done: boolean
  drawerTitle: string
  rows: { label: string; value: string }[]
}

export function swapStatusTone(status: string) {
  const s = status.toUpperCase()
  if (s === 'COMPLETED') return 'success' as const
  if (s === 'IN_PROGRESS' || s === 'AT_HUB' || s === 'STARTED' || s === 'RETURN_RECORDED' || s === 'ISSUED') {
    return 'info' as const
  }
  if (s === 'INCOMPLETE' || s === 'REVERSED') return 'warning' as const
  if (s === 'FAILED') return 'danger' as const
  return 'neutral' as const
}

export function reservationStatusTone(status: string) {
  const ui = status.toUpperCase()
  if (ui === 'ACTIVE') return 'success' as const
  if (ui === 'EXPIRED') return 'warning' as const
  if (ui === 'CANCELLED' || ui === 'USED') return 'neutral' as const
  return 'neutral' as const
}

export function reservationStepsFor(
  r: ReservationListApi,
  opts?: { defaultHoldMinutes?: number; maxExtendMinutes?: number },
): SwapStep[] {
  const ui = reservationUiStatus(r.status, r.expires_at)
  const expires = expiresInLabel(r.expires_at)
  const holdTitle =
    ui === 'ACTIVE' ? 'Bay hold' : ui === 'EXPIRED' ? 'Expired' : 'Cancelled'
  const holdDetail =
    ui === 'ACTIVE'
      ? `Expires in ${expires}`
      : ui === 'EXPIRED'
        ? 'No-show / lapsed'
        : 'Bay released'
  const defaultHold = opts?.defaultHoldMinutes ?? 15
  const maxExtend = opts?.maxExtendMinutes

  return [
    {
      id: 'created',
      title: 'Created',
      detail: r.hub_name || r.hub_code,
      done: true,
      drawerTitle: 'Reservation created',
      rows: [
        { label: 'Code', value: r.code },
        { label: 'Hub', value: r.hub_name || r.hub_code },
        { label: 'Vehicle', value: r.vehicle_plate || '—' },
        { label: 'Driver', value: r.driver_name || '—' },
        { label: 'Payment mode', value: r.payment_mode },
        { label: 'Created', value: formatSwapWhen(r.created_at) },
        { label: 'Default window', value: `${defaultHold} min` },
      ],
    },
    {
      id: 'hold',
      title: holdTitle,
      detail: holdDetail,
      done: true,
      drawerTitle:
        ui === 'ACTIVE'
          ? 'Bay hold active'
          : ui === 'EXPIRED'
            ? 'Hold expired'
            : 'Hold cancelled',
      rows: [
        { label: 'Status', value: ui },
        { label: 'Expires / left', value: expires },
        {
          label: 'Max extend',
          value: ui === 'ACTIVE' && maxExtend != null ? `+${maxExtend} min` : '—',
        },
      ],
    },
  ]
}
