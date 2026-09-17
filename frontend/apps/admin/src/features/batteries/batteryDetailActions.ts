import type { AdminDetailAction } from '@shared/components'
import type { BatteryDetailApi } from './types'

export function batteryDetailActions({
  battery,
  canManage,
  onEdit,
  onTransfer,
  onLabel,
  onFound,
  onFlag,
  onSetActive,
  onRetire,
}: {
  battery: BatteryDetailApi
  canManage: boolean
  onEdit: () => void
  onTransfer: () => void
  onLabel: () => void
  onFound: () => void
  onFlag: () => void
  onSetActive?: () => void
  onRetire: () => void
}): AdminDetailAction[] {
  if (!canManage) return []
  if (battery.status === 'RETIRED') {
    return [
      { id: 'edit', label: 'Edit', onClick: onEdit },
      { id: 'label', label: 'Show label', onClick: onLabel },
    ]
  }
  const actions: AdminDetailAction[] = [
    { id: 'transfer', label: 'Transfer', onClick: onTransfer },
    { id: 'edit', label: 'Edit', onClick: onEdit },
    { id: 'label', label: 'Show label', onClick: onLabel },
  ]
  if (battery.status === 'LOST') {
    actions.push({ id: 'found', label: 'Mark Found', onClick: onFound })
  }
  if (battery.status === 'FAULTED' || battery.status === 'UNAVAILABLE') {
    if (onSetActive) {
      actions.push({ id: 'activate', label: 'Set Available', onClick: onSetActive })
    }
  } else {
    actions.push({ id: 'flag', label: 'Flag Health', onClick: onFlag })
  }
  actions.push(
    { id: 'retire', label: 'Retire Battery', tone: 'danger', onClick: onRetire },
  )
  return actions
}
