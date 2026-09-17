import { useLocation, useParams } from 'react-router-dom'
import {
  BatteriesDetailPanel,
  BatteriesPanel,
  BatteryFormPanel,
  BatteryTypeFormPanel,
  BatteryTypesPanel,
} from '@features/batteries'

export default function BatteriesPage() {
  const { id, typeId } = useParams<{ id?: string; typeId?: string }>()
  const { pathname } = useLocation()
  const onTypes = pathname.includes('/batteries/types')

  if (onTypes) {
    if (
      pathname.endsWith('/types/new') ||
      pathname.endsWith('/types/new/')
    ) {
      return <BatteryTypeFormPanel />
    }
    if (typeId && pathname.endsWith('/edit')) {
      return <BatteryTypeFormPanel typeId={typeId} />
    }
    return <BatteryTypesPanel />
  }

  const isEdit = Boolean(id && pathname.endsWith('/edit'))
  if (id === 'new') return <BatteryFormPanel />
  if (isEdit && id) return <BatteryFormPanel batteryId={id} />
  if (id) return <BatteriesDetailPanel id={id} />
  return <BatteriesPanel />
}
