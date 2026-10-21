import React from 'react'
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog'
import { FleetAssignSheet } from './FleetAssignSheet'

type AssignTarget = {
  id: string
  name: string
  assignedDriverId?: string | null
}

export function AccountHubModals({
  accountId,
  assignVehicle,
  onCloseAssign,
  onAssigned,
  logoutOpen,
  onCancelLogout,
  onConfirmLogout,
  needPinOpen,
  onCancelNeedPin,
  onConfirmNeedPin,
}: {
  accountId?: string
  assignVehicle: AssignTarget | null
  onCloseAssign: () => void
  onAssigned: () => void
  logoutOpen: boolean
  onCancelLogout: () => void
  onConfirmLogout: () => void
  needPinOpen: boolean
  onCancelNeedPin: () => void
  onConfirmNeedPin: () => void
}) {
  return (
    <>
      {assignVehicle && accountId ? (
        <FleetAssignSheet
          accountId={accountId}
          vehicleId={assignVehicle.id}
          vehicleLabel={assignVehicle.name}
          currentDriverId={assignVehicle.assignedDriverId}
          onClose={onCloseAssign}
          onAssigned={onAssigned}
        />
      ) : null}

      <ConfirmDialog
        opened={logoutOpen}
        title="Log out?"
        description="You will sign back in with your phone number and your PIN. We only send a code when it is a new sign-in."
        confirmLabel="Log out"
        cancelLabel="Stay signed in"
        danger
        onCancel={onCancelLogout}
        onConfirm={onConfirmLogout}
      />

      <ConfirmDialog
        opened={needPinOpen}
        title="Set a PIN first"
        description="You need a 4-digit PIN before logging out so you can unlock this device when you return."
        confirmLabel="Set PIN"
        cancelLabel="Cancel"
        onCancel={onCancelNeedPin}
        onConfirm={onConfirmNeedPin}
      />
    </>
  )
}
