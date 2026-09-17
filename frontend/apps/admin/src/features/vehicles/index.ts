export {
  useVehicles,
  useVehicle,
  useVehicleStats,
  useVehicleModels,
  useVehicleModelsList,
  useVehicleModelStats,
  useVehicleModel,
  useCreateVehicleModel,
  useUpdateVehicleModel,
  useVehicleSwaps,
  useVehicleReservations,
  useCreateVehicle,
  useUpdateVehicle,
  useSetVehicleStatus,
  useRotateVehicleQr,
  useRetireVehicle,
  VEHICLES_ENDPOINTS,
} from './hooks/use-vehicles'
export type {
  VehicleListApi,
  VehicleDetailApi,
  VehicleStats,
  VehicleModelApi,
  VehicleModelStats,
  VehicleModelWritePayload,
  VehicleWritePayload,
  VehicleStatus,
} from './types'
export { vehicleStatusLabel } from './types'
export { VehiclesPanel } from './VehiclesPanel'
export { VehiclesDetailPanel } from './VehiclesDetailPanel'
export { VehicleFormPanel } from './VehicleFormPanel'
export { VehicleModelsPanel } from './VehicleModelsPanel'
export { VehicleModelFormPanel } from './VehicleModelFormPanel'
