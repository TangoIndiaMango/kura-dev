import { useLocation, useParams } from 'react-router-dom'
import {
  VehiclesPanel,
  VehiclesDetailPanel,
  VehicleFormPanel,
  VehicleModelsPanel,
  VehicleModelFormPanel,
} from '@features/vehicles'

export default function VehiclesPage() {
  const { id, modelId } = useParams<{ id?: string; modelId?: string }>()
  const { pathname } = useLocation()
  const onModels = pathname.includes('/vehicles/models')

  if (onModels) {
    if (pathname.endsWith('/models/new') || pathname.endsWith('/models/new/')) {
      return <VehicleModelFormPanel />
    }
    if (modelId && pathname.endsWith('/edit')) {
      return <VehicleModelFormPanel modelId={modelId} />
    }
    return <VehicleModelsPanel />
  }

  const isEdit = Boolean(id && pathname.endsWith('/edit'))
  if (id === 'new') return <VehicleFormPanel />
  if (isEdit && id) return <VehicleFormPanel vehicleId={id} />
  if (id) return <VehiclesDetailPanel id={id} />
  return <VehiclesPanel />
}
